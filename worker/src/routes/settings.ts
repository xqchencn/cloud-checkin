import { jsonError, jsonOk, readJson } from '../response'
import { settingsService } from '../services/settings-service'
import type { Env, PasswordUpdatePayload, SettingsUpdatePayload } from '../types'

export async function handleSettingsRoutes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const service = settingsService(env)

  if (url.pathname === '/api/settings' && request.method === 'GET') {
    return jsonOk(await service.getPublicSettings())
  }

  if (url.pathname === '/api/settings' && request.method === 'PUT') {
    return jsonOk(await service.updateSettings(await readJson<SettingsUpdatePayload>(request)))
  }

  if (url.pathname === '/api/settings/password' && request.method === 'PUT') {
    return jsonOk(await service.updatePassword(await readJson<PasswordUpdatePayload>(request)))
  }

  return jsonError('NOT_FOUND', '设置接口不存在', 404)
}
