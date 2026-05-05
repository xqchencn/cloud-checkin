import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ApiHfSpacesCreateUser,
  ApiHfSpacesDeleteTarget,
  ApiHfSpacesPingTarget,
  ApiHfSpacesPreview,
  ApiHfSpacesRefreshUser,
  ApiHfSpacesTargets,
  ApiHfSpacesUpdateTarget,
  ApiHfSpacesUsers,
  HfSpacePreview,
  HfSpaceTarget,
  HfSpaceUserSummary
} from '../../api/apiHfSpaces'
import { useToast } from '../../toast'
import { SpaceCardGrid } from './HfSpaceCards'
import { HfSpacesHeaderActions, HfSpaceViewMode } from './HfSpacesHeaderActions'
import { HfSpacesMobileBar } from './HfSpacesMobileBar'
import { HfSpaceAddModal } from './HfSpacePreviewPanel'
import { readHfSpaceLayoutModePreference, readHfSpaceViewModePreference, saveHfSpaceLayoutModePreference, saveHfSpaceViewModePreference } from './hfSpacesPreferences'
import { HfSpacesSummaryCards } from './HfSpacesSummaryCards'
import { HfSpacesTopBar, HfSpaceLayoutMode, HfSpaceStatusFilter } from './HfSpacesTopBar'
import { HfSpacesUserSections } from './HfSpacesUserSections'
export function HfSpacesPage() {
  const toast = useToast()
  const [viewMode, setViewMode] = useState<HfSpaceViewMode>(readHfSpaceViewModePreference)
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<HfSpacePreview | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [keepaliveUrls, setKeepaliveUrls] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<HfSpaceUserSummary[]>([])
  const [targets, setTargets] = useState<HfSpaceTarget[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<HfSpaceStatusFilter>('all')
  const [userFilter, setUserFilter] = useState('all')
  const [layoutMode, setLayoutMode] = useState<HfSpaceLayoutMode>(readHfSpaceLayoutModePreference)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [headerActionRoot, setHeaderActionRoot] = useState<HTMLElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [userRows, targetRows] = await Promise.all([
        ApiHfSpacesUsers(),
        ApiHfSpacesTargets()
      ])
      setUsers(userRows)
      setTargets(targetRows)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'HF 保活数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setHeaderActionRoot(document.getElementById('hf-spaces-desktop-header-actions'))
  }, [])

  const filteredTargets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return targets.filter(target => {
      const matchesQuery = !query || [
        target.title,
        target.space_id,
        target.space_name,
        target.base_url,
        target.keepalive_url,
        target.username
      ].some(value => String(value || '').toLowerCase().includes(query))
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'running' && target.enabled)
        || (statusFilter === 'paused' && !target.enabled)
        || (statusFilter === 'failed' && target.last_status === 'failed')
      const matchesUser = userFilter === 'all' || String(target.hf_user_id) === userFilter
      return matchesQuery && matchesStatus && matchesUser
    })
  }, [searchQuery, statusFilter, targets, userFilter])

  function applyPreview(result: HfSpacePreview, checkedByDefault: boolean) {
    setPreview(result)
    setSelected(Object.fromEntries(result.spaces.filter(space => space.selectable).map(space => [space.space_id, checkedByDefault])))
    setKeepaliveUrls(Object.fromEntries(result.spaces.map(space => [space.space_id, space.default_keepalive_url])))
  }

  function openAddModal() {
    setInput('')
    setPreview(null)
    setSelected({})
    setKeepaliveUrls({})
    setAddOpen(true)
  }

  function changeViewMode(nextValue: HfSpaceViewMode) {
    setViewMode(nextValue)
    saveHfSpaceViewModePreference(nextValue)
  }

  function changeLayoutMode(nextValue: HfSpaceLayoutMode) {
    setLayoutMode(nextValue)
    saveHfSpaceLayoutModePreference(nextValue)
  }

  async function previewInput() {
    if (!input.trim()) {
      toast.error('请输入 Hugging Face 用户名或地址')
      return
    }
    setLoading(true)
    try {
      const result = await ApiHfSpacesPreview(input.trim())
      applyPreview(result, true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '识别失败')
    } finally {
      setLoading(false)
    }
  }

  async function savePreview() {
    if (!preview) return
    const selectedSpaces = preview.spaces
      .filter(space => selected[space.space_id])
      .map(space => ({ space_id: space.space_id, keepalive_url: keepaliveUrls[space.space_id] || space.default_keepalive_url }))
    setLoading(true)
    try {
      await ApiHfSpacesCreateUser(input.trim(), selectedSpaces)
      toast.success('HF 用户已保存')
      setPreview(null)
      setInput('')
      setAddOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  async function refreshUser(user: HfSpaceUserSummary) {
    setLoading(true)
    try {
      const result = await ApiHfSpacesRefreshUser(user.id)
      setInput(user.username)
      applyPreview(result, false)
      setAddOpen(true)
      toast.success('已更新 Space 列表')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    } finally {
      setLoading(false)
    }
  }

  async function toggleTarget(target: HfSpaceTarget, enabled: boolean) {
    setBusyId(target.id)
    try {
      await ApiHfSpacesUpdateTarget(target.id, { enabled })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    } finally {
      setBusyId(null)
    }
  }

  async function updateTargetMeta(target: HfSpaceTarget, payload: { alias: string; keepaliveUrl: string }) {
    setBusyId(target.id)
    try {
      await ApiHfSpacesUpdateTarget(target.id, { alias: payload.alias, keepalive_url: payload.keepaliveUrl })
      await load()
      toast.success('别名和保活地址已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '别名或地址更新失败')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteTarget(target: HfSpaceTarget) {
    if (target.enabled) {
      toast.error('请先停用该 HF Space，再删除')
      return
    }
    if (!window.confirm(`确定删除 ${target.space_id} 的 HF 保活目标？关联保活日志会一并删除。`)) return
    setBusyId(target.id)
    try {
      await ApiHfSpacesDeleteTarget(target.id)
      await load()
      toast.success('HF 保活目标已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setBusyId(null)
    }
  }

  async function batchEnableTargets() {
    setLoading(true)
    try {
      for (const target of targets) {
        if (!target.enabled) await ApiHfSpacesUpdateTarget(target.id, { enabled: true })
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '批量启用失败')
    } finally {
      setLoading(false)
    }
  }

  async function pingTarget(target: HfSpaceTarget) {
    setBusyId(target.id)
    try {
      await ApiHfSpacesPingTarget(target.id)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保活失败')
    } finally {
      setBusyId(null)
    }
  }

  const headerActions = (
    <HfSpacesHeaderActions
      viewMode={viewMode}
      loading={loading}
      hasTargets={Boolean(targets.length)}
      onViewModeChange={changeViewMode}
      onOpenAdd={openAddModal}
      onRefresh={() => void load()}
      onBatchEnable={() => void batchEnableTargets()}
    />
  )
  const topBarProps = {
    searchQuery,
    statusFilter,
    userFilter,
    layoutMode,
    users,
    onSearchChange: setSearchQuery,
    onStatusChange: setStatusFilter,
    onUserChange: setUserFilter,
    onLayoutModeChange: changeLayoutMode
  }
  const desktopHeaderControls = (
    <div className="flex min-w-0 items-center gap-2">
      <HfSpacesTopBar {...topBarProps} variant="header" />
      {headerActions}
    </div>
  )

  return (
    <section className="mt-4 space-y-4">
      {headerActionRoot ? createPortal(desktopHeaderControls, headerActionRoot) : null}
      <HfSpacesMobileBar searchQuery={searchQuery} headerActions={headerActions} onSearchChange={setSearchQuery} />
      <div className="hidden md:block xl:hidden"><HfSpacesTopBar {...topBarProps} /></div>
      <HfSpacesSummaryCards targets={targets} />

      {viewMode === 'all' ? (
        <SpaceCardGrid targets={filteredTargets} layoutMode={layoutMode} busyId={busyId} onToggle={toggleTarget} onPing={pingTarget} onUpdateUrl={updateTargetMeta} onDelete={deleteTarget} />
      ) : (
        <HfSpacesUserSections
          users={users}
          targets={filteredTargets}
          layoutMode={layoutMode}
          busyId={busyId}
          loading={loading}
          onRefreshUser={refreshUser}
          onToggle={toggleTarget}
          onPing={pingTarget}
          onUpdateUrl={updateTargetMeta}
          onDelete={deleteTarget}
        />
      )}

      <HfSpaceAddModal
        open={addOpen}
        input={input}
        preview={preview}
        selected={selected}
        keepaliveUrls={keepaliveUrls}
        saving={loading}
        onInputChange={setInput}
        onPreview={() => void previewInput()}
        onToggle={(spaceId, checked) => setSelected(current => ({ ...current, [spaceId]: checked }))}
        onKeepaliveUrlChange={(spaceId, value) => setKeepaliveUrls(current => ({ ...current, [spaceId]: value }))}
        onCancel={() => setAddOpen(false)}
        onSave={() => void savePreview()}
      />
    </section>
  )
}
