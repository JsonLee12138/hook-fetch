# 软件架构设计文档体系

> **版本**: 2.0
> **状态**: 已批准
> **最后更新**: 2026-01-12

---

## 📚 文档导航

### 1. 编码规则文档 ⚡

**路径**: `RULES.md`

**强制性要求**: 所有代码编写任务必须遵循此文档。

包含：

- ✅ 10 大设计原则的强制应用
- ✅ 必须调用 `@architecture-assistant` 技能
- ✅ 标准工作流程（设计→编码→审查→文档）
- ✅ 检查清单和质量标准
- ✅ 违规处理和培训要求

**关键规则**:

```
1. 所有代码必须遵循 10 大设计原则
2. 所有代码编写必须调用架构技能
3. 重要决策必须创建 ADR
```

**适用**: 所有代码编写任务（强制）

---

### 2. 核心原则文档

**路径**: `principles/README.md`

这是架构设计的核心指南，包含：

- 10 大设计原则（无语言特定）
- 质量属性（性能、安全、可扩展性等）
- 技术指南（API、数据库、前端）
- 决策框架
- 反模式识别
- 实施检查清单

**适用**: 所有团队成员，所有项目

---

### 2. 多语言代码示例

**路径**: `examples/`

每个语言包含完整的代码示例，展示如何在该语言中应用设计原则。

#### TypeScript

**路径**: `examples/typescript/README.md`

包含以下原则的代码示例：

- ✅ SoC - 关注点分离
- ✅ SRP - 单一职责原则
- ✅ DRY - 不重复自己
- ✅ KISS - 保持简单
- ✅ 组合优于继承
- ✅ 高内聚低耦合
- ✅ 显式依赖
- ✅ 快速失败
- ✅ 不可变性
- ✅ 可测试性

**特点**:

- 使用接口和类型系统
- 依赖注入模式
- 异步/await 处理
- TypeScript 特定的最佳实践

---

#### Go

**路径**: `examples/golang/README.md`

包含以下原则的代码示例：

- ✅ SoC - 关注点分离
- ✅ SRP - 单一职责原则
- ✅ DRY - 不重复自己
- ✅ KISS - 保持简单
- ✅ 组合优于继承
- ✅ 高内聚低耦合
- ✅ 显式依赖
- ✅ 快速失败
- ✅ 不可变性
- ✅ 可测试性

**特点**:

- 接口和组合模式
- 错误处理最佳实践
- 并发安全考虑
- Go 特定的惯用法

---

#### Rust

**路径**: `examples/rust/README.md`

包含以下原则的代码示例：

- ✅ SoC - 关注点分离
- ✅ SRP - 单一职责原则
- ✅ DRY - 不重复自己
- ✅ KISS - 保持简单
- ✅ 组合优于继承
- ✅ 高内聚低耦合
- ✅ 显式依赖
- ✅ 快速失败
- ✅ 不可变性
- ✅ 可测试性

**特点**:

- Trait 和泛型编程
- 所有权和借用
- 模式匹配
- 错误处理（Result/Option）
- Rust 特定的安全保证

---

#### Python

**路径**: `examples/python/README.md`

包含以下原则的代码示例：

- ✅ SoC - 关注点分离
- ✅ SRP - 单一职责原则
- ✅ DRY - 不重复自己
- ✅ KISS - 保持简单
- ✅ 组合优于继承
- ✅ 高内聚低耦合
- ✅ 显式依赖
- ✅ 快速失败
- ✅ 不可变性
- ✅ 可测试性

**特点**:

- 抽象基类和协议
- 依赖注入模式
- 异步/await
- Pythonic 代码风格

---

#### Java

**路径**: `examples/java/README.md`

包含以下原则的代码示例：

- ✅ SoC - 关注点分离
- ✅ SRP - 单一职责原则
- ✅ DRY - 不重复自己
- ✅ KISS - 保持简单
- ✅ 组合优于继承
- ✅ 高内聚低耦合
- ✅ 显式依赖
- ✅ 快速失败
- ✅ 不可变性
- ✅ 可测试性

**特点**:

- 接口和依赖注入
- Spring 框架模式
- Java 8+ 特性
- JUnit/Mockito 测试

---

### 3. 模板文档

**路径**: `templates/`

用于项目初始化和文档创建。

- `principles-template.md` - 项目原则模板
- `adr-template.md` - 架构决策记录模板

---

### 4. ADR 文档

**路径**: `adrs/`

架构决策记录，记录重要的技术选择。

- `README.md` - ADR 索引和指南
- `EXAMPLE-ADR-001.md` - 完整示例

---

### 5. Claude Code 技能

**路径**: `skills/SKILL.md`

即用型架构技能，集成到 Claude Code 中。

**功能**:

- 🎯 智能代码架构审查
- 📝 自动 ADR 文档生成
- 💡 多语言设计指导
- 🎓 原则解释和示例
- 🔍 代码质量分析

**使用方式**:

```bash
# 方法 1: 直接调用技能
@architecture-assistant 你的问题

# 方法 2: 描述需求
"使用架构技能审查这段代码..."
"帮我创建一个 ADR..."
"解释这个设计原则..."
```

**适用场景**:

- 代码审查和架构评估
- 新功能设计指导
- 技术决策文档化
- 团队培训和知识分享
- 实时架构咨询

---

## 🎯 使用指南

### 场景 1: 学习和培训

```
步骤 1: 阅读核心原则
   └─> architecture/principles/README.md

步骤 2: 选择你的语言
   ├─> TypeScript: architecture/examples/typescript/README.md
   ├─> Go: architecture/examples/golang/README.md
   ├─> Rust: architecture/examples/rust/README.md
   ├─> Python: architecture/examples/python/README.md
   └─> Java: architecture/examples/java/README.md

步骤 3: 实践应用
   └─> 在实际项目中应用原则
```

### 场景 2: 代码审查

```
1. 打开核心原则文档
   architecture/principles/README.md

2. 参考对应语言示例
   architecture/examples/[language]/README.md

3. 使用检查清单
   architecture/principles/README.md#实施检查清单
```

### 场景 3: 技术决策

```
1. 理解原则
   architecture/principles/README.md

2. 创建 ADR
   cp templates/adr-template.md adrs/ADR-XXX.md

3. 参考示例
   adrs/EXAMPLE-ADR-001.md
```

### 场景 4: 新项目启动

```
1. 复制原则模板
   cp templates/principles-template.md [project-root]/ARCHITECTURE.md

2. 根据项目调整
   - 删除不适用的原则
   - 添加项目特定约束
   - 团队讨论并共识

3. 建立审查流程
   - PR 模板包含检查项
   - 定期架构评审
```

---

## 📊 文档结构总览

```
architecture/
├── README.md                          # 本文档 - 总入口
├── RULES.md                           # 编码规则（强制）
│
├── principles/
│   └── README.md                      # 核心原则（通用，无代码）
│
├── examples/
│   ├── typescript/
│   │   └── README.md                  # TypeScript 示例
│   ├── golang/
│   │   └── README.md                  # Go 示例
│   ├── rust/
│   │   └── README.md                  # Rust 示例
│   ├── python/
│   │   └── README.md                  # Python 示例
│   └── java/
│       └── README.md                  # Java 示例
│
├── templates/
│   ├── principles-template.md         # 项目原则模板
│   └── adr-template.md                # ADR 模板
│
├── adrs/
│   ├── README.md                      # ADR 索引和指南
│   └── EXAMPLE-ADR-001.md             # ADR 示例
│
└── skills/
    └── SKILL.md                       # Claude Code 技能
```

---

## 🔍 快速查找

### 按使用场景

| 场景         | 路径/命令                          | 说明               |
| ------------ | ---------------------------------- | ------------------ |
| **编码规则** | `RULES.md`                         | **强制性编码要求** |
| 学习原则     | `principles/README.md`             | 阅读核心设计原则   |
| 查看示例     | `examples/[语言]/README.md`        | 多语言代码示例     |
| 创建项目     | `templates/principles-template.md` | 项目原则模板       |
| 记录决策     | `templates/adr-template.md`        | ADR 模板           |
| 代码审查     | `@architecture-assistant`          | 智能架构审查       |
| 设计指导     | `@architecture-assistant`          | 实时设计咨询       |
| ADR 文档     | `@architecture-assistant`          | 自动 ADR 生成      |

### 按原则查找

| 原则      | TypeScript                                         | Go                                             | Rust                                         | Python                                         | Java                                         |
| --------- | -------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| SoC       | [查看](examples/typescript/README.md#soc)          | [查看](examples/golang/README.md#soc)          | [查看](examples/rust/README.md#soc)          | [查看](examples/python/README.md#soc)          | [查看](examples/java/README.md#soc)          |
| SRP       | [查看](examples/typescript/README.md#srp)          | [查看](examples/golang/README.md#srp)          | [查看](examples/rust/README.md#srp)          | [查看](examples/python/README.md#srp)          | [查看](examples/java/README.md#srp)          |
| DRY       | [查看](examples/typescript/README.md#dry)          | [查看](examples/golang/README.md#dry)          | [查看](examples/rust/README.md#dry)          | [查看](examples/python/README.md#dry)          | [查看](examples/java/README.md#dry)          |
| KISS      | [查看](examples/typescript/README.md#kiss)         | [查看](examples/golang/README.md#kiss)         | [查看](examples/rust/README.md#kiss)         | [查看](examples/python/README.md#kiss)         | [查看](examples/java/README.md#kiss)         |
| 组合      | [查看](examples/typescript/README.md#组合)         | [查看](examples/golang/README.md#组合)         | [查看](examples/rust/README.md#组合)         | [查看](examples/python/README.md#组合)         | [查看](examples/java/README.md#组合)         |
| 内聚/耦合 | [查看](examples/typescript/README.md#高内聚低耦合) | [查看](examples/golang/README.md#高内聚低耦合) | [查看](examples/rust/README.md#高内聚低耦合) | [查看](examples/python/README.md#高内聚低耦合) | [查看](examples/java/README.md#高内聚低耦合) |
| 显式依赖  | [查看](examples/typescript/README.md#显式依赖)     | [查看](examples/golang/README.md#显式依赖)     | [查看](examples/rust/README.md#显式依赖)     | [查看](examples/python/README.md#显式依赖)     | [查看](examples/java/README.md#显式依赖)     |
| 快速失败  | [查看](examples/typescript/README.md#快速失败)     | [查看](examples/golang/README.md#快速失败)     | [查看](examples/rust/README.md#快速失败)     | [查看](examples/python/README.md#快速失败)     | [查看](examples/java/README.md#快速失败)     |
| 不可变性  | [查看](examples/typescript/README.md#不可变性)     | [查看](examples/golang/README.md#不可变性)     | [查看](examples/rust/README.md#不可变性)     | [查看](examples/python/README.md#不可变性)     | [查看](examples/java/README.md#不可变性)     |
| 可测试性  | [查看](examples/typescript/README.md#可测试性)     | [查看](examples/golang/README.md#可测试性)     | [查看](examples/rust/README.md#可测试性)     | [查看](examples/python/README.md#可测试性)     | [查看](examples/java/README.md#可测试性)     |

---

## 🚀 快速开始

### 作为开发者

```bash
# 1. 阅读编码规则（必须）[20分钟]
cat architecture/RULES.md

# 2. 阅读核心原则（30分钟）
cat architecture/principles/README.md

# 3. 查看你使用的语言示例（15分钟）
cat architecture/examples/typescript/README.md  # 或其他语言

# 4. 在下一个任务中应用
# - 编写代码前调用 @architecture-assistant
# - 编写代码后调用 @architecture-assistant 审查
# - 遵循 10 大设计原则
# - 提交 PR 前使用检查清单
```

### 作为技术负责人

```bash
# 1. 组织团队学习
# - 安排 1 小时分享会
# - 讨论原则的适用性
# - 收集团队反馈

# 2. 建立审查流程
# - PR 模板中加入检查项
# - 代码审查必须包含架构检查
# - 重要决策必须创建 ADR

# 3. 持续改进
# - 每季度回顾文档
# - 收集实际案例
# - 更新最佳实践
```

### 作为架构师

```bash
# 1. 重要决策流程
# - 识别决策点
# - 创建 ADR 草案
# - 组织评审
# - 记录并沟通

# 2. 文档维护
# - 定期审查原则
# - 更新模板
# - 分享经验

# 3. 指导团队
# - 解答疑问
# - 审查设计
# - 培训新人
```

### 使用 Claude Code 技能

```bash
# 1. 代码审查
@architecture-assistant 请审查这段代码是否符合架构原则

# 2. 设计指导
@architecture-assistant 帮我设计一个用户认证系统（Go语言）

# 3. ADR 创建
@architecture-assistant 为数据库选型决策创建 ADR

# 4. 原则学习
@architecture-assistant 解释组合优于继承原则

# 5. 实时咨询
@architecture-assistant 这个设计有什么潜在问题？
```

---

## 📖 相关资源

### 内部文档

- [项目章程](../.specify/memory/constitution.md)
- [特征规范模板](../.specify/templates/spec-template.md)
- [实施计划模板](../.specify/templates/plan-template.md)

### 外部参考

- [Clean Architecture](https://blog.cleancoder.com/)
- [Design Patterns](https://refactoring.guru/)
- [Google Engineering Practices](https://google.github.io/eng-practices/)
- [The Pragmatic Programmer](https://pragprog.com/)

---

## 🤝 贡献指南

欢迎贡献！请遵循：

1. **提出建议**
   - 创建 Issue 或 PR
   - 说明改进理由
   - 提供示例

2. **文档格式**
   - 使用 Markdown
   - 保持结构清晰
   - 添加变更记录

3. **团队讨论**
   - 技术评审
   - 达成共识
   - 更新文档

---

## 📞 联系方式

- **架构团队**: architecture@company.com
- **文档维护**: docs@company.com
- **技术负责人**: tech-lead@company.com

---

## 📅 维护计划

| 活动       | 频率       | 负责人     |
| ---------- | ---------- | ---------- |
| 文档审查   | 每季度     | 架构团队   |
| 新语言示例 | 按需       | 语言专家   |
| ADR 审查   | 每月       | 技术负责人 |
| 团队培训   | 新成员入职 | 架构团队   |

---

**版本**: 2.0
**创建日期**: 2026-01-12
**维护者**: 架构团队
**状态**: ✅ 已完成
