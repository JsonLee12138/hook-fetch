# TypeScript 架构设计原则示例

> TypeScript 特定的代码示例和最佳实践

---

## 目录

- [SoC - 关注点分离](#soc---关注点分离)
- [SRP - 单一职责原则](#srp---单一职责原则)
- [DRY - 不重复自己](#dry---不重复自己)
- [KISS - 保持简单](#kiss---保持简单)
- [组合优于继承](#组合优于继承)
- [高内聚低耦合](#高内聚低耦合)
- [显式依赖](#显式依赖)
- [快速失败](#快速失败)
- [不可变性](#不可变性)
- [可测试性](#可测试性)

---

## SoC - 关注点分离

### ❌ 不好的做法

```typescript
// 违反 SoC：一个类承担了太多职责
class UserManager {
  // 数据库操作
  async createUser(data: UserData) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await db.query("INSERT INTO users ...", [
      data.email,
      hashedPassword,
    ]);

    // 业务逻辑
    const welcomeEmail = this.generateWelcomeEmail(data.email);
    await emailService.send(welcomeEmail);

    // 日志记录
    await logger.info(`User ${user.id} created`);

    // 缓存更新
    await redis.set(`user:${user.id}`, JSON.stringify(user));

    return user;
  }

  private generateWelcomeEmail(email: string) {
    return { to: email, subject: "Welcome", body: "..." };
  }
}
```

### ✅ 好的做法

```typescript
// 数据访问层
class UserRepository {
  constructor(private db: Database) {}

  async create(userData: { email: string; password: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const result = await this.db.query(
      "INSERT INTO users (email, password) VALUES (?, ?) RETURNING *",
      [userData.email, hashedPassword],
    );
    return this.toUser(result);
  }

  private toUser(row: any): User {
    return { id: row.id, email: row.email };
  }
}

// 业务逻辑层
class UserService {
  constructor(
    private repository: UserRepository,
    private emailService: EmailService,
    private logger: Logger,
  ) {}

  async registerUser(userData: UserData): Promise<User> {
    const user = await this.repository.create(userData);
    await this.emailService.sendWelcome(user.email);
    await this.logger.info(`User ${user.id} created`);
    return user;
  }
}

// 缓存层
class UserCacheService {
  constructor(
    private redis: Redis,
    private repository: UserRepository,
  ) {}

  async getUser(id: string): Promise<User | null> {
    const cached = await this.redis.get(`user:${id}`);
    if (cached) return JSON.parse(cached);

    const user = await this.repository.findById(id);
    if (user) {
      await this.redis.setex(`user:${id}`, 3600, JSON.stringify(user));
    }
    return user;
  }
}
```

---

## SRP - 单一职责原则

### ❌ 不好的做法

```typescript
class OrderProcessor {
  // 这个类做了太多事情
  async processOrder(orderId: string) {
    // 1. 验证订单
    const order = await this.getOrder(orderId);
    if (!order || order.status !== 'pending') {
      throw new Error('Invalid order');
    }

    // 2. 处理支付
    const payment = await this.paymentGateway.charge(order.total);

    // 3. 更新库存
    await this.updateInventory(order.items);

    // 4. 发送通知
    await this.sendConfirmation(order.customer.email);

    // 5. 记录日志
    await this.logger.log(`Order ${orderId} processed`);

    // 6. 更新订单状态
    await this.updateOrderStatus(orderId, 'completed');
  }

  private async getOrder(id: string) { /* ... */ }
  private async paymentGateway: any;
  private async updateInventory(items: any[]) { /* ... */ }
  private async sendConfirmation(email: string) { /* ... */ }
  private async logger: any;
  private async updateOrderStatus(id: string, status: string) { /* ... */ }
}
```

### ✅ 好的做法

```typescript
// 验证器 - 只负责验证
class OrderValidator {
  validate(order: Order | null): void {
    if (!order || order.status !== "pending") {
      throw new Error("Invalid order");
    }
  }
}

// 支付处理器 - 只负责支付
class PaymentProcessor {
  constructor(private gateway: PaymentGateway) {}

  async processPayment(order: Order): Promise<Payment> {
    return await this.gateway.charge(order.total);
  }
}

// 库存管理器 - 只负责库存
class InventoryManager {
  async reserve(items: OrderItem[]): Promise<void> {
    // 更新库存逻辑
  }
}

// 通知服务 - 只负责通知
class NotificationService {
  async sendOrderConfirmation(email: string, order: Order): Promise<void> {
    // 发送邮件逻辑
  }
}

// 订单状态管理器 - 只负责状态
class OrderStatusManager {
  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    // 更新状态逻辑
  }
}

// 订单处理器 - 只负责编排
class OrderProcessor {
  constructor(
    private validator: OrderValidator,
    private paymentProcessor: PaymentProcessor,
    private inventoryManager: InventoryManager,
    private notificationService: NotificationService,
    private statusManager: OrderStatusManager,
    private logger: Logger,
  ) {}

  async processOrder(orderId: string): Promise<void> {
    const order = await this.getOrder(orderId);

    this.validator.validate(order);
    await this.paymentProcessor.processPayment(order);
    await this.inventoryManager.reserve(order.items);
    await this.notificationService.sendOrderConfirmation(
      order.customer.email,
      order,
    );
    await this.statusManager.updateStatus(orderId, "completed");

    this.logger.info(`Order ${orderId} processed`);
  }

  private async getOrder(id: string): Promise<Order> {
    // 获取订单逻辑
  }
}
```

---

## DRY - 不重复自己

### ❌ 不好的做法

```typescript
// 验证逻辑在多处重复
class UserService {
  async createUser(data: UserData) {
    if (!data.email.includes("@")) {
      throw new Error("Invalid email");
    }
    if (data.password.length < 8) {
      throw new Error("Password too short");
    }
    // ... 创建用户
  }

  async updateUser(id: string, data: UserData) {
    if (!data.email.includes("@")) {
      throw new Error("Invalid email");
    }
    if (data.password.length < 8) {
      throw new Error("Password too short");
    }
    // ... 更新用户
  }
}

class CustomerService {
  async createCustomer(data: CustomerData) {
    if (!data.email.includes("@")) {
      throw new Error("Invalid email");
    }
    // ... 创建客户
  }
}
```

### ✅ 好的做法

```typescript
// 提取公共验证逻辑
class ValidationService {
  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static validatePassword(password: string): boolean {
    return password.length >= 8;
  }

  static validatePhone(phone: string): boolean {
    return /^\+?[\d\s-]+$/.test(phone);
  }
}

// 使用验证服务
class UserService {
  constructor(private validationService: ValidationService) {}

  async createUser(data: UserData) {
    if (!this.validationService.validateEmail(data.email)) {
      throw new Error("Invalid email");
    }
    if (!this.validationService.validatePassword(data.password)) {
      throw new Error("Password too short");
    }
    // ... 创建用户
  }

  async updateUser(id: string, data: UserData) {
    if (!this.validationService.validateEmail(data.email)) {
      throw new Error("Invalid email");
    }
    if (!this.validationService.validatePassword(data.password)) {
      throw new Error("Password too short");
    }
    // ... 更新用户
  }
}

class CustomerService {
  constructor(private validationService: ValidationService) {}

  async createCustomer(data: CustomerData) {
    if (!this.validationService.validateEmail(data.email)) {
      throw new Error("Invalid email");
    }
    // ... 创建客户
  }
}
```

---

## KISS - 保持简单

### ❌ 不好的做法

```typescript
// 过度设计的复杂抽象
interface Command<T> {
  execute(): Promise<T>;
}

class CompositeCommand<T> implements Command<T> {
  constructor(private commands: Command<any>[]) {}

  async execute(): Promise<T[]> {
    const results = [];
    for (const cmd of this.commands) {
      results.push(await cmd.execute());
    }
    return results as T[];
  }
}

class CreateUserCommand implements Command<User> {
  constructor(
    private data: UserData,
    private factory: RepositoryFactory,
    private strategy: ValidationStrategy,
  ) {}

  async execute(): Promise<User> {
    const repo = this.factory.create("user");
    const validator = this.strategy.getValidator("user");
    await validator.validate(this.data);
    return await repo.save(this.data);
  }
}

// 使用时需要太多配置
const command = new CreateUserCommand(
  userData,
  new RepositoryFactory(),
  new ValidationStrategy(),
);
```

### ✅ 好的做法

```typescript
// 简单直接的函数
interface UserRepository {
  save(data: UserData): Promise<User>;
}

interface UserValidator {
  validate(data: UserData): Promise<void>;
}

class UserService {
  constructor(
    private repository: UserRepository,
    private validator: UserValidator,
  ) {}

  async createUser(data: UserData): Promise<User> {
    await this.validator.validate(data);
    return await this.repository.save(data);
  }
}

// 使用简单
const service = new UserService(userRepo, userValidator);
const user = await service.createUser(userData);
```

---

## 组合优于继承

### ❌ 不好的做法

```typescript
class BaseReportGenerator {
  generate() {
    // 基础生成逻辑
  }

  exportPDF() {
    // PDF 导出
  }

  exportExcel() {
    // Excel 导出
  }

  sendEmail() {
    // 发送邮件
  }
}

// 继承导致紧耦合
class SalesReportGenerator extends BaseReportGenerator {
  // 必须继承所有方法，即使不需要
}

class FinancialReportGenerator extends BaseReportGenerator {
  // 难以选择性使用功能
}
```

### ✅ 好的做法

```typescript
// 定义接口
interface Formatter {
  format(data: any): string;
}

interface Exporter {
  export(formatted: string): Promise<void>;
}

interface Sender {
  send(recipient: string, content: string): Promise<void>;
}

// 实现具体功能
class JsonFormatter implements Formatter {
  format(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}

class PdfExporter implements Exporter {
  async export(formatted: string): Promise<void> {
    // PDF 导出逻辑
  }
}

class EmailSender implements Sender {
  async send(recipient: string, content: string): Promise<void> {
    // 邮件发送逻辑
  }
}

// 通过组合构建功能
class ReportGenerator {
  constructor(
    private formatter: Formatter,
    private exporter: Exporter,
    private sender?: Sender,
  ) {}

  async generateAndExport(data: any, recipient?: string): Promise<void> {
    const formatted = this.formatter.format(data);
    await this.exporter.export(formatted);

    if (this.sender && recipient) {
      await this.sender.send(recipient, formatted);
    }
  }
}

// 灵活组合
const salesReport = new ReportGenerator(
  new JsonFormatter(),
  new PdfExporter(),
  new EmailSender(),
);

const financialReport = new ReportGenerator(
  new JsonFormatter(),
  new PdfExporter(),
  // 不需要发送功能
);
```

---

## 高内聚低耦合

### ❌ 不好的做法

```typescript
// 紧耦合，直接依赖具体实现
class OrderService {
  async createOrder(data: OrderData) {
    // 直接数据库操作
    const db = new MySQLConnection("host", "user", "pass");
    const order = await db.query("INSERT INTO orders ...");

    // 直接支付调用
    const stripe = new Stripe("sk_...");
    await stripe.charges.create({ amount: order.total });

    // 直接邮件服务
    const ses = new AWS.SES();
    await ses.sendEmail({
      Source: "noreply@company.com",
      Destination: { ToAddresses: [data.email] },
      Message: {
        /* ... */
      },
    });

    // 直接缓存操作
    const redis = new Redis("redis://localhost");
    await redis.set(`order:${order.id}`, JSON.stringify(order));

    return order;
  }
}
```

### ✅ 好的做法

```typescript
// 定义接口
interface OrderRepository {
  save(order: OrderData): Promise<Order>;
}

interface PaymentGateway {
  charge(amount: number, currency: string): Promise<Payment>;
}

interface NotificationService {
  sendOrderConfirmation(order: Order): Promise<void>;
}

interface CacheService {
  set(key: string, value: any, ttl?: number): Promise<void>;
}

// 具体实现
class MySQLOrderRepository implements OrderRepository {
  async save(order: OrderData): Promise<Order> {
    // MySQL 实现
  }
}

class StripePaymentGateway implements PaymentGateway {
  async charge(amount: number, currency: string): Promise<Payment> {
    // Stripe 实现
  }
}

class SESEmailService implements NotificationService {
  async sendOrderConfirmation(order: Order): Promise<void> {
    // SES 实现
  }
}

class RedisCacheService implements CacheService {
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Redis 实现
  }
}

// 低耦合的服务
class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private paymentGateway: PaymentGateway,
    private notificationService: NotificationService,
    private cacheService: CacheService,
  ) {}

  async createOrder(data: OrderData): Promise<Order> {
    const order = await this.orderRepository.save(data);
    await this.paymentGateway.charge(order.total, "USD");
    await this.notificationService.sendOrderConfirmation(order);
    await this.cacheService.set(`order:${order.id}`, order, 3600);
    return order;
  }
}
```

---

## 显式依赖

### ❌ 不好的做法

```typescript
class UserService {
  async createUser(data: UserData) {
    // 隐藏的数据库依赖
    const db = require("./database").getInstance();

    // 隐藏的邮件服务
    const email = new EmailService();

    // 隐藏的缓存
    const redis = new Redis();

    // 隐藏的日志
    logger.log("Creating user");

    // 难以测试
  }
}
```

### ✅ 好的做法

```typescript
// 所有依赖通过构造函数注入
class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private cacheService: CacheService,
    private logger: Logger,
  ) {}

  async createUser(data: UserData): Promise<User> {
    const user = await this.userRepository.save(data);
    await this.emailService.sendWelcome(user.email);
    await this.cacheService.set(`user:${user.id}`, user);
    this.logger.info(`User ${user.id} created`);
    return user;
  }
}

// 依赖注入容器
const container = {
  userRepository: new MySQLUserRepository(),
  emailService: new SESEmailService(),
  cacheService: new RedisCacheService(),
  logger: new ConsoleLogger(),
};

const userService = new UserService(
  container.userRepository,
  container.emailService,
  container.cacheService,
  container.logger,
);
```

---

## 快速失败

### ❌ 不好的做法

```typescript
class PaymentService {
  async processPayment(data: PaymentData) {
    // 不验证直接处理
    const order = await this.orderRepository.findById(data.orderId);

    // 可能失败但继续
    await this.chargeCard(data.card, order.total);

    // 可能失败但继续
    await this.updateOrderStatus(order.id, "paid");

    // 可能返回不完整状态
    return { success: true };
  }
}
```

### ✅ 好的做法

```typescript
class PaymentService {
  constructor(
    private orderRepository: OrderRepository,
    private paymentGateway: PaymentGateway,
    private orderStatusManager: OrderStatusManager,
  ) {}

  async processPayment(data: PaymentData): Promise<PaymentResult> {
    // 边界验证
    if (!data.orderId || !data.card) {
      throw new ValidationError("Missing required fields");
    }

    const order = await this.orderRepository.findById(data.orderId);
    if (!order) {
      throw new NotFoundError(`Order ${data.orderId} not found`);
    }

    if (order.status !== "pending") {
      throw new ValidationError(
        `Order status is ${order.status}, expected pending`,
      );
    }

    if (order.total <= 0) {
      throw new ValidationError("Invalid order total");
    }

    // 执行支付
    const payment = await this.paymentGateway.charge(data.card, order.total);
    if (!payment.success) {
      throw new PaymentError(`Payment failed: ${payment.message}`);
    }

    // 更新状态
    await this.orderStatusManager.updateStatus(order.id, "paid");

    return {
      success: true,
      paymentId: payment.id,
      orderId: order.id,
    };
  }
}
```

---

## 不可变性

### ❌ 不好的做法

```typescript
class ShoppingCart {
  private items: CartItem[] = [];

  addItem(item: CartItem): void {
    this.items.push(item); // 修改原数组
  }

  removeItem(itemId: string): void {
    const index = this.items.findIndex((item) => item.id === itemId);
    if (index > -1) {
      this.items.splice(index, 1); // 修改原数组
    }
  }

  updateQuantity(itemId: string, quantity: number): void {
    const item = this.items.find((item) => item.id === itemId);
    if (item) {
      item.quantity = quantity; // 修改原对象
    }
  }
}
```

### ✅ 好的做法

```typescript
interface CartItem {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
}

class ShoppingCart {
  constructor(private readonly items: readonly CartItem[] = []) {}

  addItem(item: CartItem): ShoppingCart {
    return new ShoppingCart([...this.items, item]);
  }

  removeItem(itemId: string): ShoppingCart {
    return new ShoppingCart(this.items.filter((item) => item.id !== itemId));
  }

  updateQuantity(itemId: string, quantity: number): ShoppingCart {
    return new ShoppingCart(
      this.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item,
      ),
    );
  }

  getTotal(): number {
    return this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }
}

// 使用
let cart = new ShoppingCart();
cart = cart.addItem({ id: "1", name: "Item 1", price: 10, quantity: 1 });
cart = cart.updateQuantity("1", 2);
cart = cart.removeItem("1");
```

---

## 可测试性

### ❌ 不好的做法

```typescript
class OrderService {
  async createOrder(data: OrderData) {
    // 隐藏依赖
    const db = new Database("connection-string");
    const order = await db.query("INSERT INTO orders ...");

    // 外部 API
    const payment = await fetch("https://api.payment.com/charge", {
      method: "POST",
      body: JSON.stringify({ amount: order.total }),
    });

    // 难以 mock
    const email = new EmailService();
    await email.send("order@company.com", "Order created");

    return order;
  }
}
```

### ✅ 好的做法

```typescript
// 通过接口定义依赖
interface OrderRepository {
  save(data: OrderData): Promise<Order>;
}

interface PaymentGateway {
  charge(amount: number, currency: string): Promise<PaymentResult>;
}

interface NotificationService {
  sendOrderConfirmation(order: Order): Promise<void>;
}

// 服务实现
class OrderService {
  constructor(
    private repository: OrderRepository,
    private paymentGateway: PaymentGateway,
    private notificationService: NotificationService,
  ) {}

  async createOrder(data: OrderData): Promise<Order> {
    const order = await this.repository.save(data);
    await this.paymentGateway.charge(order.total, "USD");
    await this.notificationService.sendOrderConfirmation(order);
    return order;
  }
}

// 测试简单
describe("OrderService", () => {
  it("creates order and sends confirmation", async () => {
    // Mock dependencies
    const mockRepo = {
      save: jest.fn().mockResolvedValue({ id: "123", total: 100 }),
    };
    const mockPayment = {
      charge: jest.fn().mockResolvedValue({ success: true }),
    };
    const mockNotification = {
      sendOrderConfirmation: jest.fn(),
    };

    const service = new OrderService(mockRepo, mockPayment, mockNotification);
    const result = await service.createOrder({ items: [] });

    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockPayment.charge).toHaveBeenCalledWith(100, "USD");
    expect(mockNotification.sendOrderConfirmation).toHaveBeenCalled();
  });
});
```

---

## 相关资源

- [通用原则文档](../principles/README.md)
- [Go 示例](../golang/)
- [Rust 示例](../rust/)
- [Python 示例](../python/)
- [Java 示例](../java/)

---

**维护者**: 架构团队
**最后更新**: 2026-01-12
