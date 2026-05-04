import { modelService } from '../services/model-service'
import { jsonError, jsonOk } from '../response'
import type { Env } from '../types'

/**
 * 处理模型相关路由
 * @param request - HTTP 请求
 * @param env - 环境变量
 * @param _ctx - 执行上下文
 * @returns Promise<Response> - HTTP 响应
 */
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

  return jsonError('NOT_FOUND', '模型接口不存在', 404)
}
