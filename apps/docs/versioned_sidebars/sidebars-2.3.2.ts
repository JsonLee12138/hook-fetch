import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'getting-started',
    'api-reference',
    'plugins',
    'streaming',
    'framework-integration',
    'best-practices',
    {
      type: 'category',
      label: '示例',
      items: [
        'examples/chat-application',
      ],
    },
    {
      type: 'category',
      label: '参考',
      items: [
        'reference/faq',
      ],
    },
  ],
};

export default sidebars;
