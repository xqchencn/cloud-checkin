import { jsonError, jsonOk, readJson } from '../response'
import { hfSpaceService } from '../services/hf-space-service'
import type { Env } from '../types'

function idFromPath(pathname: string, pattern: RegExp): number | null {
  const match = pathname.match(pattern)
  return match ? Number(match[1]) : null
}

export async function handleHfSpaceRoutes(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const service = hfSpaceService(env)

  if (url.pathname === '/api/hf-spaces/preview' && request.method === 'POST') {
    const body = await readJson<{ input?: string }>(request)
    return jsonOk(await service.preview(body.input || ''))
  }

  if (url.pathname === '/api/hf-spaces/users' && request.method === 'GET') {
    return jsonOk(await service.listUsers())
  }

  if (url.pathname === '/api/hf-spaces/users' && request.method === 'POST') {
    const body = await readJson<{ input?: string; selected_spaces?: Array<{ space_id: string; keepalive_url?: string }> }>(request)
    return jsonOk(await service.createUser(body.input || '', body.selected_spaces || []), { status: 201 })
  }

  const refreshUserId = idFromPath(url.pathname, /^\/api\/hf-spaces\/users\/(\d+)\/refresh$/)
  if (refreshUserId !== null && request.method === 'POST') {
    return jsonOk(await service.refreshUser(refreshUserId))
  }

  if (url.pathname === '/api/hf-spaces/targets' && request.method === 'GET') {
    return jsonOk(await service.listTargets())
  }

  const targetId = idFromPath(url.pathname, /^\/api\/hf-spaces\/targets\/(\d+)$/)
  if (targetId !== null && request.method === 'PATCH') {
    const body = await readJson<{ keepalive_url?: string; enabled?: boolean; alias?: string }>(request)
    return jsonOk(await service.updateTarget(targetId, body))
  }

  if (targetId !== null && request.method === 'DELETE') {
    return jsonOk(await service.deleteTarget(targetId))
  }

  const pingTargetId = idFromPath(url.pathname, /^\/api\/hf-spaces\/targets\/(\d+)\/ping$/)
  if (pingTargetId !== null && request.method === 'POST') {
    return jsonOk(await service.pingTarget(pingTargetId))
  }

  if (url.pathname === '/api/hf-spaces/logs' && request.method === 'GET') {
    return jsonOk(await service.paginateLogs({
      userId: Number(url.searchParams.get('user_id')) || undefined,
      targetId: Number(url.searchParams.get('target_id')) || undefined,
      status: url.searchParams.get('status') || undefined,
      page: Number(url.searchParams.get('page')) || undefined,
      pageSize: Number(url.searchParams.get('page_size')) || undefined
    }))
  }

  return jsonError('NOT_FOUND', 'HF Spaces 接口不存在', 404)
}
