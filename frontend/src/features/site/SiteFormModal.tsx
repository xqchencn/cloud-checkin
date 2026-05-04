
import { FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff, Globe2, Search } from 'lucide-react'
import { ApiSite, ApiSiteDetect, SiteDetectResult, SiteFormPayload } from '../../api/apiSite'
import { AUTH_METHODS, EMPTY_FORM, SITE_TYPES } from '../../shared/constants'
import { normalizeFormSortOrder } from '../../shared/format'
import type { SiteFormState } from '../../shared/types'
import { ButtonIcon, DialogCard, ModalShell } from '../../shared/ui'

/**
 * 站点表单模态框组件
 * @param site - 站点对象
 * @param open - 是否打开
 * @param saving - 是否正在保存
 * @param onClose - 关闭回调
 * @param onSaved - 保存成功回调
 */
export function SiteFormModal({ site, open, saving, onClose, onSaved }: {
  site: ApiSite | null
  open: boolean
  saving: boolean
  onClose: () => void
  onSaved: (payload: SiteFormPayload) => Promise<void>
}) {
  const [form, setForm] = useState<SiteFormState>({ ...EMPTY_FORM })
  const [error, setError] = useState('')
  const [detectingSite, setDetectingSite] = useState(false)
  const [detectResult, setDetectResult] = useState<SiteDetectResult | null>(null)
  const [apiTypeTouched, setApiTypeTouched] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  /**
   * 初始化表单数据
   */
  useEffect(() => {
    if (!open) return
    setError('')
    setDetectResult(null)
    setShowLoginPassword(false)
    setApiTypeTouched(Boolean(site))
    setForm(site ? {
      name: site.name || '',
      url: site.url || '',
      api_type: site.api_type || 'NewApi',
      account_label: site.account_label || '',
      sort_order: String(site.sort_order ?? 0),
      auth_method: site.auth_method || 'sessions',
      auth_value: site.auth_value || '',
      user_id: site.user_id || '',
      login_username: site.login_username || '',
      login_password: site.login_password || '',
      enabled: site.enabled !== false,
      auto_checkin: site.auto_checkin !== false,
      remarks: site.remarks || '',
      checkin_endpoint: site.checkin_endpoint || ''
    } : { ...EMPTY_FORM })
  }, [open, site])

  if (!open) return null

  async function handleDetectSite() {
    const url = form.url.trim()
    if (!url) {
      setError('请先填写 URL')
      return
    }
    setDetectingSite(true)
    setError('')
    try {
      const result = await ApiSiteDetect({ url, fetchTitle: true, detectPreset: true })
      setDetectResult(result)
      setForm(current => ({
        ...current,
        name: current.name.trim() ? current.name : result.site_name,
        url: current.url.trim() === result.input_url.trim() ? result.url : current.url,
        api_type: !apiTypeTouched && !site && current.api_type === form.api_type ? result.api_type : current.api_type,
        account_label: current.account_label.trim() ? current.account_label : result.account_label_guess || current.account_label,
        checkin_endpoint: current.checkin_endpoint.trim() ? current.checkin_endpoint : result.default_checkin_endpoint
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '站点检测失败')
    } finally {
      setDetectingSite(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.url.trim()) {
      setError('名称和 URL 必填')
      return
    }
    // AnyRouter 用户名密码模式可能保留登录后的 token/cookie 作为失效前的首选凭证；
    // 保存表单不能把这类历史认证值清空，否则远端登录被盾挡住时会丢掉可用会话。
    const keepAnyRouterPasswordAuthValue = form.api_type === 'AnyRouter' && form.auth_method === 'password'
    await onSaved({
      ...form,
      name: form.name.trim(),
      url: form.url.trim(),
      account_label: form.account_label.trim(),
      sort_order: normalizeFormSortOrder(form.sort_order),
      auth_value: form.auth_method === 'token' || form.auth_method === 'sessions' || keepAnyRouterPasswordAuthValue ? form.auth_value.trim() : '',
      user_id: form.user_id.trim(),
      login_username: form.auth_method === 'password' ? form.login_username.trim() : '',
      login_password: form.auth_method === 'password' ? form.login_password : '',
      remarks: form.remarks.trim(),
      checkin_endpoint: form.checkin_endpoint.trim()
    })
  }

  return (
    <ModalShell>
      <form onSubmit={event => void submit(event)} className="w-full max-w-4xl">
        <DialogCard
          title={site ? '编辑站点' : '新增站点'}
          description="按当前选择的认证方式保存对应凭证；不会加密、替换或写入占位符。"
          icon={<Globe2 size={18} />}
          onClose={onClose}
          size="xl"
          footer={
            <>
              <button type="button" className="btn" onClick={onClose}>取消</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">URL</label>
              <div className="flex gap-2">
                <input className="field" value={form.url} placeholder="https://example.com" onChange={event => setForm({ ...form, url: event.target.value })} />
                <button type="button" className="btn shrink-0" disabled={detectingSite || !form.url.trim()} onClick={() => void handleDetectSite()}>
                  <ButtonIcon><Search size={16} /></ButtonIcon>{detectingSite ? '检测中' : '检测站点'}
                </button>
              </div>
            </div>
            <div>
              <label className="label">名称</label>
              <input className="field" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="label">API 类型</label>
              <select className="field" value={form.api_type} onChange={event => {
                setApiTypeTouched(true)
                setForm({ ...form, api_type: event.target.value })
              }}>
                {SITE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="label">账户标识</label>
              <input className="field" value={form.account_label} placeholder="同一 URL 多账号时用于区分" onChange={event => setForm({ ...form, account_label: event.target.value })} />
            </div>
            <div>
              <label className="label">排序</label>
              <input className="field" inputMode="numeric" value={form.sort_order} onChange={event => setForm({ ...form, sort_order: event.target.value })} />
            </div>
            <div>
              <label className="label">用户 ID</label>
              <input className="field" value={form.user_id} onChange={event => setForm({ ...form, user_id: event.target.value })} />
            </div>
            <div>
              <label className="label">认证方式</label>
              <select className="field" value={form.auth_method} onChange={event => setForm({ ...form, auth_method: event.target.value as SiteFormPayload['auth_method'] })}>
                {AUTH_METHODS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">签到端点（路径或完整 URL）</label>
              <input className="field" value={form.checkin_endpoint} placeholder="留空使用平台默认端点，可填 /api/user/checkin 或 https://example.com/checkin" onChange={event => setForm({ ...form, checkin_endpoint: event.target.value })} />
            </div>
            {form.auth_method === 'token' ? (
              <div className="md:col-span-2">
                <label className="label">访问 Token</label>
                <textarea className="field-area" value={form.auth_value} onChange={event => setForm({ ...form, auth_value: event.target.value })} />
              </div>
            ) : null}
            {form.auth_method === 'sessions' ? (
              <div className="md:col-span-2">
                <label className="label">Sessions / Cookie</label>
                <textarea className="field-area" value={form.auth_value} onChange={event => setForm({ ...form, auth_value: event.target.value })} />
              </div>
            ) : null}
            {form.auth_method === 'password' ? (
              <>
                <div>
                  <label className="label">登录用户名</label>
                  <input className="field" name="username" autoComplete="username" value={form.login_username} onChange={event => setForm({ ...form, login_username: event.target.value })} />
                </div>
                <div>
                  <label className="label">登录密码</label>
                  <div className="flex gap-2">
                    <input className="field" type={showLoginPassword ? 'text' : 'password'} autoComplete="current-password" value={form.login_password} onChange={event => setForm({ ...form, login_password: event.target.value })} />
                    <button type="button" className="btn-icon h-11 w-11 shrink-0" aria-label={showLoginPassword ? '隐藏登录密码' : '显示登录密码'} onClick={() => setShowLoginPassword(current => !current)}>
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            <div className="md:col-span-2">
              <label className="label">备注</label>
              <textarea className="field-area" value={form.remarks} onChange={event => setForm({ ...form, remarks: event.target.value })} />
            </div>
          </div>

          {detectResult ? (
            <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              <p className="font-medium">检测来源</p>
              <p className="mt-1">平台：{detectResult.api_type}（{detectResult.api_type_source}），名称：{detectResult.site_name}（{detectResult.site_name_source}），URL：{detectResult.url_action}</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2">
              <input type="checkbox" checked={form.enabled} onChange={event => setForm({ ...form, enabled: event.target.checked })} />
              启用站点
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2">
              <input type="checkbox" checked={form.auto_checkin} onChange={event => setForm({ ...form, auto_checkin: event.target.checked })} />
              启用自动签到
            </label>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        </DialogCard>
      </form>
    </ModalShell>
  )
}
