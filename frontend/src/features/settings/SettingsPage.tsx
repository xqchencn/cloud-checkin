import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardList, LogOut, RotateCcw, Settings } from 'lucide-react'
import { ApiGetSettings, ApiUpdatePassword, ApiUpdateSettings, AppSettings, SettingItem } from '../../api/apiSite'
import { formatDate } from '../../shared/format'
import { ButtonIcon, ToneBadge } from '../../shared/ui'
import { coerceSettingPayloadValue, formatSettingDescription, normalizeAppSettings } from '../../shared/settings'
import { useToast } from '../../toast'

/**
 * 设置页面组件
 * @param onOpenLogs - 打开日志回调
 * @param onLogoutNow - 立即登出回调
 */
export function SettingsPage({ onOpenLogs, onLogoutNow }: {
  onOpenLogs: () => void
  onLogoutNow: () => void
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  /**
   * 加载设置
   */
  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSettings(normalizeAppSettings(await ApiGetSettings()))
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 初始化加载设置
   */
  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const groupedSettings = useMemo(() => {
    if (!settings) return []
    // 分组标题、说明和排序全部跟随接口返回，避免前端自己维护第二套设置文案。
    const categoryMeta = new Map(settings.categories.map(category => [category.key, category]))
    const sections = new Map<string, SettingItem[]>()
    settings.items.forEach(item => {
      const group = sections.get(item.category) || []
      group.push(item)
      sections.set(item.category, group)
    })

    return [...sections.entries()].map(([category, items]) => ({
      category,
      title: categoryMeta.get(category)?.title || category,
      description: categoryMeta.get(category)?.description || '',
      sort_order: categoryMeta.get(category)?.sort_order || Number.MAX_SAFE_INTEGER,
      items
    })).sort((left, right) => left.sort_order - right.sort_order)
  }, [settings])

  /**
   * 更新设置项
   * @param key - 设置键
   * @param value - 设置值
   */
  function updateSettingItem(key: string, value: string) {
    // 前端始终维护字符串态，提交时再按元数据类型转换，避免输入中途被数字/布尔格式打断。
    setSettings(current => current ? {
      ...current,
      items: current.items.map(item => item.key === key ? { ...item, value } : item)
    } : current)
  }

  /**
   * 保存设置
   * @param event - 表单事件
   */
  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    if (!settings) return
    setSaving(true)
    setError('')
    try {
      // 页面内部始终编辑字符串态，提交时再按每个设置项的元数据转换成后端期望的原始类型。
      const updated = await ApiUpdateSettings({
        values: Object.fromEntries(
          settings.items
            .filter(item => item.editable)
            .map(item => [item.key, coerceSettingPayloadValue(item)])
        )
      })
      setSettings(normalizeAppSettings(updated))
      toast.success('系统设置已保存')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存设置失败')
    } finally {
      setSaving(false)
    }
  }

  /**
   * 保存密码
   * @param event - 表单事件
   */
  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordSaving(true)
    setError('')
    try {
      await ApiUpdatePassword(newPassword, confirmPassword)
      toast.success('登录密码已更新，请重新登录')
      setNewPassword('')
      setConfirmPassword('')
      window.setTimeout(() => onLogoutNow(), 600)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '修改密码失败')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading && !settings) {
    return <section className="mt-6 soft-card px-4 py-10 text-center text-sm text-slate-500">设置加载中...</section>
  }

  if (!settings) {
    return (
      <section className="mt-6 soft-card p-5">
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <button className="btn mt-4" onClick={() => void loadSettings()}>重新加载</button>
      </section>
    )
  }

  return (
    <section className="mt-6 space-y-5">
      {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={saveSettings} className="space-y-5">
        <input className="sr-only" name="username" type="text" autoComplete="username" value="cloud-checkin" readOnly tabIndex={-1} aria-hidden="true" />
        <section className="page-section">
          <div className="section-header">
            <div>
              <h2 className="text-lg font-bold text-slate-950">数据库设置概览</h2>
              <p className="mt-1 text-sm text-slate-500">当前系统设置由数据库元数据驱动，表单项会按 `items + values` 同步展示与提交。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ToneBadge tone={settings.auth.database_password_configured ? 'success' : 'warning'}>
                {settings.auth.database_password_configured ? '数据库密码已配置' : '数据库密码未配置'}
              </ToneBadge>
              <ToneBadge tone="info">Cron 来源：wrangler.toml</ToneBadge>
            </div>
          </div>
          <div className="settings-overview-grid">
            <div className="setting-item-card h-full">
              <p className="text-sm font-semibold text-slate-800">密码状态</p>
              <p className="mt-2 text-sm text-slate-700">
                首次密码只用于初始化登录，不在页面明文显示。需要重置时请直接处理数据库或重新初始化本地数据。
              </p>
            </div>
            <div className="setting-item-card h-full">
              <p className="text-sm font-semibold text-slate-800">Cron 同步状态</p>
              <p className="mt-2 text-sm text-slate-700">
                Worker 由 Wrangler 管理时，Cron Triggers 只允许通过配置文件维护。当前页面只读显示，不允许在这里修改。
              </p>
            </div>
            <div className="setting-item-card h-full md:col-span-2 xl:col-span-1">
              <p className="text-sm font-semibold text-slate-800">当前设置项</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{settings.items.length}</p>
              <p className="mt-2 text-xs text-slate-500">其中可编辑 {settings.items.filter(item => item.editable).length} 项，分类 {groupedSettings.length} 组。</p>
            </div>
          </div>
        </section>

        {groupedSettings.map(section => (
          <section key={section.category} className="page-section">
            <div className="section-header">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{section.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{section.description}</p>
              </div>
              <ToneBadge tone="info">{`${section.items.length} 项`}</ToneBadge>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {section.items.map(item => (
                <div key={item.key} className={item.type === 'boolean' ? '' : 'setting-item-card'}>
                  {item.type === 'boolean' ? (
                    <label className="setting-boolean-card">
                      <div>
                        <span className="label mb-2">{item.label}</span>
                        <p className="text-sm text-slate-700">{item.description}</p>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={item.value === 'true'}
                          disabled={!item.editable}
                          onChange={event => updateSettingItem(item.key, String(event.target.checked))}
                        />
                        {item.value === 'true' ? '已启用' : '已关闭'}
                      </span>
                    </label>
                  ) : (
                    <>
                      <input
                        className={`field ${item.type === 'cron' ? 'font-mono' : ''}`}
                        type={item.type === 'number' ? 'number' : item.type === 'secret' ? 'password' : 'text'}
                        autoComplete={item.type === 'secret' ? 'off' : undefined}
                        min={item.options?.min}
                        max={item.options?.max}
                        step={item.options?.step}
                        placeholder={item.options?.placeholder}
                        value={item.value}
                        disabled={!item.editable}
                        onChange={event => updateSettingItem(item.key, event.target.value)}
                      />
                      <label className="label mt-3">{item.label}</label>
                      <p className="text-xs text-slate-500">{formatSettingDescription(item)}</p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        键名：{item.key}
                        {item.updated_at ? ` · 最近更新：${formatDate(item.updated_at)}` : ''}
                        {!item.editable ? ' · 当前为只读项' : ''}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="setting-action-bar">
          <button className="btn" type="button" onClick={onOpenLogs}><ClipboardList size={16} />查看日志</button>
          <button className="btn" type="button" onClick={() => void loadSettings()} disabled={loading}><RotateCcw size={16} />重新加载</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存系统设置'}</button>
        </div>
      </form>

      <form onSubmit={savePassword} className="page-section">
        <input className="sr-only" name="username" type="text" autoComplete="username" value="cloud-checkin" readOnly tabIndex={-1} aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-950">修改登录密码</h2>
        <p className="mt-1 text-sm text-slate-500">保存后会写入 D1 哈希，并退出当前会话让新密码生效。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">新密码</label>
            <input className="field" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
          </div>
          <div>
            <label className="label">确认新密码</label>
            <input className="field" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="btn btn-primary" disabled={passwordSaving || !newPassword || !confirmPassword}>
            {passwordSaving ? '保存中...' : '保存密码并重新登录'}
          </button>
        </div>
      </form>
    </section>
  )
}
