import { FormEvent, useState } from 'react'
import { AuthLogin } from '../../api/apiSite'
import { BrandMark } from '../../shared/ui'

export function LoginView({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await AuthLogin(password)
      onLoggedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={submit} className="soft-card w-full max-w-sm p-7">
        <input className="sr-only" name="username" type="text" autoComplete="username" value="cloud-checkin" readOnly tabIndex={-1} aria-hidden="true" />
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <h1 className="text-xl font-bold text-slate-950">Cloud Checkin</h1>
            <p className="mt-1 text-sm text-slate-500">输入访问密码进入站点管理。</p>
          </div>
        </div>
        <label className="label mt-6" htmlFor="password">访问密码</label>
        <input
          id="password"
          className="field"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoFocus
        />
        {error ? <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        <button className="btn btn-primary mt-5 w-full" disabled={loading || !password}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </main>
  )
}
