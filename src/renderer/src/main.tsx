import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import 'antd/dist/reset.css';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Renderer root element not found.');
}

// antd 组件自带文案（分页的每页条数/跳页等）默认是英文，统一切到简体中文
createRoot(root).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
