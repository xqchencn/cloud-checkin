import { useEffect, useState } from 'react'
import { AuthLogout, AuthMe } from './api/apiSite'
import { AppExperience, LoginView } from './app/AppExperience'

/**
 * 应用程序根组件
 * 处理认证状态和路由渲染
 */
export default function App() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  /**
   * 检查用户认证状态
   */
  useEffect(() => {
    AuthMe()
      .then(result => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false))
  }, [])

  /**
   * 用户登出处理
   */
  async function logout() {
    await AuthLogout()
    setAuthenticated(false)
  }

  /**
   * 加载中状态渲染
   */
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">加载中...</div>
  }

  /**
   * 根据认证状态渲染不同视图
   */
  return authenticated ? <AppExperience onLogout={logout} /> : <LoginView onLoggedIn={() => setAuthenticated(true)} />
}
