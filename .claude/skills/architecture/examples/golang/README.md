# Go 架构设计原则示例

> Go 语言特定的代码示例和最佳实践

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

```go
// 违反 SoC：一个包承担了太多职责
package manager

import (
    "database/sql"
    "fmt"
    "net/smtp"
    "log"
)

type UserManager struct {
    db *sql.DB
}

func (m *UserManager) CreateUser(data UserData) (*User, error) {
    // 数据库操作
    hashedPassword := hashPassword(data.Password)
    var user User
    err := m.db.QueryRow(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
        data.Email, hashedPassword,
    ).Scan(&user.ID, &user.Email)
    if err != nil {
        return nil, err
    }

    // 业务逻辑
    subject := "Welcome"
    body := fmt.Sprintf("Welcome %s", data.Email)
    err = smtp.SendMail("smtp.gmail.com:587", auth, "noreply@company.com", []string{data.Email}, []byte(subject+body))
    if err != nil {
        log.Printf("Failed to send email: %v", err)
    }

    // 日志
    log.Printf("User %s created", user.ID)

    return &user, nil
}

func hashPassword(password string) string {
    // 简化的哈希
    return "hashed_" + password
}
```

### ✅ 好的做法

```go
// 数据访问层
package repository

import "database/sql"

type UserRepository interface {
    Create(userData UserCreateData) (*User, error)
    FindByID(id string) (*User, error)
}

type userRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
    return &userRepository{db: db}
}

func (r *userRepository) Create(userData UserCreateData) (*User, error) {
    var user User
    err := r.db.QueryRow(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
        userData.Email, userData.Password,
    ).Scan(&user.ID, &user.Email)
    if err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *userRepository) FindByID(id string) (*User, error) {
    // 实现略
    return nil, nil
}
```

```go
// 业务逻辑层
package service

type UserService struct {
    repo     UserRepository
    email    EmailService
    logger   Logger
}

func NewUserService(repo UserRepository, email EmailService, logger Logger) *UserService {
    return &UserService{
        repo:   repo,
        email:  email,
        logger: logger,
    }
}

func (s *UserService) RegisterUser(data UserCreateData) (*User, error) {
    user, err := s.repo.Create(data)
    if err != nil {
        return nil, err
    }

    if err := s.email.SendWelcome(user.Email); err != nil {
        s.logger.Warn("Failed to send welcome email", "error", err)
    }

    s.logger.Info("User created", "user_id", user.ID)
    return user, nil
}
```

```go
// 缓存层
package cache

type UserCache struct {
    redis RedisClient
    repo  UserRepository
}

func NewUserCache(redis RedisClient, repo UserRepository) *UserCache {
    return &UserCache{redis: redis, repo: repo}
}

func (c *UserCache) GetUser(id string) (*User, error) {
    key := "user:" + id
    if data, err := c.redis.Get(key); err == nil {
        return deserializeUser(data)
    }

    user, err := c.repo.FindByID(id)
    if err != nil {
        return nil, err
    }

    c.redis.SetEx(key, serializeUser(user), 3600)
    return user, nil
}
```

---

## SRP - 单一职责原则

### ❌ 不好的做法

```go
// 一个结构体做了太多事情
type OrderProcessor struct {
    db     *sql.DB
    stripe *stripe.Client
    email  *email.Client
    logger *log.Logger
}

func (p *OrderProcessor) ProcessOrder(orderID string) error {
    // 1. 获取订单
    var order Order
    err := p.db.QueryRow("SELECT * FROM orders WHERE id = $1", orderID).Scan(&order)
    if err != nil {
        return err
    }

    // 2. 支付
    params := &stripe.PaymentIntentParams{
        Amount: stripe.Int64(order.Total),
        Currency: stripe.String("USD"),
    }
    _, err = p.stripe.PaymentIntent.New(params)
    if err != nil {
        return err
    }

    // 3. 更新库存
    for _, item := range order.Items {
        _, err = p.db.Exec("UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2", item.Quantity, item.ProductID)
        if err != nil {
            return err
        }
    }

    // 4. 发送邮件
    subject := "Order Confirmed"
    body := fmt.Sprintf("Your order %s is confirmed", orderID)
    err = p.email.Send(order.CustomerEmail, subject, body)
    if err != nil {
        return err
    }

    // 5. 日志
    p.logger.Printf("Order %s processed", orderID)

    // 6. 更新状态
    _, err = p.db.Exec("UPDATE orders SET status = 'completed' WHERE id = $1", orderID)
    return err
}
```

### ✅ 好的做法

```go
// 验证器
type OrderValidator struct{}

func (v *OrderValidator) Validate(order *Order) error {
    if order == nil || order.Status != "pending" {
        return errors.New("invalid order")
    }
    return nil
}

// 支付处理器
type PaymentProcessor struct {
    gateway PaymentGateway
}

func NewPaymentProcessor(gateway PaymentGateway) *PaymentProcessor {
    return &PaymentProcessor{gateway: gateway}
}

func (p *PaymentProcessor) Process(order *Order) error {
    return p.gateway.Charge(order.Total, "USD")
}

// 库存管理器
type InventoryManager struct {
    repo InventoryRepository
}

func NewInventoryManager(repo InventoryRepository) *InventoryManager {
    return &InventoryManager{repo: repo}
}

func (m *InventoryManager) Reserve(items []OrderItem) error {
    for _, item := range items {
        if err := m.repo.Decrease(item.ProductID, item.Quantity); err != nil {
            return err
        }
    }
    return nil
}

// 通知服务
type NotificationService struct {
    email EmailClient
}

func NewNotificationService(email EmailClient) *NotificationService {
    return &NotificationService{email: email}
}

func (s *NotificationService) SendOrderConfirmation(email string, order *Order) error {
    subject := "Order Confirmed"
    body := fmt.Sprintf("Your order %s is confirmed", order.ID)
    return s.email.Send(email, subject, body)
}

// 订单处理器 - 编排者
type OrderProcessor struct {
    validator      *OrderValidator
    payment        *PaymentProcessor
    inventory      *InventoryManager
    notification   *NotificationService
    statusManager  *OrderStatusManager
    logger         Logger
}

func NewOrderProcessor(
    validator *OrderValidator,
    payment *PaymentProcessor,
    inventory *InventoryManager,
    notification *NotificationService,
    statusManager *OrderStatusManager,
    logger Logger,
) *OrderProcessor {
    return &OrderProcessor{
        validator:     validator,
        payment:       payment,
        inventory:     inventory,
        notification:  notification,
        statusManager: statusManager,
        logger:        logger,
    }
}

func (p *OrderProcessor) ProcessOrder(orderID string) error {
    order, err := p.getOrder(orderID)
    if err != nil {
        return err
    }

    if err := p.validator.Validate(order); err != nil {
        return err
    }

    if err := p.payment.Process(order); err != nil {
        return err
    }

    if err := p.inventory.Reserve(order.Items); err != nil {
        return err
    }

    if err := p.notification.SendOrderConfirmation(order.CustomerEmail, order); err != nil {
        p.logger.Warn("Failed to send notification", "error", err)
    }

    if err := p.statusManager.UpdateStatus(orderID, "completed"); err != nil {
        return err
    }

    p.logger.Info("Order processed", "order_id", orderID)
    return nil
}

func (p *OrderProcessor) getOrder(id string) (*Order, error) {
    // 获取订单逻辑
    return nil, nil
}
```

---

## DRY - 不重复自己

### ❌ 不好的做法

```go
// 验证逻辑重复
type UserService struct {
    db *sql.DB
}

func (s *UserService) CreateUser(data UserData) error {
    if !validateEmail(data.Email) {
        return errors.New("invalid email")
    }
    if len(data.Password) < 8 {
        return errors.New("password too short")
    }
    // ... 创建用户
    return nil
}

func (s *UserService) UpdateUser(id string, data UserData) error {
    if !validateEmail(data.Email) {
        return errors.New("invalid email")
    }
    if len(data.Password) < 8 {
        return errors.New("password too short")
    }
    // ... 更新用户
    return nil
}

func validateEmail(email string) bool {
    // 验证逻辑
    return true
}
```

### ✅ 好的做法

```go
// 提取公共验证逻辑
package validation

import (
    "regexp"
    "unicode"
)

type ValidationService struct{}

func NewValidationService() *ValidationService {
    return &ValidationService{}
}

func (v *ValidationService) ValidateEmail(email string) bool {
    pattern := `^[^\s@]+@[^\s@]+\.[^\s@]+$`
    matched, _ := regexp.MatchString(pattern, email)
    return matched
}

func (v *ValidationService) ValidatePassword(password string) bool {
    if len(password) < 8 {
        return false
    }

    var hasUpper, hasLower, hasDigit bool
    for _, char := range password {
        switch {
        case unicode.IsUpper(char):
            hasUpper = true
        case unicode.IsLower(char):
            hasLower = true
        case unicode.IsDigit(char):
            hasDigit = true
        }
    }
    return hasUpper && hasLower && hasDigit
}

func (v *ValidationService) ValidatePhone(phone string) bool {
    pattern := `^\+?[\d\s-]+$`
    matched, _ := regexp.MatchString(pattern, phone)
    return matched
}
```

```go
// 使用验证服务
type UserService struct {
    repo     UserRepository
    validator *validation.ValidationService
}

func NewUserService(repo UserRepository, validator *validation.ValidationService) *UserService {
    return &UserService{repo: repo, validator: validator}
}

func (s *UserService) CreateUser(data UserData) error {
    if !s.validator.ValidateEmail(data.Email) {
        return errors.New("invalid email")
    }
    if !s.validator.ValidatePassword(data.Password) {
        return errors.New("invalid password")
    }
    return s.repo.Create(data)
}

func (s *UserService) UpdateUser(id string, data UserData) error {
    if !s.validator.ValidateEmail(data.Email) {
        return errors.New("invalid email")
    }
    if !s.validator.ValidatePassword(data.Password) {
        return errors.New("invalid password")
    }
    return s.repo.Update(id, data)
}
```

---

## KISS - 保持简单

### ❌ 不好的做法

```go
// 过度设计的抽象
type Command interface {
    Execute() error
}

type CompositeCommand struct {
    commands []Command
}

func (c *CompositeCommand) Execute() error {
    for _, cmd := range c.commands {
        if err := cmd.Execute(); err != nil {
            return err
        }
    }
    return nil
}

type CreateUserCommand struct {
    data      UserData
    factory   RepositoryFactory
    strategy  ValidationStrategy
}

func (c *CreateUserCommand) Execute() error {
    repo := c.factory.Create("user")
    validator := c.strategy.GetValidator("user")
    if err := validator.Validate(c.data); err != nil {
        return err
    }
    return repo.Save(c.data)
}

// 使用复杂
cmd := &CreateUserCommand{
    data:     userData,
    factory:  NewRepositoryFactory(),
    strategy: NewValidationStrategy(),
}
if err := cmd.Execute(); err != nil {
    return err
}
```

### ✅ 好的做法

```go
// 简单直接的函数
type UserRepository interface {
    Save(data UserData) error
}

type UserValidator interface {
    Validate(data UserData) error
}

type UserService struct {
    repo      UserRepository
    validator UserValidator
}

func NewUserService(repo UserRepository, validator UserValidator) *UserService {
    return &UserService{repo: repo, validator: validator}
}

func (s *UserService) CreateUser(data UserData) error {
    if err := s.validator.Validate(data); err != nil {
        return err
    }
    return s.repo.Save(data)
}

// 使用简单
service := NewUserService(userRepo, userValidator)
if err := service.CreateUser(userData); err != nil {
    return err
}
```

---

## 组合优于继承

### ❌ 不好的做法

```go
// Go 没有继承，但可以用嵌套模拟
type BaseReportGenerator struct {
    data interface{}
}

func (b *BaseReportGenerator) Generate() string {
    return "base report"
}

func (b *BaseReportGenerator) ExportPDF() error {
    // PDF 导出
    return nil
}

func (b *BaseReportGenerator) ExportExcel() error {
    // Excel 导出
    return nil
}

func (b *BaseReportGenerator) SendEmail(to string) error {
    // 发送邮件
    return nil
}

type SalesReportGenerator struct {
    BaseReportGenerator
}

// 继承了所有方法，但可能不需要
```

### ✅ 好的做法

```go
// 定义接口
type Formatter interface {
    Format(data interface{}) string
}

type Exporter interface {
    Export(content string) error
}

type Sender interface {
    Send(recipient string, content string) error
}

// 实现具体功能
type JSONFormatter struct{}

func (f *JSONFormatter) Format(data interface{}) string {
    // JSON 格式化
    return "json"
}

type PDFExporter struct{}

func (e *PDFExporter) Export(content string) error {
    // PDF 导出
    return nil
}

type EmailSender struct{}

func (s *EmailSender) Send(recipient string, content string) error {
    // 邮件发送
    return nil
}

// 通过组合构建
type ReportGenerator struct {
    formatter Formatter
    exporter  Exporter
    sender    Sender
}

func NewReportGenerator(f Formatter, e Exporter, s Sender) *ReportGenerator {
    return &ReportGenerator{
        formatter: f,
        exporter:  e,
        sender:    s,
    }
}

func (g *ReportGenerator) GenerateAndExport(data interface{}, recipient string) error {
    formatted := g.formatter.Format(data)
    if err := g.exporter.Export(formatted); err != nil {
        return err
    }
    if g.sender != nil {
        return g.sender.Send(recipient, formatted)
    }
    return nil
}

// 灵活组合
salesReport := NewReportGenerator(
    &JSONFormatter{},
    &PDFExporter{},
    &EmailSender{},
)

financialReport := NewReportGenerator(
    &JSONFormatter{},
    &PDFExporter{},
    nil, // 不需要发送
)
```

---

## 高内聚低耦合

### ❌ 不好的做法

```go
// 紧耦合
type OrderService struct {
    db     *sql.DB
    stripe *stripe.Client
    ses    *ses.SES
    redis  *redis.Client
}

func (s *OrderService) CreateOrder(data OrderData) (*Order, error) {
    // 直接数据库操作
    var order Order
    err := s.db.QueryRow("INSERT INTO orders ...").Scan(&order)
    if err != nil {
        return nil, err
    }

    // 直接支付调用
    _, err = s.stripe.PaymentIntent.New(&stripe.PaymentIntentParams{
        Amount: stripe.Int64(order.Total),
    })
    if err != nil {
        return nil, err
    }

    // 直接邮件服务
    _, err = s.ses.SendEmail(&ses.SendEmailInput{
        Source: aws.String("noreply@company.com"),
        Destination: &ses.Destination{
            ToAddresses: []*string{aws.String(data.Email)},
        },
    })

    // 直接缓存
    s.redis.Set("order:"+order.ID, order, 3600)

    return &order, nil
}
```

### ✅ 好的做法

```go
// 定义接口
type OrderRepository interface {
    Save(data OrderData) (*Order, error)
}

type PaymentGateway interface {
    Charge(amount int64, currency string) error
}

type NotificationService interface {
    SendOrderConfirmation(order *Order) error
}

type CacheService interface {
    Set(key string, value interface{}, ttl int) error
}

// 具体实现
type MySQLOrderRepository struct {
    db *sql.DB
}

func (r *MySQLOrderRepository) Save(data OrderData) (*Order, error) {
    // MySQL 实现
    return nil, nil
}

type StripePaymentGateway struct {
    client *stripe.Client
}

func (g *StripePaymentGateway) Charge(amount int64, currency string) error {
    // Stripe 实现
    return nil
}

type SESEmailService struct {
    client *ses.SES
}

func (s *SESEmailService) SendOrderConfirmation(order *Order) error {
    // SES 实现
    return nil
}

type RedisCacheService struct {
    client *redis.Client
}

func (c *RedisCacheService) Set(key string, value interface{}, ttl int) error {
    // Redis 实现
    return nil
}

// 低耦合的服务
type OrderService struct {
    repo     OrderRepository
    payment  PaymentGateway
    notify   NotificationService
    cache    CacheService
}

func NewOrderService(
    repo OrderRepository,
    payment PaymentGateway,
    notify NotificationService,
    cache CacheService,
) *OrderService {
    return &OrderService{
        repo:    repo,
        payment: payment,
        notify:  notify,
        cache:   cache,
    }
}

func (s *OrderService) CreateOrder(data OrderData) (*Order, error) {
    order, err := s.repo.Save(data)
    if err != nil {
        return nil, err
    }

    if err := s.payment.Charge(order.Total, "USD"); err != nil {
        return nil, err
    }

    if err := s.notify.SendOrderConfirmation(order); err != nil {
        // 记录但不失败
        // log.Warn(...)
    }

    if err := s.cache.Set("order:"+order.ID, order, 3600); err != nil {
        // 缓存失败不影响主流程
        // log.Warn(...)
    }

    return order, nil
}
```

---

## 显式依赖

### ❌ 不好的做法

```go
type UserService struct {
    // 没有字段，依赖隐藏在方法内部
}

func (s *UserService) CreateUser(data UserData) (*User, error) {
    // 隐藏的数据库依赖
    db, _ := sql.Open("postgres", "host=localhost user=postgres")

    // 隐藏的邮件服务
    email := NewEmailService()

    // 隐藏的缓存
    redis := NewRedisClient()

    // 难以测试
    user, err := db.Query("INSERT INTO users ...")
    // ...
    return user, nil
}
```

### ✅ 好的做法

```go
// 所有依赖通过构造函数注入
type UserService struct {
    repo     UserRepository
    email    EmailService
    cache    CacheService
    logger   Logger
}

func NewUserService(
    repo UserRepository,
    email EmailService,
    cache CacheService,
    logger Logger,
) *UserService {
    return &UserService{
        repo:   repo,
        email:  email,
        cache:  cache,
        logger: logger,
    }
}

func (s *UserService) CreateUser(data UserData) (*User, error) {
    user, err := s.repo.Create(data)
    if err != nil {
        return nil, err
    }

    if err := s.email.SendWelcome(user.Email); err != nil {
        s.logger.Warn("Failed to send email", "error", err)
    }

    if err := s.cache.Set("user:"+user.ID, user, 3600); err != nil {
        s.logger.Warn("Failed to cache user", "error", err)
    }

    s.logger.Info("User created", "user_id", user.ID)
    return user, nil
}

// 依赖注入
func main() {
    repo := NewMySQLUserRepository()
    email := NewSESEmailService()
    cache := NewRedisCacheService()
    logger := NewZapLogger()

    userService := NewUserService(repo, email, cache, logger)
    // 使用 service
}
```

---

## 快速失败

### ❌ 不好的做法

```go
type PaymentService struct {
    db *sql.DB
}

func (s *PaymentService) ProcessPayment(data PaymentData) (*PaymentResult, error) {
    // 不验证直接处理
    order, _ := s.db.QueryRow("SELECT * FROM orders WHERE id = $1", data.OrderID)

    // 可能失败但继续
    s.chargeCard(data.Card, order.Total)

    // 可能失败但继续
    s.db.Exec("UPDATE orders SET status = 'paid'")

    return &PaymentResult{Success: true}, nil
}
```

### ✅ 好的做法

```go
type PaymentService struct {
    repo    OrderRepository
    gateway PaymentGateway
    status  OrderStatusManager
}

func NewPaymentService(
    repo OrderRepository,
    gateway PaymentGateway,
    status OrderStatusManager,
) *PaymentService {
    return &PaymentService{
        repo:    repo,
        gateway: gateway,
        status:  status,
    }
}

func (s *PaymentService) ProcessPayment(data PaymentData) (*PaymentResult, error) {
    // 边界验证
    if data.OrderID == "" {
        return nil, errors.New("missing order ID")
    }

    if data.Card == nil {
        return nil, errors.New("missing card information")
    }

    order, err := s.repo.FindByID(data.OrderID)
    if err != nil {
        return nil, fmt.Errorf("order not found: %w", err)
    }

    if order.Status != "pending" {
        return nil, fmt.Errorf("invalid order status: %s", order.Status)
    }

    if order.Total <= 0 {
        return nil, errors.New("invalid order total")
    }

    // 执行支付
    payment, err := s.gateway.Charge(data.Card, order.Total)
    if err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    if !payment.Success {
        return nil, fmt.Errorf("payment declined: %s", payment.Message)
    }

    // 更新状态
    if err := s.status.UpdateStatus(order.ID, "paid"); err != nil {
        return nil, fmt.Errorf("failed to update status: %w", err)
    }

    return &PaymentResult{
        Success:   true,
        PaymentID: payment.ID,
        OrderID:   order.ID,
    }, nil
}
```

---

## 不可变性

### ❌ 不好的做法

```go
type ShoppingCart struct {
    Items []CartItem
}

func (c *ShoppingCart) AddItem(item CartItem) {
    c.Items = append(c.Items, item) // 修改原切片
}

func (c *ShoppingCart) RemoveItem(itemID string) {
    for i, item := range c.Items {
        if item.ID == itemID {
            c.Items = append(c.Items[:i], c.Items[i+1:]...) // 修改原切片
            break
        }
    }
}

func (c *ShoppingCart) UpdateQuantity(itemID string, quantity int) {
    for i := range c.Items {
        if c.Items[i].ID == itemID {
            c.Items[i].Quantity = quantity // 修改原结构
            break
        }
    }
}
```

### ✅ 好的做法

```go
type CartItem struct {
    ID       string
    Name     string
    Price    int64
    Quantity int
}

type ShoppingCart struct {
    items []CartItem
}

func NewShoppingCart(items []CartItem) ShoppingCart {
    return ShoppingCart{items: items}
}

func (c ShoppingCart) AddItem(item CartItem) ShoppingCart {
    newItems := make([]CartItem, len(c.items)+1)
    copy(newItems, c.items)
    newItems[len(c.items)] = item
    return ShoppingCart{items: newItems}
}

func (c ShoppingCart) RemoveItem(itemID string) ShoppingCart {
    newItems := make([]CartItem, 0, len(c.items))
    for _, item := range c.items {
        if item.ID != itemID {
            newItems = append(newItems, item)
        }
    }
    return ShoppingCart{items: newItems}
}

func (c ShoppingCart) UpdateQuantity(itemID string, quantity int) ShoppingCart {
    newItems := make([]CartItem, len(c.items))
    for i, item := range c.items {
        if item.ID == itemID {
            newItems[i] = CartItem{
                ID:       item.ID,
                Name:     item.Name,
                Price:    item.Price,
                Quantity: quantity,
            }
        } else {
            newItems[i] = item
        }
    }
    return ShoppingCart{items: newItems}
}

func (c ShoppingCart) GetTotal() int64 {
    var total int64
    for _, item := range c.items {
        total += item.Price * int64(item.Quantity)
    }
    return total
}

// 使用
var cart = NewShoppingCart([]CartItem{})
cart = cart.AddItem(CartItem{ID: "1", Name: "Item 1", Price: 10, Quantity: 1})
cart = cart.UpdateQuantity("1", 2)
cart = cart.RemoveItem("1")
```

---

## 可测试性

### ❌ 不好的做法

```go
type OrderService struct {
    db *sql.DB
}

func (s *OrderService) CreateOrder(data OrderData) (*Order, error) {
    // 隐藏依赖
    db, _ := sql.Open("postgres", "host=localhost")

    // 外部 API
    client := &http.Client{}
    req, _ := http.NewRequest("POST", "https://api.payment.com/charge", nil)
    resp, _ := client.Do(req)

    // 难以 mock
    email := NewEmailService()
    email.Send("order@company.com", "Order created")

    return nil, nil
}
```

### ✅ 好的做法

```go
// 通过接口定义依赖
type OrderRepository interface {
    Save(data OrderData) (*Order, error)
}

type PaymentGateway interface {
    Charge(amount int64, currency string) error
}

type NotificationService interface {
    SendOrderConfirmation(order *Order) error
}

// 服务实现
type OrderService struct {
    repo     OrderRepository
    gateway  PaymentGateway
    notify   NotificationService
}

func NewOrderService(
    repo OrderRepository,
    gateway PaymentGateway,
    notify NotificationService,
) *OrderService {
    return &OrderService{
        repo:    repo,
        gateway: gateway,
        notify:  notify,
    }
}

func (s *OrderService) CreateOrder(data OrderData) (*Order, error) {
    order, err := s.repo.Save(data)
    if err != nil {
        return nil, err
    }

    if err := s.gateway.Charge(order.Total, "USD"); err != nil {
        return nil, err
    }

    if err := s.notify.SendOrderConfirmation(order); err != nil {
        // 记录但不失败
    }

    return order, nil
}

// 测试
type mockOrderRepository struct {
    save func(data OrderData) (*Order, error)
}

func (m *mockOrderRepository) Save(data OrderData) (*Order, error) {
    return m.save(data)
}

type mockPaymentGateway struct {
    charge func(amount int64, currency string) error
}

func (m *mockPaymentGateway) Charge(amount int64, currency string) error {
    return m.charge(amount, currency)
}

type mockNotificationService struct {
    send func(order *Order) error
}

func (m *mockNotificationService) SendOrderConfirmation(order *Order) error {
    return m.send(order)
}

func TestOrderService_CreateOrder(t *testing.T) {
    repo := &mockOrderRepository{
        save: func(data OrderData) (*Order, error) {
            return &Order{ID: "123", Total: 100}, nil
        },
    }

    gateway := &mockPaymentGateway{
        charge: func(amount int64, currency string) error {
            if amount != 100 {
                t.Errorf("expected amount 100, got %d", amount)
            }
            return nil
        },
    }

    notify := &mockNotificationService{
        send: func(order *Order) error {
            if order.ID != "123" {
                t.Errorf("expected order ID 123, got %s", order.ID)
            }
            return nil
        },
    }

    service := NewOrderService(repo, gateway, notify)
    order, err := service.CreateOrder(OrderData{Items: []Item{{}}})

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    if order.ID != "123" {
        t.Errorf("expected order ID 123, got %s", order.ID)
    }
}
```

---

## 相关资源

- [通用原则文档](../principles/README.md)
- [TypeScript 示例](../typescript/)
- [Rust 示例](../rust/)
- [Python 示例](../python/)
- [Java 示例](../java/)

---

**维护者**: 架构团队
**最后更新**: 2026-01-12
