import { useEffect, useState } from 'react'
import { AuthLogout, AuthMe } from './api/apiSite'
import { AppExperience, LoginView } from './app/AppExperience'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    AuthMe()
      .then(result => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    await AuthLogout()
    setAuthenticated(false)
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">加载中...</div>
  }

  return authenticated ? <AppExperience onLogout={logout} /> : <LoginView onLoggedIn={() => setAuthenticated(true)} />
}
