import { SiteManager } from '../pages/SiteManager'
export { LoginView } from '../features/auth/LoginView'

/**
 * 应用体验组件
 * @param onLogout - 登出回调函数
 */
export function AppExperience({ onLogout }: { onLogout: () => void }) {
  return <SiteManager onLogout={onLogout} />
}
