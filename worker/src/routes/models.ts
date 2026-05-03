import { modelService } from '../services/model-service'
import { jsonError, jsonOk, readJson } from '../response'
import type { Env } from '../types'

export async function handleModelRoutes(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const service = modelService(env)

  const models = url.pathname.match(/^\/api\/sites\/(\d+)\/models$/)
  if (models && request.method === 'GET') {
    return jsonOk(await service.getModels(Number(models[1])))
  }

  const refresh = url.pathname.match(/^\/api\/sites\/(\d+)\/models\/refresh$/)
  if (refresh && request.method === 'POST') {
    return jsonOk(await service.refreshModels(Number(refresh[1])))
  }

  if (url.pathname === '/api/sites/batch-refresh-models' && request.method === 'POST') {
    const body = await readJson<{ site_ids?: number[] }>(request)
    return jsonOk(await service.batchRefreshModels(body.site_ids || []))
  }

  const stats = url.pathname.match(/^\/api\/sites\/(\d+)\/models\/statistics$/)
  if (stats && request.method === 'GET') {
    return jsonOk(await service.getModelsStats(Number(stats[1])))
  }

  return jsonError('NOT_FOUND', '模型接口不存在', 404)
}
