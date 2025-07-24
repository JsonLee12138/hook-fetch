import React from 'react';
import Head from '@docusaurus/Head';

interface StructuredDataProps {
  type?: 'WebSite' | 'Organization' | 'SoftwareApplication';
  title?: string;
  description?: string;
  url?: string;
}

const StructuredData: React.FC<StructuredDataProps> = ({
  type = 'WebSite',
  title = 'Hook-Fetch Documentation',
  description = '基于原生 fetch API 的现代化 HTTP 请求库，支持流式处理、请求取消、插件系统。',
  url = 'https://jsonlee12138.github.io/hook-fetch/'
}) => {
  const getStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": type,
      "name": title,
      "description": description,
      "url": url,
    };

    switch (type) {
      case 'SoftwareApplication':
        return {
          ...baseData,
          "@type": "SoftwareApplication",
          "applicationCategory": "DeveloperApplication",
          "operatingSystem": "Any",
          "programmingLanguage": ["JavaScript", "TypeScript"],
          "downloadUrl": "https://www.npmjs.com/package/hook-fetch",
          "codeRepository": "https://github.com/JsonLee12138/hook-fetch",
          "license": "MIT",
          "author": {
            "@type": "Person",
            "name": "JsonLee12138",
            "url": "https://github.com/JsonLee12138"
          },
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        };

      case 'Organization':
        return {
          ...baseData,
          "@type": "Organization",
          "logo": url + "img/logo.svg",
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "technical support",
            "url": "https://github.com/JsonLee12138/hook-fetch/issues"
          }
        };

      default: // WebSite
        return {
          ...baseData,
          "@type": "WebSite",
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": url + "search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Hook-Fetch",
            "url": url
          }
        };
    }
  };

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(getStructuredData(), null, 2)}
      </script>
    </Head>
  );
};

export default StructuredData;
