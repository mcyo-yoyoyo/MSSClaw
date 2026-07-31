import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
/** 须先于 sessionStore：自定义部门/区域字典灌入后再 normalize 归属 */
import '@/stores/orgTaxonomyStore';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
