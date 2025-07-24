import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import StructuredData from '@site/src/components/StructuredData';

import styles from './index.module.css';
import Translate, {translate} from '@docusaurus/Translate';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">
          <Translate
            id="homepage.tagline"
            description="The tagline of the website">
            基于原生 fetch API 的现代化 HTTP 请求库
          </Translate>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            {/* Docusaurus Tutorial - 5min ⏱️ */}
              <Translate
                id="home.get-started"
                description="The label of the button to get started">
                快速开始
              </Translate>
            </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  const pageTitle = translate({
    id: 'homepage.title',
    message: 'Hook-Fetch - 现代化 HTTP 请求库',
    description: 'The title of the homepage',
  });

  const pageDescription = translate({
    id: 'homepage.description',
    message: '基于原生 fetch API 的现代化 HTTP 请求库，支持流式处理、请求取消、插件系统。为 React 和 Vue 提供专门的 Hooks。零依赖，TypeScript 优先。',
    description: 'The description of the homepage',
  });

  return (
    <Layout
      title={pageTitle}
      description={pageDescription}>

      {/* 结构化数据 */}
      <StructuredData
        type="WebSite"
        title={pageTitle}
        description={pageDescription}
        url={siteConfig.url + siteConfig.baseUrl}
      />

      {/* 软件应用结构化数据 */}
      <StructuredData
        type="SoftwareApplication"
        title="Hook-Fetch"
        description={pageDescription}
        url={siteConfig.url + siteConfig.baseUrl}
      />

      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
