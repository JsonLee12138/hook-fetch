import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import Translate, {translate} from '@docusaurus/Translate';

type FeatureItem = {
  title: string;
  Icon: ReactNode;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: translate({
      id: 'homepage.features.streaming.title',
      message: '流式处理',
      description: 'The title of streaming feature',
    }),
    Icon: (
      <div className={styles.featureIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
    ),
    description: (
      <Translate
        id="homepage.features.streaming.description"
        description="The description of streaming feature">
        原生支持流式响应处理，实时获取数据流，完美适配 AI 聊天场景，支持 Server-Sent Events 和自定义流处理器。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.abort.title',
      message: '请求取消',
      description: 'The title of request abort feature',
    }),
    Icon: (
      <div className={styles.featureIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
        </svg>
      </div>
    ),
    description: (
      <Translate
        id="homepage.features.abort.description"
        description="The description of request abort feature">
        内置 AbortController 支持，轻松取消请求，避免内存泄漏。支持超时控制、重复请求取消和组件卸载时自动清理。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.plugins.title',
      message: '插件系统',
      description: 'The title of plugin system feature',
    }),
    Icon: (
      <div className={styles.featureIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    ),
    description: (
      <Translate
        id="homepage.features.plugins.description"
        description="The description of plugin system feature">
        强大的插件架构，支持请求/响应拦截器、缓存、重试、认证等功能。轻松扩展，满足各种业务场景需求。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.hooks.title',
      message: 'React & Vue Hooks',
      description: 'The title of hooks support feature',
    }),
    Icon: (
      <div className={styles.featureIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8.5 16L12 13.5 15.5 16 12 18.5 8.5 16z"/>
        </svg>
      </div>
    ),
    description: (
      <Translate
        id="homepage.features.hooks.description"
        description="The description of hooks support feature">
        为 React 和 Vue 提供专门的 Hooks，简化状态管理。自动处理加载状态、错误处理和数据缓存，提升开发效率。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.typescript.title',
      message: 'TypeScript 优先',
      description: 'The title of TypeScript support feature',
    }),
    Icon: (
      <div className={styles.featureIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </div>
    ),
    description: (
      <Translate
        id="homepage.features.typescript.description"
        description="The description of TypeScript support feature">
        完整的 TypeScript 类型支持，提供智能提示和类型安全。从请求到响应的完整类型推导，减少运行时错误。
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.features.performance.title',
      message: '高性能轻量',
      description: 'The title of performance feature',
    }),
    Icon: (
      <div className={styles.featureIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          <circle cx="9.5" cy="9.5" r="2.5"/>
        </svg>
      </div>
    ),
    description: (
      <Translate
        id="homepage.features.performance.description"
        description="The description of performance feature">
        基于原生 fetch API，零依赖设计，包体积小。支持 Tree Shaking，按需加载，不影响应用性能。
      </Translate>
    ),
  },
];

function Feature({title, Icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--6 col--lg-4', styles.feature)}>
      <div className="text--center">
        {Icon}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
