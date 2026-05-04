import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { ToastProvider } from './toast'

/**
 * 应用程序入口点
 * 渲染 React 应用到 DOM 根节点
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
)
