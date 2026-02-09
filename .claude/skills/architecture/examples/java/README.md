# Java 架构设计原则示例

> Java 语言特定的代码示例和最佳实践

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

```java
// 违反 SoC：一个类承担了太多职责
public class UserManager {
    private DataSource dataSource;
    private EmailService emailService;
    private RedisClient redisClient;
    private Logger logger;

    public UserManager(DataSource dataSource) {
        this.dataSource = dataSource;
        this.emailService = new EmailService();
        this.redisClient = new RedisClient();
        this.logger = LoggerFactory.getLogger(UserManager.class);
    }

    public User createUser(UserData data) throws Exception {
        // 数据库操作
        String hashedPassword = hashPassword(data.getPassword());
        String sql = "INSERT INTO users (email, password) VALUES (?, ?)";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, data.getEmail());
            stmt.setString(2, hashedPassword);
            stmt.executeUpdate();

            ResultSet rs = stmt.getGeneratedKeys();
            if (rs.next()) {
                User user = new User(rs.getLong("id"), data.getEmail());

                // 业务逻辑
                String welcomeEmail = generateWelcomeEmail(data.getEmail());
                emailService.send(welcomeEmail);

                // 日志记录
                logger.info("User {} created", user.getId());

                // 缓存更新
                redisClient.setex("user:" + user.getId(), 3600, serialize(user));

                return user;
            }
        }
        return null;
    }

    private String hashPassword(String password) {
        return "hashed_" + password;
    }

    private String generateWelcomeEmail(String email) {
        return "Welcome " + email;
    }

    private String serialize(User user) {
        return user.toString();
    }
}
```

### ✅ 好的做法

```java
// 数据访问层
public interface UserRepository {
    User create(UserCreateData data) throws Exception;
    User findById(String id) throws Exception;
}

public class MySQLUserRepository implements UserRepository {
    private final DataSource dataSource;

    public MySQLUserRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public User create(UserCreateData data) throws Exception {
        String hashedPassword = hashPassword(data.getPassword());
        String sql = "INSERT INTO users (email, password) VALUES (?, ?)";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, data.getEmail());
            stmt.setString(2, hashedPassword);
            stmt.executeUpdate();

            ResultSet rs = stmt.getGeneratedKeys();
            if (rs.next()) {
                return new User(rs.getLong("id"), data.getEmail());
            }
        }
        return null;
    }

    @Override
    public User findById(String id) throws Exception {
        // 实现略
        return null;
    }

    private String hashPassword(String password) {
        return "hashed_" + password;
    }
}
```

```java
// 业务逻辑层
public interface EmailService {
    void sendWelcome(String email) throws Exception;
}

public class SESEmailService implements EmailService {
    private final AmazonSES sesClient;

    public SESEmailService(AmazonSES sesClient) {
        this.sesClient = sesClient;
    }

    @Override
    public void sendWelcome(String email) throws Exception {
        SendEmailRequest request = new SendEmailRequest()
            .withSource("noreply@company.com")
            .withDestination(new Destination().withToAddresses(email))
            .withMessage(new Message()
                .withSubject(new Content().withData("Welcome"))
                .withBody(new Body().withText(new Content().withData("Welcome!"))));
        sesClient.sendEmail(request);
    }
}

public class UserService {
    private final UserRepository repository;
    private final EmailService emailService;
    private final Logger logger;

    public UserService(UserRepository repository, EmailService emailService, Logger logger) {
        this.repository = repository;
        this.emailService = emailService;
        this.logger = logger;
    }

    public User registerUser(UserCreateData data) throws Exception {
        User user = repository.create(data);

        try {
            emailService.sendWelcome(user.getEmail());
        } catch (Exception e) {
            logger.warn("Failed to send welcome email", e);
        }

        logger.info("User {} created", user.getId());
        return user;
    }
}
```

```java
// 缓存层
public interface CacheService {
    User getUser(String id) throws Exception;
}

public class RedisCacheService implements CacheService {
    private final RedisClient redis;
    private final UserRepository repository;

    public RedisCacheService(RedisClient redis, UserRepository repository) {
        this.redis = redis;
        this.repository = repository;
    }

    @Override
    public User getUser(String id) throws Exception {
        String key = "user:" + id;
        String cached = redis.get(key);
        if (cached != null) {
            return deserializeUser(cached);
        }

        User user = repository.findById(id);
        if (user != null) {
            redis.setex(key, 3600, serialize(user));
        }
        return user;
    }

    private User deserializeUser(String data) {
        // 反序列化逻辑
        return null;
    }

    private String serialize(User user) {
        // 序列化逻辑
        return user.toString();
    }
}
```

---

## SRP - 单一职责原则

### ❌ 不好的做法

```java
// 一个类做了太多事情
public class OrderProcessor {
    private DataSource dataSource;
    private StripeClient stripeClient;
    private AmazonSES sesClient;
    private RedisClient redisClient;
    private Logger logger;

    public OrderProcessor(DataSource dataSource) {
        this.dataSource = dataSource;
        this.stripeClient = new StripeClient();
        this.sesClient = AmazonSESClientBuilder.defaultClient();
        this.redisClient = new RedisClient();
        this.logger = LoggerFactory.getLogger(OrderProcessor.class);
    }

    public void processOrder(String orderId) throws Exception {
        // 1. 获取订单
        Order order = getOrder(orderId);

        // 2. 支付
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
            .setAmount(order.getTotal())
            .setCurrency("USD")
            .build();
        PaymentIntent.create(params);

        // 3. 更新库存
        for (OrderItem item : order.getItems()) {
            updateInventory(item.getProductId(), item.getQuantity());
        }

        // 4. 发送邮件
        sendEmail(order.getCustomerEmail(), "Order Confirmed");

        // 5. 日志
        logger.info("Order {} processed", orderId);

        // 6. 更新状态
        updateOrderStatus(orderId, "completed");
    }

    private Order getOrder(String orderId) { /* ... */ }
    private void updateInventory(String productId, int quantity) { /* ... */ }
    private void sendEmail(String email, String subject) { /* ... */ }
    private void updateOrderStatus(String orderId, String status) { /* ... */ }
}
```

### ✅ 好的做法

```java
// 验证器
public class OrderValidator {
    public void validate(Order order) throws Exception {
        if (order == null || !"pending".equals(order.getStatus())) {
            throw new Exception("Invalid order");
        }
    }
}
```

```java
// 支付处理器
public interface PaymentGateway {
    Payment charge(long amount, String currency) throws Exception;
}

public class StripePaymentGateway implements PaymentGateway {
    private final StripeClient client;

    public StripePaymentGateway(StripeClient client) {
        this.client = client;
    }

    @Override
    public Payment charge(long amount, String currency) throws Exception {
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
            .setAmount(amount)
            .setCurrency(currency)
            .build();
        PaymentIntent intent = PaymentIntent.create(params);
        return new Payment(intent.getId(), true);
    }
}
```

```java
// 库存管理器
public class InventoryManager {
    private final DataSource dataSource;

    public InventoryManager(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public void reserve(List<OrderItem> items) throws Exception {
        for (OrderItem item : items) {
            String sql = "UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?";
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setInt(1, item.getQuantity());
                stmt.setString(2, item.getProductId());
                stmt.executeUpdate();
            }
        }
    }
}
```

```java
// 通知服务
public interface NotificationService {
    void sendOrderConfirmation(Order order) throws Exception;
}

public class SESNotificationService implements NotificationService {
    private final AmazonSES sesClient;

    public SESNotificationService(AmazonSES sesClient) {
        this.sesClient = sesClient;
    }

    @Override
    public void sendOrderConfirmation(Order order) throws Exception {
        SendEmailRequest request = new SendEmailRequest()
            .withSource("noreply@company.com")
            .withDestination(new Destination().withToAddresses(order.getCustomerEmail()))
            .withMessage(new Message()
                .withSubject(new Content().withData("Order Confirmed"))
                .withBody(new Body().withText(new Content().withData(
                    "Order " + order.getId() + " confirmed"))));
        sesClient.sendEmail(request);
    }
}
```

```java
// 订单处理器 - 编排者
public class OrderProcessor {
    private final OrderValidator validator;
    private final PaymentGateway paymentGateway;
    private final InventoryManager inventoryManager;
    private final NotificationService notificationService;
    private final OrderStatusManager statusManager;
    private final Logger logger;

    public OrderProcessor(
        OrderValidator validator,
        PaymentGateway paymentGateway,
        InventoryManager inventoryManager,
        NotificationService notificationService,
        OrderStatusManager statusManager,
        Logger logger
    ) {
        this.validator = validator;
        this.paymentGateway = paymentGateway;
        this.inventoryManager = inventoryManager;
        this.notificationService = notificationService;
        this.statusManager = statusManager;
        this.logger = logger;
    }

    public void processOrder(String orderId) throws Exception {
        Order order = getOrder(orderId);

        validator.validate(order);
        paymentGateway.charge(order.getTotal(), "USD");
        inventoryManager.reserve(order.getItems());

        try {
            notificationService.sendOrderConfirmation(order);
        } catch (Exception e) {
            logger.warn("Failed to send notification", e);
        }

        statusManager.updateStatus(orderId, "completed");
        logger.info("Order {} processed", orderId);
    }

    private Order getOrder(String orderId) throws Exception {
        // 获取订单逻辑
        return null;
    }
}
```

---

## DRY - 不重复自己

### ❌ 不好的做法

```java
// 验证逻辑重复
public class UserService {
    private DataSource dataSource;

    public UserService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public User createUser(UserData data) throws Exception {
        if (!validateEmail(data.getEmail())) {
            throw new Exception("Invalid email");
        }
        if (data.getPassword().length() < 8) {
            throw new Exception("Password too short");
        }
        // ... 创建用户
        return null;
    }

    public User updateUser(String id, UserData data) throws Exception {
        if (!validateEmail(data.getEmail())) {
            throw new Exception("Invalid email");
        }
        if (data.getPassword().length() < 8) {
            throw new Exception("Password too short");
        }
        // ... 更新用户
        return null;
    }

    private boolean validateEmail(String email) {
        // 验证逻辑
        return true;
    }
}
```

### ✅ 好的做法

```java
// 提取公共验证逻辑
public class ValidationService {
    public static boolean validateEmail(String email) {
        String pattern = "^[\\s@]+@[\\s@]+\\.[\\s@]+$";
        return email != null && email.matches(pattern);
    }

    public static boolean validatePassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }

        boolean hasUpper = false, hasLower = false, hasDigit = false;
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            if (Character.isLowerCase(c)) hasLower = true;
            if (Character.isDigit(c)) hasDigit = true;
        }
        return hasUpper && hasLower && hasDigit;
    }

    public static boolean validatePhone(String phone) {
        String pattern = "^\\+?[\\d\\s-]+$";
        return phone != null && phone.matches(pattern);
    }
}
```

```java
// 使用验证服务
public class UserService {
    private final UserRepository repository;
    private final ValidationService validator;

    public UserService(UserRepository repository, ValidationService validator) {
        this.repository = repository;
        this.validator = validator;
    }

    public User createUser(UserData data) throws Exception {
        if (!validator.validateEmail(data.getEmail())) {
            throw new Exception("Invalid email");
        }
        if (!validator.validatePassword(data.getPassword())) {
            throw new Exception("Invalid password");
        }
        return repository.create(data);
    }

    public User updateUser(String id, UserData data) throws Exception {
        if (!validator.validateEmail(data.getEmail())) {
            throw new Exception("Invalid email");
        }
        if (!validator.validatePassword(data.getPassword())) {
            throw new Exception("Invalid password");
        }
        return repository.update(id, data);
    }
}
```

---

## KISS - 保持简单

### ❌ 不好的做法

```java
// 过度设计的抽象
public interface Command {
    void execute() throws Exception;
}

public class CompositeCommand implements Command {
    private final List<Command> commands;

    public CompositeCommand(List<Command> commands) {
        this.commands = commands;
    }

    @Override
    public void execute() throws Exception {
        for (Command cmd : commands) {
            cmd.execute();
        }
    }
}

public class CreateUserCommand implements Command {
    private final UserData data;
    private final RepositoryFactory factory;
    private final ValidationStrategy strategy;

    public CreateUserCommand(UserData data, RepositoryFactory factory, ValidationStrategy strategy) {
        this.data = data;
        this.factory = factory;
        this.strategy = strategy;
    }

    @Override
    public void execute() throws Exception {
        Repository repo = factory.create("user");
        Validator validator = strategy.getValidator("user");
        validator.validate(data);
        repo.save(data);
    }
}

// 使用复杂
Command cmd = new CreateUserCommand(
    userData,
    new RepositoryFactory(),
    new ValidationStrategy()
);
cmd.execute();
```

### ✅ 好的做法

```java
// 简单直接的函数
public interface UserRepository {
    User save(UserData data) throws Exception;
}

public interface UserValidator {
    void validate(UserData data) throws Exception;
}

public class UserService {
    private final UserRepository repository;
    private final UserValidator validator;

    public UserService(UserRepository repository, UserValidator validator) {
        this.repository = repository;
        this.validator = validator;
    }

    public User createUser(UserData data) throws Exception {
        validator.validate(data);
        return repository.save(data);
    }
}

// 使用简单
UserService service = new UserService(userRepo, userValidator);
User user = service.createUser(userData);
```

---

## 组合优于继承

### ❌ 不好的做法

```java
// 继承导致紧耦合
public abstract class BaseReportGenerator {
    public String generate() {
        return "base report";
    }

    public void exportPDF() {
        // PDF 导出
    }

    public void exportExcel() {
        // Excel 导出
    }

    public void sendEmail(String to) {
        // 发送邮件
    }
}

public class SalesReportGenerator extends BaseReportGenerator {
    // 继承了所有方法，即使不需要
}
```

### ✅ 好的做法

```java
// 定义接口
public interface Formatter {
    String format(Object data);
}

public interface Exporter {
    void export(String content) throws Exception;
}

public interface Sender {
    void send(String recipient, String content) throws Exception;
}
```

```java
// 实现具体功能
public class JSONFormatter implements Formatter {
    @Override
    public String format(Object data) {
        // JSON 格式化
        return data.toString();
    }
}

public class PDFExporter implements Exporter {
    @Override
    public void export(String content) throws Exception {
        // PDF 导出逻辑
    }
}

public class EmailSender implements Sender {
    @Override
    public void send(String recipient, String content) throws Exception {
        // 邮件发送逻辑
    }
}
```

```java
// 通过组合构建
public class ReportGenerator {
    private final Formatter formatter;
    private final Exporter exporter;
    private final Sender sender;

    public ReportGenerator(Formatter formatter, Exporter exporter, Sender sender) {
        this.formatter = formatter;
        this.exporter = exporter;
        this.sender = sender;
    }

    public void generateAndExport(Object data, String recipient) throws Exception {
        String formatted = formatter.format(data);
        exporter.export(formatted);

        if (sender != null && recipient != null) {
            sender.send(recipient, formatted);
        }
    }
}

// 灵活组合
ReportGenerator salesReport = new ReportGenerator(
    new JSONFormatter(),
    new PDFExporter(),
    new EmailSender()
);

ReportGenerator financialReport = new ReportGenerator(
    new JSONFormatter(),
    new PDFExporter()
    // 不需要发送功能
);
```

---

## 高内聚低耦合

### ❌ 不好的做法

```java
// 紧耦合
public class OrderService {
    private DataSource dataSource;
    private StripeClient stripeClient;
    private AmazonSES sesClient;
    private RedisClient redisClient;

    public OrderService() {
        this.dataSource = new Database("host", "user", "pass").getDataSource();
        this.stripeClient = new StripeClient("sk_...");
        this.sesClient = AmazonSESClientBuilder.defaultClient();
        this.redisClient = new RedisClient("redis://localhost");
    }

    public Order createOrder(OrderData data) throws Exception {
        // 直接数据库操作
        Order order = queryDatabase("INSERT INTO orders ...");

        // 直接支付调用
        stripeClient.charges.create(data.getTotal());

        // 直接邮件服务
        sesClient.sendEmail(/* ... */);

        // 直接缓存
        redisClient.setex("order:" + order.getId(), 3600, serialize(order));

        return order;
    }
}
```

### ✅ 好的做法

```java
// 定义接口
public interface OrderRepository {
    Order save(OrderData data) throws Exception;
}

public interface PaymentGateway {
    Payment charge(long amount, String currency) throws Exception;
}

public interface NotificationService {
    void sendOrderConfirmation(Order order) throws Exception;
}

public interface CacheService {
    void set(String key, String value, int ttl) throws Exception;
}
```

```java
// 具体实现
public class MySQLOrderRepository implements OrderRepository {
    private final DataSource dataSource;

    public MySQLOrderRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Order save(OrderData data) throws Exception {
        // MySQL 实现
        return null;
    }
}

public class StripePaymentGateway implements PaymentGateway {
    private final StripeClient client;

    public StripePaymentGateway(StripeClient client) {
        this.client = client;
    }

    @Override
    public Payment charge(long amount, String currency) throws Exception {
        // Stripe 实现
        return null;
    }
}

public class SESEmailService implements NotificationService {
    private final AmazonSES client;

    public SESEmailService(AmazonSES client) {
        this.client = client;
    }

    @Override
    public void sendOrderConfirmation(Order order) throws Exception {
        // SES 实现
    }
}

public class RedisCacheService implements CacheService {
    private final RedisClient client;

    public RedisCacheService(RedisClient client) {
        this.client = client;
    }

    @Override
    public void set(String key, String value, int ttl) throws Exception {
        // Redis 实现
    }
}
```

```java
// 低耦合的服务
public class OrderService {
    private final OrderRepository repository;
    private final PaymentGateway paymentGateway;
    private final NotificationService notificationService;
    private final CacheService cacheService;

    public OrderService(
        OrderRepository repository,
        PaymentGateway paymentGateway,
        NotificationService notificationService,
        CacheService cacheService
    ) {
        this.repository = repository;
        this.paymentGateway = paymentGateway;
        this.notificationService = notificationService;
        this.cacheService = cacheService;
    }

    public Order createOrder(OrderData data) throws Exception {
        Order order = repository.save(data);
        paymentGateway.charge(order.getTotal(), "USD");

        try {
            notificationService.sendOrderConfirmation(order);
        } catch (Exception e) {
            // 记录但不失败
        }

        try {
            cacheService.set(
                "order:" + order.getId(),
                serialize(order),
                3600
            );
        } catch (Exception e) {
            // 缓存失败不影响主流程
        }

        return order;
    }

    private String serialize(Order order) {
        return order.toString();
    }
}
```

---

## 显式依赖

### ❌ 不好的做法

```java
public class UserService {
    public User createUser(UserData data) throws Exception {
        // 隐藏的数据库依赖
        DataSource dataSource = new Database("connection-string").getDataSource();

        // 隐藏的邮件服务
        EmailService email = new EmailService();

        // 隐藏的缓存
        RedisClient redis = new RedisClient();

        // 难以测试
        User user = queryDatabase(dataSource, "INSERT INTO users ...");
        return user;
    }
}
```

### ✅ 好的做法

```java
// 所有依赖通过构造函数注入
public class UserService {
    private final UserRepository repository;
    private final EmailService emailService;
    private final CacheService cacheService;
    private final Logger logger;

    public UserService(
        UserRepository repository,
        EmailService emailService,
        CacheService cacheService,
        Logger logger
    ) {
        this.repository = repository;
        this.emailService = emailService;
        this.cacheService = cacheService;
        this.logger = logger;
    }

    public User createUser(UserData data) throws Exception {
        User user = repository.create(data);

        try {
            emailService.sendWelcome(user.getEmail());
        } catch (Exception e) {
            logger.warn("Failed to send email", e);
        }

        try {
            cacheService.set("user:" + user.getId(), serialize(user), 3600);
        } catch (Exception e) {
            logger.warn("Failed to cache user", e);
        }

        logger.info("User {} created", user.getId());
        return user;
    }

    private String serialize(User user) {
        return user.toString();
    }
}
```

---

## 快速失败

### ❌ 不好的做法

```java
public class PaymentService {
    private DataSource dataSource;

    public PaymentService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public PaymentResult processPayment(PaymentData data) throws Exception {
        // 不验证直接处理
        Order order = getOrder(data.getOrderId());

        // 可能失败但继续
        chargeCard(data.getCard(), order.getTotal());

        // 可能失败但 continue
        updateOrderStatus(order.getId(), "paid");

        return new PaymentResult(true);
    }
}
```

### ✅ 好的做法

```java
public class PaymentService {
    private final OrderRepository repository;
    private final PaymentGateway gateway;
    private final OrderStatusManager statusManager;

    public PaymentService(
        OrderRepository repository,
        PaymentGateway gateway,
        OrderStatusManager statusManager
    ) {
        this.repository = repository;
        this.gateway = gateway;
        this.statusManager = statusManager;
    }

    public PaymentResult processPayment(PaymentData data) throws Exception {
        // 边界验证
        if (data.getOrderId() == null || data.getOrderId().isEmpty()) {
            throw new IllegalArgumentException("Missing order_id");
        }

        if (data.getCard() == null) {
            throw new IllegalArgumentException("Missing card");
        }

        Order order = repository.findById(data.getOrderId());
        if (order == null) {
            throw new Exception("Order " + data.getOrderId() + " not found");
        }

        if (!"pending".equals(order.getStatus())) {
            throw new Exception("Invalid order status: " + order.getStatus());
        }

        if (order.getTotal() <= 0) {
            throw new Exception("Invalid order total");
        }

        // 执行支付
        Payment payment = gateway.charge(order.getTotal(), "USD");
        if (!payment.isSuccess()) {
            throw new Exception("Payment declined: " + payment.getMessage());
        }

        // 更新状态
        statusManager.updateStatus(order.getId(), "paid");

        return new PaymentResult(true, payment.getId(), order.getId());
    }
}
```

---

## 不可变性

### ❌ 不好的做法

```java
public class ShoppingCart {
    private List<CartItem> items = new ArrayList<>();

    public void addItem(CartItem item) {
        this.items.add(item);  // 修改原列表
    }

    public void removeItem(String itemId) {
        this.items.removeIf(item -> item.getId().equals(itemId));  // 修改原列表
    }

    public void updateQuantity(String itemId, int quantity) {
        for (CartItem item : this.items) {
            if (item.getId().equals(itemId)) {
                item.setQuantity(quantity);  // 修改原对象
                break;
            }
        }
    }
}
```

### ✅ 好的做法

```java
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public final class CartItem {
    private final String id;
    private final String name;
    private final long price;
    private final int quantity;

    public CartItem(String id, String name, long price, int quantity) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.quantity = quantity;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public long getPrice() { return price; }
    public int getQuantity() { return quantity; }

    public CartItem withQuantity(int newQuantity) {
        return new CartItem(this.id, this.name, this.price, newQuantity);
    }
}

public final class ShoppingCart {
    private final List<CartItem> items;

    public ShoppingCart() {
        this.items = Collections.emptyList();
    }

    private ShoppingCart(List<CartItem> items) {
        this.items = Collections.unmodifiableList(items);
    }

    public ShoppingCart addItem(CartItem item) {
        List<CartItem> newItems = List.copyOf(this.items);
        newItems.add(item);
        return new ShoppingCart(newItems);
    }

    public ShoppingCart removeItem(String itemId) {
        List<CartItem> newItems = this.items.stream()
            .filter(item -> !item.getId().equals(itemId))
            .collect(Collectors.toList());
        return new ShoppingCart(newItems);
    }

    public ShoppingCart updateQuantity(String itemId, int quantity) {
        List<CartItem> newItems = this.items.stream()
            .map(item -> item.getId().equals(itemId) ? item.withQuantity(quantity) : item)
            .collect(Collectors.toList());
        return new ShoppingCart(newItems);
    }

    public long getTotal() {
        return items.stream()
            .mapToLong(item -> item.getPrice() * item.getQuantity())
            .sum();
    }

    public List<CartItem> getItems() {
        return items;
    }
}

// 使用
ShoppingCart cart = new ShoppingCart();
cart = cart.addItem(new CartItem("1", "Item 1", 10, 1));
cart = cart.updateQuantity("1", 2);
cart = cart.removeItem("1");
```

---

## 可测试性

### ❌ 不好的做法

```java
public class OrderService {
    public Order createOrder(OrderData data) throws Exception {
        // 隐藏依赖
        DataSource dataSource = new Database("postgres://localhost").getDataSource();

        // 外部 API
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.payment.com/charge"))
            .POST(HttpRequest.BodyPublishers.ofString(data.toString()))
            .build();
        client.send(request, HttpResponse.BodyHandlers.ofString());

        // 难以 mock
        EmailService email = new SESEmailService();
        email.send("order@company.com", "Order created");

        return null;
    }
}
```

### ✅ 好的做法

```java
// 通过接口定义依赖
public interface OrderRepository {
    Order save(OrderData data) throws Exception;
}

public interface PaymentGateway {
    Payment charge(long amount, String currency) throws Exception;
}

public interface NotificationService {
    void sendOrderConfirmation(Order order) throws Exception;
}

// 服务实现
public class OrderService {
    private final OrderRepository repository;
    private final PaymentGateway paymentGateway;
    private final NotificationService notificationService;

    public OrderService(
        OrderRepository repository,
        PaymentGateway paymentGateway,
        NotificationService notificationService
    ) {
        this.repository = repository;
        this.paymentGateway = paymentGateway;
        this.notificationService = notificationService;
    }

    public Order createOrder(OrderData data) throws Exception {
        Order order = repository.save(data);
        paymentGateway.charge(order.getTotal(), "USD");

        try {
            notificationService.sendOrderConfirmation(order);
        } catch (Exception e) {
            // 记录但不失败
        }

        return order;
    }
}
```

```java
// 测试
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

public class OrderServiceTest {
    @Test
    public void testCreateOrder() throws Exception {
        // Mock dependencies
        OrderRepository mockRepo = mock(OrderRepository.class);
        PaymentGateway mockGateway = mock(PaymentGateway.class);
        NotificationService mockNotify = mock(NotificationService.class);

        OrderData data = new OrderData(/* ... */);
        Order expectedOrder = new Order("123", 100);

        when(mockRepo.save(data)).thenReturn(expectedOrder);
        when(mockGateway.charge(100, "USD")).thenReturn(new Payment("pay_123", true));

        OrderService service = new OrderService(mockRepo, mockGateway, mockNotify);
        Order result = service.createOrder(data);

        verify(mockRepo).save(data);
        verify(mockGateway).charge(100, "USD");
        verify(mockNotify).sendOrderConfirmation(expectedOrder);
        assert result.getId().equals("123");
    }
}
```

---

## 相关资源

- [通用原则文档](../principles/README.md)
- [TypeScript 示例](../typescript/)
- [Go 示例](../golang/)
- [Rust 示例](../rust/)
- [Python 示例](../python/)

---

**维护者**: 架构团队
**最后更新**: 2026-01-12
