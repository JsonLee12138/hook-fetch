import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Hook-Fetch',
  tagline: '基于原生 fetch API 的现代化 HTTP 请求库',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://jsonlee12138.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/hook-fetch/',

  // GitHub Pages 配置
  trailingSlash: true, // 修复 GitHub Pages 警告

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'JsonLee12138', // Usually your GitHub org/user name.
  projectName: 'hook-fetch', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans', 'en'],
    localeConfigs: {
      'zh-Hans': {
        label: '简体中文',
        direction: 'ltr',
        htmlLang: 'zh-CN',
      },
      'en': {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en-US',
        path: 'en',
      },
    },
  },

  // SEO 插件配置 - sitemap已在preset中配置，无需重复
  // plugins: [],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          //   'https://github.com/JsonLee12138/hook-fetch/tree/main/apps/hook-fetch-docs/',

          // SEO 优化
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        // blog: {
        //   showReadingTime: true,
        //   feedOptions: {
        //     type: ['rss', 'atom'],
        //     xslt: true,
        //   },
        //   // Please change this to your repo.
        //   // Remove this to remove the "edit this page" links.
        //   editUrl:
        //     'https://github.com/JsonLee12138/hook-fetch/tree/main/apps/hook-fetch-docs/',
        //   // Useful options to enforce blogging best practices
        //   onInlineTags: 'warn',
        //   onInlineAuthors: 'warn',
        //   onUntruncatedBlogPosts: 'warn',
        // },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // SEO 元数据配置
    metadata: [
      {
        name: 'keywords',
        content: 'fetch, http, request, javascript, typescript, react hooks, vue hooks, streaming, abort controller, plugin system, 请求库',
      },
      {
        name: 'description',
        content: '现代化的 HTTP 请求库，基于原生 fetch API，支持流式处理、请求取消、插件系统，为 React 和 Vue 提供专门的 Hooks。零依赖，TypeScript 优先。',
      },
      {
        name: 'author',
        content: 'JsonLee12138',
      },
      {
        name: 'robots',
        content: 'index, follow',
      },
      {
        name: 'googlebot',
        content: 'index, follow',
      },
      // Open Graph
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:title',
        content: 'Hook-Fetch - 现代化 HTTP 请求库',
      },
      {
        property: 'og:description',
        content: '基于原生 fetch API 的现代化 HTTP 请求库，支持流式处理、请求取消、插件系统。为 React 和 Vue 提供专门的 Hooks。',
      },
      {
        property: 'og:site_name',
        content: 'Hook-Fetch Documentation',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Hook-Fetch - 现代化 HTTP 请求库',
      },
      {
        name: 'twitter:description',
        content: '基于原生 fetch API 的现代化 HTTP 请求库，支持流式处理、请求取消、插件系统。',
      },
      // 技术相关标签
      {
        name: 'application-name',
        content: 'Hook-Fetch Documentation',
      },
      {
        name: 'msapplication-TileColor',
        content: '#10b981',
      },
      {
        name: 'theme-color',
        content: '#10b981',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      },
    ],

    navbar: {
      title: 'Hook-Fetch',
      logo: {
        alt: 'Hook-Fetch Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档',
        },
        // { to: '/blog', label: '博客', position: 'left' },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          position: 'right',
          label: '更新日志',
          docId: 'changelogs',
          to: '/docs/changelogs',
        },
        {
          href: 'https://www.npmjs.com/package/hook-fetch',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/JsonLee12138/hook-fetch',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://deepwiki.com/JsonLee12138/hook-fetch',
          label: 'DeepWiki',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '快速开始',
              to: '/docs/intro',
            },
            {
              label: 'API 参考',
              to: '/docs/api-reference',
            },
            {
              label: '插件系统',
              to: '/docs/plugins',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/JsonLee12138/hook-fetch/issues',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/JsonLee12138/hook-fetch/discussions',
            },
            {
              label: 'Discord',
              href: 'https://discord.com/invite/666U6JTCQY',
            },
            {
              label: 'QQ社区',
              href: 'https://pd.qq.com/s/fjwy3eo20?b=9',
            },
          ],
        },
        {
          title: '更多',
          items: [
            // {
            //   label: '博客',
            //   to: '/blog',
            // },
            {
              label: 'GitHub',
              href: 'https://github.com/JsonLee12138/hook-fetch',
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/hook-fetch',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Hook-Fetch. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['typescript', 'javascript', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
