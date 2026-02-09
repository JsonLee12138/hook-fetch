# Python 架构设计原则示例

> Python 语言特定的代码示例和最佳实践

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

```python
# 违反 SoC：一个类承担了太多职责
class UserManager:
    def __init__(self, db_connection):
        self.db = db_connection

    async def create_user(self, data: dict) -> dict:
        # 数据库操作
        hashed_password = self._hash_password(data['password'])
        user = await self.db.execute(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            data['email'], hashed_password
        )

        # 业务逻辑
        welcome_email = self._generate_welcome_email(data['email'])
        await self._send_email(welcome_email)

        # 日志记录
        logger.info(f"User {user['id']} created")

        # 缓存更新
        await redis.setex(f"user:{user['id']}", 3600, json.dumps(user))

        return user

    def _hash_password(self, password: str) -> str:
        return f"hashed_{password}"

    def _generate_welcome_email(self, email: str) -> dict:
        return {"to": email, "subject": "Welcome", "body": "Welcome!"}

    async def _send_email(self, email: dict) -> None:
        # 发送邮件逻辑
        pass
```

### ✅ 好的做法

```python
# 数据访问层
from abc import ABC, abstractmethod
from typing import Optional

class UserRepository(ABC):
    @abstractmethod
    async def create(self, data: dict) -> dict:
        pass

    @abstractmethod
    async def find_by_id(self, id: str) -> Optional[dict]:
        pass

class MySQLUserRepository(UserRepository):
    def __init__(self, db_connection):
        self.db = db_connection

    async def create(self, data: dict) -> dict:
        hashed_password = self._hash_password(data['password'])
        user = await self.db.execute(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            data['email'], hashed_password
        )
        return user

    async def find_by_id(self, id: str) -> Optional[dict]:
        return await self.db.fetchrow("SELECT * FROM users WHERE id = $1", id)

    def _hash_password(self, password: str) -> str:
        return f"hashed_{password}"
```

```python
# 业务逻辑层
class EmailService(ABC):
    @abstractmethod
    async def send_welcome(self, email: str) -> None:
        pass

class SESEmailService(EmailService):
    def __init__(self, ses_client):
        self.ses = ses_client

    async def send_welcome(self, email: str) -> None:
        await self.ses.send_email(
            Source="noreply@company.com",
            Destination={"ToAddresses": [email]},
            Message={"Subject": {"Data": "Welcome"}, "Body": {"Text": {"Data": "Welcome!"}}}
        )

class UserService:
    def __init__(self, repo: UserRepository, email: EmailService, logger):
        self.repo = repo
        self.email = email
        self.logger = logger

    async def register_user(self, data: dict) -> dict:
        user = await self.repo.create(data)

        try:
            await self.email.send_welcome(user['email'])
        except Exception as e:
            self.logger.warning(f"Failed to send welcome email: {e}")

        self.logger.info(f"User {user['id']} created")
        return user
```

```python
# 缓存层
class CacheService(ABC):
    @abstractmethod
    async def get_user(self, id: str) -> Optional[dict]:
        pass

class RedisCacheService(CacheService):
    def __init__(self, redis_client, repo: UserRepository):
        self.redis = redis_client
        self.repo = repo

    async def get_user(self, id: str) -> Optional[dict]:
        key = f"user:{id}"
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)

        user = await self.repo.find_by_id(id)
        if user:
            await self.redis.setex(key, 3600, json.dumps(user))
        return user
```

---

## SRP - 单一职责原则

### ❌ 不好的做法

```python
class OrderProcessor:
    def __init__(self, db, stripe_client, ses_client, logger):
        self.db = db
        self.stripe = stripe_client
        self.ses = ses_client
        self.logger = logger

    async def process_order(self, order_id: str) -> None:
        # 1. 获取订单
        order = await self.db.fetchrow("SELECT * FROM orders WHERE id = $1", order_id)

        # 2. 支付
        await self.stripe.PaymentIntent.create(
            amount=order['total'],
            currency="USD"
        )

        # 3. 更新库存
        for item in order['items']:
            await self.db.execute(
                "UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2",
                item['quantity'], item['product_id']
            )

        # 4. 发送邮件
        await self.ses.send_email(
            Source="noreply@company.com",
            Destination={"ToAddresses": [order['customer_email']]},
            Message={
                "Subject": {"Data": "Order Confirmed"},
                "Body": {"Text": {"Data": f"Order {order_id} confirmed"}}
            }
        )

        # 5. 日志
        self.logger.info(f"Order {order_id} processed")

        # 6. 更新状态
        await self.db.execute("UPDATE orders SET status = 'completed' WHERE id = $1", order_id)
```

### ✅ 好的做法

```python
# 验证器
class OrderValidator:
    def validate(self, order: dict) -> None:
        if not order or order['status'] != 'pending':
            raise ValueError(f"Invalid order status: {order.get('status') if order else 'None'}")
```

```python
# 支付处理器
class PaymentGateway(ABC):
    @abstractmethod
    async def charge(self, amount: int, currency: str) -> dict:
        pass

class StripePaymentGateway(PaymentGateway):
    def __init__(self, client):
        self.client = client

    async def charge(self, amount: int, currency: str) -> dict:
        return await self.client.PaymentIntent.create(amount=amount, currency=currency)
```

```python
# 库存管理器
class InventoryManager:
    def __init__(self, db):
        self.db = db

    async def reserve(self, items: list) -> None:
        for item in items:
            await self.db.execute(
                "UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2",
                item['quantity'], item['product_id']
            )
```

```python
# 通知服务
class NotificationService(ABC):
    @abstractmethod
    async def send_order_confirmation(self, order: dict) -> None:
        pass

class SESNotificationService(NotificationService):
    def __init__(self, ses_client):
        self.ses = ses_client

    async def send_order_confirmation(self, order: dict) -> None:
        await self.ses.send_email(
            Source="noreply@company.com",
            Destination={"ToAddresses": [order['customer_email']]},
            Message={
                "Subject": {"Data": "Order Confirmed"},
                "Body": {"Text": {"Data": f"Order {order['id']} confirmed"}}
            }
        )
```

```python
# 订单处理器 - 编排者
class OrderProcessor:
    def __init__(
        self,
        validator: OrderValidator,
        payment: PaymentGateway,
        inventory: InventoryManager,
        notification: NotificationService,
        status_manager,
        logger
    ):
        self.validator = validator
        self.payment = payment
        self.inventory = inventory
        self.notification = notification
        self.status_manager = status_manager
        self.logger = logger

    async def process_order(self, order_id: str) -> None:
        order = await self._get_order(order_id)

        self.validator.validate(order)
        await self.payment.charge(order['total'], "USD")
        await self.inventory.reserve(order['items'])

        try:
            await self.notification.send_order_confirmation(order)
        except Exception as e:
            self.logger.warning(f"Failed to send notification: {e}")

        await self.status_manager.update_status(order_id, "completed")
        self.logger.info(f"Order {order_id} processed")

    async def _get_order(self, order_id: str) -> dict:
        # 获取订单逻辑
        pass
```

---

## DRY - 不重复自己

### ❌ 不好的做法

```python
# 验证逻辑重复
class UserService:
    def __init__(self, db):
        self.db = db

    async def create_user(self, data: dict) -> dict:
        if not self._validate_email(data['email']):
            raise ValueError("Invalid email")
        if len(data['password']) < 8:
            raise ValueError("Password too short")
        # ... 创建用户
        pass

    async def update_user(self, id: str, data: dict) -> dict:
        if not self._validate_email(data['email']):
            raise ValueError("Invalid email")
        if len(data['password']) < 8:
            raise ValueError("Password too short")
        # ... 更新用户
        pass

    def _validate_email(self, email: str) -> bool:
        # 验证逻辑
        return True
```

### ✅ 好的做法

```python
# 提取公共验证逻辑
import re

class ValidationService:
    @staticmethod
    def validate_email(email: str) -> bool:
        pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_password(password: str) -> bool:
        if len(password) < 8:
            return False
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        return has_upper and has_lower and has_digit

    @staticmethod
    def validate_phone(phone: str) -> bool:
        pattern = r"^\+?[\d\s-]+$"
        return bool(re.match(pattern, phone))
```

```python
# 使用验证服务
class UserService:
    def __init__(self, repo, validator: ValidationService):
        self.repo = repo
        self.validator = validator

    async def create_user(self, data: dict) -> dict:
        if not self.validator.validate_email(data['email']):
            raise ValueError("Invalid email")
        if not self.validator.validate_password(data['password']):
            raise ValueError("Invalid password")
        return await self.repo.create(data)

    async def update_user(self, id: str, data: dict) -> dict:
        if not self.validator.validate_email(data['email']):
            raise ValueError("Invalid email")
        if not self.validator.validate_password(data['password']):
            raise ValueError("Invalid password")
        return await self.repo.update(id, data)
```

---

## KISS - 保持 simple

### ❌ 不好的做法

```python
# 过度设计的抽象
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self) -> None:
        pass

class CompositeCommand(Command):
    def __init__(self, commands: list[Command]):
        self.commands = commands

    def execute(self) -> None:
        for cmd in self.commands:
            cmd.execute()

class CreateUserCommand(Command):
    def __init__(self, data, factory, strategy):
        self.data = data
        self.factory = factory
        self.strategy = strategy

    def execute(self) -> None:
        repo = self.factory.create('user')
        validator = self.strategy.get_validator('user')
        validator.validate(self.data)
        repo.save(self.data)

# 使用复杂
cmd = CreateUserCommand(
    user_data,
    RepositoryFactory(),
    ValidationStrategy()
)
cmd.execute()
```

### ✅ 好的做法

```python
# 简单直接的函数
class UserRepository(ABC):
    @abstractmethod
    async def save(self, data: dict) -> dict:
        pass

class UserValidator(ABC):
    @abstractmethod
    async def validate(self, data: dict) -> None:
        pass

class UserService:
    def __init__(self, repo: UserRepository, validator: UserValidator):
        self.repo = repo
        self.validator = validator

    async def create_user(self, data: dict) -> dict:
        await self.validator.validate(data)
        return await self.repo.save(data)

# 使用简单
service = UserService(user_repo, user_validator)
user = await service.create_user(user_data)
```

---

## 组合优于继承

### ❌ 不好的做法

```python
# 继承导致紧耦合
class BaseReportGenerator:
    def generate(self):
        return "base report"

    def export_pdf(self):
        # PDF 导出
        pass

    def export_excel(self):
        # Excel 导出
        pass

    def send_email(self, to):
        # 发送邮件
        pass

class SalesReportGenerator(BaseReportGenerator):
    # 继承了所有方法，即使不需要
    pass
```

### ✅ 好的做法

```python
# 定义接口
from abc import ABC, abstractmethod

class Formatter(ABC):
    @abstractmethod
    def format(self, data) -> str:
        pass

class Exporter(ABC):
    @abstractmethod
    def export(self, content: str) -> None:
        pass

class Sender(ABC):
    @abstractmethod
    def send(self, recipient: str, content: str) -> None:
        pass
```

```python
# 实现具体功能
class JSONFormatter(Formatter):
    def format(self, data) -> str:
        import json
        return json.dumps(data, indent=2)

class PDFExporter(Exporter):
    def export(self, content: str) -> None:
        # PDF 导出逻辑
        pass

class EmailSender(Sender):
    def send(self, recipient: str, content: str) -> None:
        # 邮件发送逻辑
        pass
```

```python
# 通过组合构建
class ReportGenerator:
    def __init__(self, formatter: Formatter, exporter: Exporter, sender: Sender = None):
        self.formatter = formatter
        self.exporter = exporter
        self.sender = sender

    def generate_and_export(self, data, recipient: str = None) -> None:
        formatted = self.formatter.format(data)
        self.exporter.export(formatted)

        if self.sender and recipient:
            self.sender.send(recipient, formatted)

# 灵活组合
sales_report = ReportGenerator(
    JSONFormatter(),
    PDFExporter(),
    EmailSender()
)

financial_report = ReportGenerator(
    JSONFormatter(),
    PDFExporter()
    # 不需要发送功能
)
```

---

## 高内聚低耦合

### ❌ 不好的做法

```python
# 紧耦合
class OrderService:
    def __init__(self):
        self.db = Database('host', 'user', 'pass')
        self.stripe = stripe.Client('sk_...')
        self.ses = boto3.client('ses')
        self.redis = redis.Redis('redis://localhost')

    async def create_order(self, data: dict) -> dict:
        # 直接数据库操作
        order = await self.db.query("INSERT INTO orders ...")

        # 直接支付调用
        await self.stripe.charges.create(amount=order['total'])

        # 直接邮件服务
        await self.ses.send_email(
            Source='noreply@company.com',
            Destination={'ToAddresses': [data['email']]},
            Message={/* ... */}
        )

        # 直接缓存
        await self.redis.setex(f"order:{order['id']}", 3600, json.dumps(order))

        return order
```

### ✅ 好的做法

```python
# 定义接口
class OrderRepository(ABC):
    @abstractmethod
    async def save(self, data: dict) -> dict:
        pass

class PaymentGateway(ABC):
    @abstractmethod
    async def charge(self, amount: int, currency: str) -> dict:
        pass

class NotificationService(ABC):
    @abstractmethod
    async def send_order_confirmation(self, order: dict) -> None:
        pass

class CacheService(ABC):
    @abstractmethod
    async def set(self, key: str, value: str, ttl: int) -> None:
        pass
```

```python
# 具体实现
class MySQLOrderRepository(OrderRepository):
    def __init__(self, db):
        self.db = db

    async def save(self, data: dict) -> dict:
        # MySQL 实现
        pass

class StripePaymentGateway(PaymentGateway):
    def __init__(self, client):
        self.client = client

    async def charge(self, amount: int, currency: str) -> dict:
        # Stripe 实现
        pass

class SESEmailService(NotificationService):
    def __init__(self, client):
        self.client = client

    async def send_order_confirmation(self, order: dict) -> None:
        # SES 实现
        pass

class RedisCacheService(CacheService):
    def __init__(self, client):
        self.client = client

    async def set(self, key: str, value: str, ttl: int) -> None:
        # Redis 实现
        pass
```

```python
# 低耦合的服务
class OrderService:
    def __init__(
        self,
        repo: OrderRepository,
        payment: PaymentGateway,
        notify: NotificationService,
        cache: CacheService
    ):
        self.repo = repo
        self.payment = payment
        self.notify = notify
        self.cache = cache

    async def create_order(self, data: dict) -> dict:
        order = await self.repo.save(data)
        await self.payment.charge(order['total'], 'USD')

        try:
            await self.notify.send_order_confirmation(order)
        except Exception:
            # 记录但不失败
            pass

        try:
            await self.cache.set(
                f"order:{order['id']}",
                json.dumps(order),
                3600
            )
        except Exception:
            # 缓存失败不影响主流程
            pass

        return order
```

---

## 显式依赖

### ❌ 不好的做法

```python
class UserService:
    async def create_user(self, data: dict) -> dict:
        # 隐藏的数据库依赖
        db = Database('connection-string')

        # 隐藏的邮件服务
        email = EmailService()

        # 隐藏的缓存
        redis = Redis()

        # 难以测试
        user = await db.query("INSERT INTO users ...")
        return user
```

### ✅ 好的做法

```python
# 所有依赖通过构造函数注入
class UserService:
    def __init__(self, repo, email, cache, logger):
        self.repo = repo
        self.email = email
        self.cache = cache
        self.logger = logger

    async def create_user(self, data: dict) -> dict:
        user = await self.repo.create(data)

        try:
            await self.email.send_welcome(user['email'])
        except Exception as e:
            self.logger.warning(f"Failed to send email: {e}")

        try:
            await self.cache.set_user(user)
        except Exception as e:
            self.logger.warning(f"Failed to cache user: {e}")

        self.logger.info(f"User {user['id']} created")
        return user
```

---

## 快速失败

### ❌ 不好的做法

```python
class PaymentService:
    def __init__(self, db):
        self.db = db

    async def process_payment(self, data: dict) -> dict:
        # 不验证直接处理
        order = await self.db.fetchrow("SELECT * FROM orders WHERE id = $1", data['order_id'])

        # 可能失败但继续
        await self.charge_card(data['card'], order['total'])

        # 可能失败但继续
        await self.db.execute("UPDATE orders SET status = 'paid' WHERE id = $1", order['id'])

        return {"success": True}
```

### ✅ 好的做法

```python
class PaymentService:
    def __init__(self, repo, gateway, status_manager):
        self.repo = repo
        self.gateway = gateway
        self.status_manager = status_manager

    async def process_payment(self, data: dict) -> dict:
        # 边界验证
        if not data.get('order_id'):
            raise ValueError("Missing order_id")

        if not data.get('card'):
            raise ValueError("Missing card")

        order = await self.repo.find_by_id(data['order_id'])
        if not order:
            raise ValueError(f"Order {data['order_id']} not found")

        if order['status'] != 'pending':
            raise ValueError(f"Invalid order status: {order['status']}")

        if order['total'] <= 0:
            raise ValueError("Invalid order total")

        # 执行支付
        payment = await self.gateway.charge(order['total'], 'USD')
        if not payment['success']:
            raise ValueError(f"Payment failed: {payment.get('message')}")

        # 更新状态
        await self.status_manager.update_status(order['id'], 'paid')

        return {
            "success": True,
            "payment_id": payment['id'],
            "order_id": order['id']
        }
```

---

## 不可变性

### ❌ 不好的做法

```python
class ShoppingCart:
    def __init__(self):
        self.items = []

    def add_item(self, item: dict) -> None:
        self.items.append(item)  # 修改原列表

    def remove_item(self, item_id: str) -> None:
        self.items = [i for i in self.items if i['id'] != item_id]  # 修改原列表

    def update_quantity(self, item_id: str, quantity: int) -> None:
        for item in self.items:
            if item['id'] == item_id:
                item['quantity'] = quantity  # 修改原字典
                break
```

### ✅ 好的做法

```python
from typing import NamedTuple, List

class CartItem(NamedTuple):
    id: str
    name: str
    price: int
    quantity: int

class ShoppingCart:
    def __init__(self, items: List[CartItem] = None):
        self._items = tuple(items or [])

    def add_item(self, item: CartItem) -> 'ShoppingCart':
        return ShoppingCart(self._items + (item,))

    def remove_item(self, item_id: str) -> 'ShoppingCart':
        return ShoppingCart([i for i in self._items if i.id != item_id])

    def update_quantity(self, item_id: str, quantity: int) -> 'ShoppingCart':
        new_items = [
            CartItem(i.id, i.name, i.price, quantity) if i.id == item_id else i
            for i in self._items
        ]
        return ShoppingCart(new_items)

    def get_total(self) -> int:
        return sum(item.price * item.quantity for item in self._items)

# 使用
cart = ShoppingCart()
cart = cart.add_item(CartItem(id="1", name="Item 1", price=10, quantity=1))
cart = cart.update_quantity("1", 2)
cart = cart.remove_item("1")
```

---

## 可测试性

### ❌ 不好的做法

```python
class OrderService:
    async def create_order(self, data: dict) -> dict:
        # 隐藏依赖
        db = Database('postgres://localhost')

        # 外部 API
        async with aiohttp.ClientSession() as session:
            await session.post('https://api.payment.com/charge', json=data)

        # 难以 mock
        email = SESEmailService()
        await email.send('order@company.com', 'Order created')

        return {}
```

### ✅ 好的做法

```python
# 通过接口定义依赖
class OrderRepository(ABC):
    @abstractmethod
    async def save(self, data: dict) -> dict:
        pass

class PaymentGateway(ABC):
    @abstractmethod
    async def charge(self, amount: int, currency: str) -> dict:
        pass

class NotificationService(ABC):
    @abstractmethod
    async def send_order_confirmation(self, order: dict) -> None:
        pass

# 服务实现
class OrderService:
    def __init__(self, repo: OrderRepository, gateway: PaymentGateway, notify: NotificationService):
        self.repo = repo
        self.gateway = gateway
        self.notify = notify

    async def create_order(self, data: dict) -> dict:
        order = await self.repo.save(data)
        await self.gateway.charge(order['total'], 'USD')

        try:
            await self.notify.send_order_confirmation(order)
        except Exception:
            pass

        return order
```

```python
# 测试
import pytest
from unittest.mock import AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_create_order():
    # Mock dependencies
    mock_repo = AsyncMock()
    mock_repo.save.return_value = {"id": "123", "total": 100}

    mock_gateway = AsyncMock()
    mock_gateway.charge.return_value = {"success": True}

    mock_notify = AsyncMock()

    service = OrderService(mock_repo, mock_gateway, mock_notify)
    result = await service.create_order({"items": []})

    mock_repo.save.assert_called_once()
    mock_gateway.charge.assert_called_once_with(100, "USD")
    mock_notify.send_order_confirmation.assert_called_once()
    assert result["id"] == "123"
```

---

## 相关资源

- [通用原则文档](../principles/README.md)
- [TypeScript 示例](../typescript/)
- [Go 示例](../golang/)
- [Rust 示例](../rust/)
- [Java 示例](../java/)

---

**维护者**: 架构团队
**最后更新**: 2026-01-12
