# Hook-Fetch Documentation

[![CI](https://github.com/JsonLee12138/hook-fetch-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/JsonLee12138/hook-fetch-docs/actions/workflows/ci.yml)
[![Deploy](https://github.com/JsonLee12138/hook-fetch-docs/actions/workflows/deploy.yml/badge.svg)](https://github.com/JsonLee12138/hook-fetch-docs/actions/workflows/deploy.yml)

基于原生 fetch API 的现代化 HTTP 请求库官方文档站点。

## 🌐 在线访问

- **中文文档**: https://jsonlee12138.github.io/hook-fetch-docs/
- **English Docs**: https://jsonlee12138.github.io/hook-fetch-docs/en/

## 🚀 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
# 启动中文版本
npm start

# 启动英文版本
npm run start:en
```

开发服务器将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

构建结果将生成在 `build` 目录中。

### deploy

```bash
USE_SSH=true npm run deploy
```

### 本地预览构建结果

```bash
npm run preview
```

## 📝 内容编辑

### 文档结构

```
docs/
├── intro.md              # 介绍页面
├── getting-started.md     # 快速开始
├── api-reference.md       # API 参考
├── best-practices.md      # 最佳实践
├── framework-integration.md # 框架集成
├── plugins.md             # 插件系统
├── streaming.md           # 流式处理
├── examples/              # 示例
│   └── chat-application.md
├── reference/             # 参考资料
│   └── faq.md
└── changelogs/            # 更新日志
    └── index.md
```

### 多语言支持

本文档站点支持中英文双语：

- **中文内容**: 直接编辑 `docs/` 目录下的文件
- **英文内容**: 编辑 `i18n/en/docusaurus-plugin-content-docs/current/` 目录下的对应文件
- **界面翻译**: 编辑 `i18n/zh-Hans/code.json` 和 `i18n/en/code.json`

### 添加新页面

1. 在 `docs/` 目录下创建新的 Markdown 文件
2. 在 `sidebars.ts` 中添加页面配置
3. 如需多语言支持，在对应的 `i18n/` 目录下创建翻译文件

## 🔧 配置

主要配置文件：

- `docusaurus.config.ts` - Docusaurus 主配置
- `sidebars.ts` - 侧边栏配置
- `src/css/custom.css` - 自定义样式
- `i18n/` - 国际化翻译文件

## 🚀 部署

### 自动部署

推送到 `main` 分支时，GitHub Actions 会自动构建和部署到 GitHub Pages。

### 手动部署

```bash
# 使用 GitHub Personal Access Token
GIT_USER=JsonLee12138 GIT_PASS=your_github_token npm run deploy

# 或者设置环境变量后
npm run deploy:manual
```

详细部署指南请参考：[部署文档](./docs/deployment.md)

## 📦 技术栈

- **框架**: [Docusaurus 3](https://docusaurus.io/)
- **语言**: TypeScript
- **样式**: CSS Modules
- **部署**: GitHub Pages
- **CI/CD**: GitHub Actions

## 🤝 贡献

欢迎贡献文档内容！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/new-docs`)
3. 提交更改 (`git commit -am 'Add new documentation'`)
4. 推送到分支 (`git push origin feature/new-docs`)
5. 创建 Pull Request

### 贡献指南

- 确保新增或修改的内容同时提供中英文版本
- 运行 `npm run ci` 确保构建通过
- 遵循现有的文档风格和格式

## 📄 许可证

本文档站点基于 MIT 许可证开源。

## 🔗 相关链接

- **Hook-Fetch 库**: https://github.com/JsonLee12138/hook-fetch
- **npm 包**: https://www.npmjs.com/package/hook-fetch
- **Issues**: https://github.com/JsonLee12138/hook-fetch/issues
- **Discussions**: https://github.com/JsonLee12138/hook-fetch/discussions
