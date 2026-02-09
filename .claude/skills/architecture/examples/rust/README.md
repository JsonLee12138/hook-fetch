# Rust 架构设计原则示例

> Rust 语言特定的代码示例和最佳实践

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

```rust
// 违反 SoC：一个结构体承担了太多职责
pub struct UserManager {
    db_pool: PgPool,
}

impl UserManager {
    pub async fn create_user(&self, data: UserData) -> Result<User, Error> {
        // 数据库操作
        let hashed_password = hash_password(&data.password);
        let user = sqlx::query_as!(
            User,
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            data.email, hashed_password
        )
        .fetch_one(&self.db_pool)
        .await?;

        // 业务逻辑
        let welcome_email = self.generate_welcome_email(&data.email);
        self.send_email(welcome_email).await?;

        // 日志记录
        tracing::info!("User {} created", user.id);

        // 缓存更新
        let redis = redis::Client::open("redis://127.0.0.1/")?;
        let mut conn = redis.get_async_connection().await?;
        conn.set_ex(format!("user:{}", user.id), serde_json::to_string(&user)?, 3600).await?;

        Ok(user)
    }

    fn generate_welcome_email(&self, email: &str) -> String {
        format!("Welcome to our service, {}!", email)
    }

    async fn send_email(&self, content: String) -> Result<(), Error> {
        // 发送邮件逻辑
        Ok(())
    }
}
```

### ✅ 好的做法

```rust
// 数据访问层
pub trait UserRepository: Send + Sync {
    async fn create(&self, data: UserCreateData) -> Result<User, Error>;
    async fn find_by_id(&self, id: &str) -> Result<Option<User>, Error>;
}

pub struct MySQLUserRepository {
    pool: PgPool,
}

impl MySQLUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for MySQLUserRepository {
    async fn create(&self, data: UserCreateData) -> Result<User, Error> {
        let hashed_password = hash_password(&data.password);
        let user = sqlx::query_as!(
            User,
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            data.email, hashed_password
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(user)
    }

    async fn find_by_id(&self, id: &str) -> Result<Option<User>, Error> {
        let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(user)
    }
}
```

```rust
// 业务逻辑层
pub trait EmailService: Send + Sync {
    async fn send_welcome(&self, email: &str) -> Result<(), Error>;
}

pub struct SESEmailService {
    client: aws_sdk_ses::Client,
}

#[async_trait]
impl EmailService for SESEmailService {
    async fn send_welcome(&self, email: &str) -> Result<(), Error> {
        // SES 发送逻辑
        Ok(())
    }
}

pub struct UserService<R: UserRepository, E: EmailService> {
    repo: R,
    email: E,
    logger: Logger,
}

impl<R: UserRepository, E: EmailService> UserService<R, E> {
    pub fn new(repo: R, email: E, logger: Logger) -> Self {
        Self { repo, email, logger }
    }

    pub async fn register_user(&self, data: UserCreateData) -> Result<User, Error> {
        let user = self.repo.create(data).await?;

        if let Err(e) = self.email.send_welcome(&user.email).await {
            self.logger.warn(&format!("Failed to send welcome email: {}", e));
        }

        self.logger.info(&format!("User {} created", user.id));
        Ok(user)
    }
}
```

```rust
// 缓存层
pub trait CacheService: Send + Sync {
    async fn get_user(&self, id: &str) -> Result<Option<User>, Error>;
}

pub struct RedisCacheService {
    client: redis::Client,
    repo: Box<dyn UserRepository>,
}

impl RedisCacheService {
    pub fn new(client: redis::Client, repo: Box<dyn UserRepository>) -> Self {
        Self { client, repo }
    }
}

#[async_trait]
impl CacheService for RedisCacheService {
    async fn get_user(&self, id: &str) -> Result<Option<User>, Error> {
        let mut conn = self.client.get_async_connection().await?;
        let key = format!("user:{}", id);

        let cached: Option<String> = conn.get(&key).await?;
        if let Some(data) = cached {
            return Ok(Some(serde_json::from_str(&data)?));
        }

        if let Some(user) = self.repo.find_by_id(id).await? {
            conn.set_ex(&key, serde_json::to_string(&user)?, 3600).await?;
            Ok(Some(user))
        } else {
            Ok(None)
        }
    }
}
```

---

## SRP - 单一职责原则

### ❌ 不好的做法

```rust
pub struct OrderProcessor {
    db_pool: PgPool,
    stripe_client: stripe::Client,
    ses_client: aws_sdk_ses::Client,
    logger: Logger,
}

impl OrderProcessor {
    pub async fn process_order(&self, order_id: &str) -> Result<(), Error> {
        // 1. 获取订单
        let order = sqlx::query_as!(Order, "SELECT * FROM orders WHERE id = $1", order_id)
            .fetch_one(&self.db_pool)
            .await?;

        // 2. 支付
        let intent = stripe::PaymentIntent::create(
            &self.stripe_client,
            stripe::CreatePaymentIntent {
                amount: Some(order.total as i64),
                currency: Some(stripe::Currency::USD),
                ..Default::default()
            },
        ).await?;

        // 3. 更新库存
        for item in &order.items {
            sqlx::query!(
                "UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2",
                item.quantity, item.product_id
            )
            .execute(&self.db_pool)
            .await?;
        }

        // 4. 发送邮件
        self.ses_client
            .send_email()
            .source("noreply@company.com")
            .destination(
                aws_sdk_ses::types::Destination::builder()
                    .to_addresses(order.customer_email.clone())
                    .build(),
            )
            .message(
                aws_sdk_ses::types::Message::builder()
                    .subject(aws_sdk_ses::types::Content::builder().data("Order Confirmed").build())
                    .body(aws_sdk_ses::types::Body::builder()
                        .text(aws_sdk_ses::types::Content::builder()
                            .data(format!("Order {} confirmed", order_id))
                            .build())
                        .build())
                    .build(),
            )
            .send()
            .await?;

        // 5. 日志
        self.logger.info(&format!("Order {} processed", order_id));

        // 6. 更新状态
        sqlx::query!("UPDATE orders SET status = 'completed' WHERE id = $1", order_id)
            .execute(&self.db_pool)
            .await?;

        Ok(())
    }
}
```

### ✅ 好的做法

```rust
// 验证器
pub struct OrderValidator;

impl OrderValidator {
    pub fn validate(order: &Order) -> Result<(), Error> {
        if order.status != "pending" {
            return Err(Error::InvalidOrderStatus(order.status.clone()));
        }
        Ok(())
    }
}
```

```rust
// 支付处理器
pub trait PaymentGateway: Send + Sync {
    async fn charge(&self, amount: i64, currency: &str) -> Result<Payment, Error>;
}

pub struct StripePaymentGateway {
    client: stripe::Client,
}

#[async_trait]
impl PaymentGateway for StripePaymentGateway {
    async fn charge(&self, amount: i64, currency: &str) -> Result<Payment, Error> {
        let intent = stripe::PaymentIntent::create(
            &self.client,
            stripe::CreatePaymentIntent {
                amount: Some(amount),
                currency: Some(stripe::Currency::from_str(currency)?),
                ..Default::default()
            },
        ).await?;
        Ok(Payment { id: intent.id.to_string(), success: true })
    }
}
```

```rust
// 库存管理器
pub struct InventoryManager {
    pool: PgPool,
}

impl InventoryManager {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn reserve(&self, items: &[OrderItem]) -> Result<(), Error> {
        for item in items {
            sqlx::query!(
                "UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2",
                item.quantity, item.product_id
            )
            .execute(&self.pool)
            .await?;
        }
        Ok(())
    }
}
```

```rust
// 通知服务
pub trait NotificationService: Send + Sync {
    async fn send_order_confirmation(&self, order: &Order) -> Result<(), Error>;
}

pub struct SESNotificationService {
    client: aws_sdk_ses::Client,
}

#[async_trait]
impl NotificationService for SESNotificationService {
    async fn send_order_confirmation(&self, order: &Order) -> Result<(), Error> {
        self.client
            .send_email()
            .source("noreply@company.com")
            .destination(
                aws_sdk_ses::types::Destination::builder()
                    .to_addresses(order.customer_email.clone())
                    .build(),
            )
            .message(/* ... */)
            .send()
            .await?;
        Ok(())
    }
}
```

```rust
// 订单处理器 - 编排者
pub struct OrderProcessor<V, P, I, N, S> {
    validator: V,
    payment: P,
    inventory: I,
    notification: N,
    status_manager: S,
    logger: Logger,
}

impl<V, P, I, N, S> OrderProcessor<V, P, I, N, S>
where
    V: OrderValidator,
    P: PaymentGateway,
    I: InventoryManager,
    N: NotificationService,
    S: OrderStatusManager,
{
    pub fn new(
        validator: V,
        payment: P,
        inventory: I,
        notification: N,
        status_manager: S,
        logger: Logger,
    ) -> Self {
        Self {
            validator,
            payment,
            inventory,
            notification,
            status_manager,
            logger,
        }
    }

    pub async fn process_order(&self, order_id: &str) -> Result<(), Error> {
        let order = self.get_order(order_id).await?;

        self.validator.validate(&order)?;
        self.payment.charge(order.total, "USD").await?;
        self.inventory.reserve(&order.items).await?;

        if let Err(e) = self.notification.send_order_confirmation(&order).await {
            self.logger.warn(&format!("Failed to send notification: {}", e));
        }

        self.status_manager.update_status(order_id, "completed").await?;
        self.logger.info(&format!("Order {} processed", order_id));

        Ok(())
    }

    async fn get_order(&self, id: &str) -> Result<Order, Error> {
        // 获取订单逻辑
        todo!()
    }
}
```

---

## DRY - 不重复自己

### ❌ 不好的做法

```rust
// 验证逻辑重复
pub struct UserService {
    pool: PgPool,
}

impl UserService {
    pub async fn create_user(&self, data: UserData) -> Result<User, Error> {
        if !validate_email(&data.email) {
            return Err(Error::InvalidEmail);
        }
        if data.password.len() < 8 {
            return Err(Error::PasswordTooShort);
        }
        // ... 创建用户
        todo!()
    }

    pub async fn update_user(&self, id: &str, data: UserData) -> Result<User, Error> {
        if !validate_email(&data.email) {
            return Err(Error::InvalidEmail);
        }
        if data.password.len() < 8 {
            return Err(Error::PasswordTooShort);
        }
        // ... 更新用户
        todo!()
    }
}

fn validate_email(email: &str) -> bool {
    // 验证逻辑
    true
}
```

### ✅ 好的做法

```rust
// 提取公共验证逻辑
pub struct ValidationService;

impl ValidationService {
    pub fn validate_email(email: &str) -> bool {
        let pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$";
        regex::Regex::new(pattern).unwrap().is_match(email)
    }

    pub fn validate_password(password: &str) -> bool {
        if password.len() < 8 {
            return false;
        }

        let has_upper = password.chars().any(|c| c.is_uppercase());
        let has_lower = password.chars().any(|c| c.is_lowercase());
        let has_digit = password.chars().any(|c| c.is_digit(10));

        has_upper && has_lower && has_digit
    }

    pub fn validate_phone(phone: &str) -> bool {
        let pattern = r"^\+?[\d\s-]+$";
        regex::Regex::new(pattern).unwrap().is_match(phone)
    }
}
```

```rust
// 使用验证服务
pub struct UserService<R: UserRepository> {
    repo: R,
    validator: ValidationService,
}

impl<R: UserRepository> UserService<R> {
    pub fn new(repo: R, validator: ValidationService) -> Self {
        Self { repo, validator }
    }

    pub async fn create_user(&self, data: UserData) -> Result<User, Error> {
        if !Self::validator.validate_email(&data.email) {
            return Err(Error::InvalidEmail);
        }
        if !Self::validator.validate_password(&data.password) {
            return Err(Error::PasswordTooShort);
        }
        self.repo.create(data).await
    }

    pub async fn update_user(&self, id: &str, data: UserData) -> Result<User, Error> {
        if !Self::validator.validate_email(&data.email) {
            return Err(Error::InvalidEmail);
        }
        if !Self::validator.validate_password(&data.password) {
            return Err(Error::PasswordTooShort);
        }
        self.repo.update(id, data).await
    }
}
```

---

## KISS - 保持简单

### ❌ 不好的做法

```rust
// 过度设计的抽象
pub trait Command {
    fn execute(&self) -> Result<(), Error>;
}

pub struct CompositeCommand {
    commands: Vec<Box<dyn Command>>,
}

impl Command for CompositeCommand {
    fn execute(&self) -> Result<(), Error> {
        for cmd in &self.commands {
            cmd.execute()?;
        }
        Ok(())
    }
}

pub struct CreateUserCommand {
    data: UserData,
    factory: RepositoryFactory,
    strategy: ValidationStrategy,
}

impl Command for CreateUserCommand {
    fn execute(&self) -> Result<(), Error> {
        let repo = self.factory.create("user");
        let validator = self.strategy.get_validator("user");
        validator.validate(&self.data)?;
        repo.save(self.data.clone())
    }
}
```

### ✅ 好的做法

```rust
// 简单直接的函数
pub trait UserRepository: Send + Sync {
    fn save(&self, data: UserData) -> Result<User, Error>;
}

pub trait UserValidator: Send + Sync {
    fn validate(&self, data: &UserData) -> Result<(), Error>;
}

pub struct UserService<R: UserRepository, V: UserValidator> {
    repo: R,
    validator: V,
}

impl<R: UserRepository, V: UserValidator> UserService<R, V> {
    pub fn new(repo: R, validator: V) -> Self {
        Self { repo, validator }
    }

    pub fn create_user(&self, data: UserData) -> Result<User, Error> {
        self.validator.validate(&data)?;
        self.repo.save(data)
    }
}
```

---

## 组合优于继承

### ❌ 不好的做法

```rust
// Rust 没有继承，但可以用 trait 对象模拟
pub trait BaseReportGenerator {
    fn generate(&self) -> String;
    fn export_pdf(&self) -> Result<(), Error>;
    fn export_excel(&self) -> Result<(), Error>;
    fn send_email(&self, to: &str) -> Result<(), Error>;
}

pub struct SalesReportGenerator {
    data: Vec<Sale>,
}

impl BaseReportGenerator for SalesReportGenerator {
    fn generate(&self) -> String {
        "sales report".to_string()
    }
    fn export_pdf(&self) -> Result<(), Error> { /* ... */ Ok(()) }
    fn export_excel(&self) -> Result<(), Error> { /* ... */ Ok(()) }
    fn send_email(&self, to: &str) -> Result<(), Error> { /* ... */ Ok(()) }
}
```

### ✅ 好的做法

```rust
// 定义接口
pub trait Formatter: Send + Sync {
    fn format(&self, data: &dyn std::fmt::Debug) -> String;
}

pub trait Exporter: Send + Sync {
    fn export(&self, content: &str) -> Result<(), Error>;
}

pub trait Sender: Send + Sync {
    fn send(&self, recipient: &str, content: &str) -> Result<(), Error>;
}
```

```rust
// 实现具体功能
pub struct JSONFormatter;

impl Formatter for JSONFormatter {
    fn format(&self, data: &dyn std::fmt::Debug) -> String {
        format!("{:?}", data)
    }
}

pub struct PDFExporter;

impl Exporter for PDFExporter {
    fn export(&self, content: &str) -> Result<(), Error> {
        // PDF 导出逻辑
        Ok(())
    }
}

pub struct EmailSender;

impl Sender for EmailSender {
    fn send(&self, recipient: &str, content: &str) -> Result<(), Error> {
        // 邮件发送逻辑
        Ok(())
    }
}
```

```rust
// 通过组合构建
pub struct ReportGenerator<F, E, S>
where
    F: Formatter,
    E: Exporter,
    S: Sender,
{
    formatter: F,
    exporter: E,
    sender: S,
}

impl<F, E, S> ReportGenerator<F, E, S>
where
    F: Formatter,
    E: Exporter,
    S: Sender,
{
    pub fn new(formatter: F, exporter: E, sender: S) -> Self {
        Self {
            formatter,
            exporter,
            sender,
        }
    }

    pub fn generate_and_export(
        &self,
        data: &dyn std::fmt::Debug,
        recipient: &str,
    ) -> Result<(), Error> {
        let formatted = self.formatter.format(data);
        self.exporter.export(&formatted)?;
        self.sender.send(recipient, &formatted)?;
        Ok(())
    }
}

// 灵活组合
let sales_report = ReportGenerator::new(
    JSONFormatter,
    PDFExporter,
    EmailSender,
);

let financial_report = ReportGenerator::new(
    JSONFormatter,
    PDFExporter,
    // 不需要发送功能
    NoopSender, // 或者使用 Option<Sender>
);
```

---

## 高内聚低耦合

### ❌ 不好的做法

```rust
// 紧耦合
pub struct OrderService {
    db_pool: PgPool,
    stripe_client: stripe::Client,
    ses_client: aws_sdk_ses::Client,
    redis_client: redis::Client,
}

impl OrderService {
    pub async fn create_order(&self, data: OrderData) -> Result<Order, Error> {
        // 直接数据库操作
        let order = sqlx::query_as!(Order, "INSERT INTO orders ...")
            .fetch_one(&self.db_pool)
            .await?;

        // 直接支付调用
        stripe::PaymentIntent::create(
            &self.stripe_client,
            stripe::CreatePaymentIntent {
                amount: Some(order.total as i64),
                ..Default::default()
            },
        ).await?;

        // 直接邮件服务
        self.ses_client.send_email(/* ... */).send().await?;

        // 直接缓存
        let mut conn = self.redis_client.get_async_connection().await?;
        conn.set_ex(format!("order:{}", order.id), serde_json::to_string(&order)?, 3600).await?;

        Ok(order)
    }
}
```

### ✅ 好的做法

```rust
// 定义接口
pub trait OrderRepository: Send + Sync {
    async fn save(&self, data: OrderData) -> Result<Order, Error>;
}

pub trait PaymentGateway: Send + Sync {
    async fn charge(&self, amount: i64, currency: &str) -> Result<Payment, Error>;
}

pub trait NotificationService: Send + Sync {
    async fn send_order_confirmation(&self, order: &Order) -> Result<(), Error>;
}

pub trait CacheService: Send + Sync {
    async fn set(&self, key: String, value: String, ttl: usize) -> Result<(), Error>;
}
```

```rust
// 具体实现
pub struct MySQLOrderRepository {
    pool: PgPool,
}

#[async_trait]
impl OrderRepository for MySQLOrderRepository {
    async fn save(&self, data: OrderData) -> Result<Order, Error> {
        // MySQL 实现
        todo!()
    }
}

pub struct StripePaymentGateway {
    client: stripe::Client,
}

#[async_trait]
impl PaymentGateway for StripePaymentGateway {
    async fn charge(&self, amount: i64, currency: &str) -> Result<Payment, Error> {
        // Stripe 实现
        todo!()
    }
}

pub struct SESEmailService {
    client: aws_sdk_ses::Client,
}

#[async_trait]
impl NotificationService for SESEmailService {
    async fn send_order_confirmation(&self, order: &Order) -> Result<(), Error> {
        // SES 实现
        todo!()
    }
}

pub struct RedisCacheService {
    client: redis::Client,
}

#[async_trait]
impl CacheService for RedisCacheService {
    async fn set(&self, key: String, value: String, ttl: usize) -> Result<(), Error> {
        // Redis 实现
        todo!()
    }
}
```

```rust
// 低耦合的服务
pub struct OrderService<R, P, N, C>
where
    R: OrderRepository,
    P: PaymentGateway,
    N: NotificationService,
    C: CacheService,
{
    repo: R,
    payment: P,
    notify: N,
    cache: C,
}

impl<R, P, N, C> OrderService<R, P, N, C>
where
    R: OrderRepository,
    P: PaymentGateway,
    N: NotificationService,
    C: CacheService,
{
    pub fn new(repo: R, payment: P, notify: N, cache: C) -> Self {
        Self {
            repo,
            payment,
            notify,
            cache,
        }
    }

    pub async fn create_order(&self, data: OrderData) -> Result<Order, Error> {
        let order = self.repo.save(data).await?;
        self.payment.charge(order.total, "USD").await?;

        if let Err(e) = self.notify.send_order_confirmation(&order).await {
            // 记录但不失败
            tracing::warn!("Failed to send notification: {}", e);
        }

        if let Err(e) = self
            .cache
            .set(
                format!("order:{}", order.id),
                serde_json::to_string(&order)?,
                3600,
            )
            .await
        {
            // 缓存失败不影响主流程
            tracing::warn!("Failed to cache order: {}", e);
        }

        Ok(order)
    }
}
```

---

## 显式依赖

### ❌ 不好的做法

```rust
pub struct UserService;

impl UserService {
    pub async fn create_user(&self, data: UserData) -> Result<User, Error> {
        // 隐藏的数据库依赖
        let pool = PgPool::connect("postgres://localhost").await?;

        // 隐藏的邮件服务
        let email = SESEmailService::new();

        // 隐藏的缓存
        let redis = redis::Client::open("redis://127.0.0.1/")?;

        // 难以测试
        let user = sqlx::query_as!(User, "INSERT INTO users ...")
            .fetch_one(&pool)
            .await?;
        Ok(user)
    }
}
```

### ✅ 好的做法

```rust
// 所有依赖通过构造函数注入
pub struct UserService<R, E, C, L>
where
    R: UserRepository,
    E: EmailService,
    C: CacheService,
    L: Logger,
{
    repo: R,
    email: E,
    cache: C,
    logger: L,
}

impl<R, E, C, L> UserService<R, E, C, L>
where
    R: UserRepository,
    E: EmailService,
    C: CacheService,
    L: Logger,
{
    pub fn new(repo: R, email: E, cache: C, logger: L) -> Self {
        Self {
            repo,
            email,
            cache,
            logger,
        }
    }

    pub async fn create_user(&self, data: UserData) -> Result<User, Error> {
        let user = self.repo.create(data).await?;

        if let Err(e) = self.email.send_welcome(&user.email).await {
            self.logger.warn(&format!("Failed to send email: {}", e));
        }

        if let Err(e) = self.cache.set_user(&user).await {
            self.logger.warn(&format!("Failed to cache user: {}", e));
        }

        self.logger.info(&format!("User {} created", user.id));
        Ok(user)
    }
}
```

---

## 快速失败

### ❌ 不好的做法

```rust
pub struct PaymentService {
    pool: PgPool,
}

impl PaymentService {
    pub async fn process_payment(&self, data: PaymentData) -> Result<PaymentResult, Error> {
        // 不验证直接处理
        let order = sqlx::query_as!(Order, "SELECT * FROM orders WHERE id = $1", data.order_id)
            .fetch_one(&self.pool)
            .await?;

        // 可能失败但继续
        self.charge_card(&data.card, order.total).await?;

        // 可能失败但继续
        sqlx::query!("UPDATE orders SET status = 'paid' WHERE id = $1", order.id)
            .execute(&self.pool)
            .await?;

        Ok(PaymentResult { success: true })
    }
}
```

### ✅ 好的做法

```rust
pub struct PaymentService<R, P, S>
where
    R: OrderRepository,
    P: PaymentGateway,
    S: OrderStatusManager,
{
    repo: R,
    gateway: P,
    status: S,
}

impl<R, P, S> PaymentService<R, P, S>
where
    R: OrderRepository,
    P: PaymentGateway,
    S: OrderStatusManager,
{
    pub fn new(repo: R, gateway: P, status: S) -> Self {
        Self { repo, gateway, status }
    }

    pub async fn process_payment(&self, data: PaymentData) -> Result<PaymentResult, Error> {
        // 边界验证
        if data.order_id.is_empty() {
            return Err(Error::MissingField("order_id"));
        }

        if data.card.is_none() {
            return Err(Error::MissingField("card"));
        }

        let order = self.repo.find_by_id(&data.order_id).await?
            .ok_or_else(|| Error::NotFound(format!("Order {}", data.order_id)))?;

        if order.status != "pending" {
            return Err(Error::InvalidStatus(order.status));
        }

        if order.total <= 0 {
            return Err(Error::InvalidAmount(order.total));
        }

        // 执行支付
        let payment = self.gateway.charge(order.total, "USD").await?;
        if !payment.success {
            return Err(Error::PaymentDeclined(payment.message));
        }

        // 更新状态
        self.status.update_status(&order.id, "paid").await?;

        Ok(PaymentResult {
            success: true,
            payment_id: payment.id,
            order_id: order.id,
        })
    }
}
```

---

## 不可变性

### ❌ 不好的做法

```rust
pub struct ShoppingCart {
    items: Vec<CartItem>,
}

impl ShoppingCart {
    pub fn add_item(&mut self, item: CartItem) {
        self.items.push(item); // 修改原向量
    }

    pub fn remove_item(&mut self, item_id: &str) {
        if let Some(pos) = self.items.iter().position(|i| i.id == item_id) {
            self.items.remove(pos); // 修改原向量
        }
    }

    pub fn update_quantity(&mut self, item_id: &str, quantity: usize) {
        if let Some(item) = self.items.iter_mut().find(|i| i.id == item_id) {
            item.quantity = quantity; // 修改原结构
        }
    }
}
```

### ✅ 好的做法

```rust
#[derive(Clone, Debug)]
pub struct CartItem {
    pub id: String,
    pub name: String,
    pub price: i64,
    pub quantity: usize,
}

#[derive(Clone, Debug)]
pub struct ShoppingCart {
    items: Vec<CartItem>,
}

impl ShoppingCart {
    pub fn new(items: Vec<CartItem>) -> Self {
        Self { items }
    }

    pub fn add_item(&self, item: CartItem) -> Self {
        let mut new_items = self.items.clone();
        new_items.push(item);
        Self { items: new_items }
    }

    pub fn remove_item(&self, item_id: &str) -> Self {
        let new_items = self
            .items
            .iter()
            .filter(|i| i.id != item_id)
            .cloned()
            .collect();
        Self { items: new_items }
    }

    pub fn update_quantity(&self, item_id: &str, quantity: usize) -> Self {
        let new_items = self
            .items
            .iter()
            .map(|item| {
                if item.id == item_id {
                    CartItem {
                        quantity,
                        ..item.clone()
                    }
                } else {
                    item.clone()
                }
            })
            .collect();
        Self { items: new_items }
    }

    pub fn get_total(&self) -> i64 {
        self.items
            .iter()
            .map(|item| item.price * item.quantity as i64)
            .sum()
    }
}

// 使用
let cart = ShoppingCart::new(vec![]);
let cart = cart.add_item(CartItem {
    id: "1".to_string(),
    name: "Item 1".to_string(),
    price: 10,
    quantity: 1,
});
let cart = cart.update_quantity("1", 2);
let cart = cart.remove_item("1");
```

---

## 可测试性

### ❌ 不好的做法

```rust
pub struct OrderService {
    db_pool: PgPool,
}

impl OrderService {
    pub async fn create_order(&self, data: OrderData) -> Result<Order, Error> {
        // 隐藏依赖
        let pool = PgPool::connect("postgres://localhost").await?;

        // 外部 API
        let client = reqwest::Client::new();
        client.post("https://api.payment.com/charge").json(&data).send().await?;

        // 难以 mock
        let email = SESEmailService::new();
        email.send("order@company.com", "Order created").await?;

        todo!()
    }
}
```

### ✅ 好的做法

```rust
// 通过接口定义依赖
pub trait OrderRepository: Send + Sync {
    async fn save(&self, data: OrderData) -> Result<Order, Error>;
}

pub trait PaymentGateway: Send + Sync {
    async fn charge(&self, amount: i64, currency: &str) -> Result<Payment, Error>;
}

pub trait NotificationService: Send + Sync {
    async fn send_order_confirmation(&self, order: &Order) -> Result<(), Error>;
}

// 服务实现
pub struct OrderService<R, P, N>
where
    R: OrderRepository,
    P: PaymentGateway,
    N: NotificationService,
{
    repo: R,
    gateway: P,
    notify: N,
}

impl<R, P, N> OrderService<R, P, N>
where
    R: OrderRepository,
    P: PaymentGateway,
    N: NotificationService,
{
    pub fn new(repo: R, gateway: P, notify: N) -> Self {
        Self { repo, gateway, notify }
    }

    pub async fn create_order(&self, data: OrderData) -> Result<Order, Error> {
        let order = self.repo.save(data).await?;
        self.gateway.charge(order.total, "USD").await?;

        if let Err(e) = self.notify.send_order_confirmation(&order).await {
            // 记录但不失败
            tracing::warn!("Failed to send notification: {}", e);
        }

        Ok(order)
    }
}

// 测试
#[cfg(test)]
mod tests {
    use super::*;
    use mockall::*;

    mock! {
        pub OrderRepository {}
        #[async_trait]
        impl OrderRepository for OrderRepository {
            async fn save(&self, data: OrderData) -> Result<Order, Error>;
        }
    }

    mock! {
        pub PaymentGateway {}
        #[async_trait]
        impl PaymentGateway for PaymentGateway {
            async fn charge(&self, amount: i64, currency: &str) -> Result<Payment, Error>;
        }
    }

    mock! {
        pub NotificationService {}
        #[async_trait]
        impl NotificationService for NotificationService {
            async fn send_order_confirmation(&self, order: &Order) -> Result<(), Error>;
        }
    }

    #[tokio::test]
    async fn test_create_order() {
        let mut mock_repo = MockOrderRepository::new();
        mock_repo
            .expect_save()
            .with(predicate::always())
            .returning(|_| Ok(Order { id: "123".to_string(), total: 100 }));

        let mut mock_gateway = MockPaymentGateway::new();
        mock_gateway
            .expect_charge()
            .with(predicate::eq(100), predicate::eq("USD"))
            .returning(|_, _| Ok(Payment { id: "pay_123".to_string(), success: true }));

        let mut mock_notify = MockNotificationService::new();
        mock_notify
            .expect_send_order_confirmation()
            .with(predicate::always())
            .returning(|_| Ok(()));

        let service = OrderService::new(mock_repo, mock_gateway, mock_notify);
        let result = service.create_order(OrderData { items: vec![] }).await.unwrap();

        assert_eq!(result.id, "123");
    }
}
```

---

## 相关资源

- [通用原则文档](../principles/README.md)
- [TypeScript 示例](../typescript/)
- [Go 示例](../golang/)
- [Python 示例](../python/)
- [Java 示例](../java/)

---

**维护者**: 架构团队
**最后更新**: 2026-01-12
