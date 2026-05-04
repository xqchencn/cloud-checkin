import { SiteManager } from '../pages/SiteManager'
export { LoginView } from '../features/auth/LoginView'

export function AppExperience({ onLogout }: { onLogout: () => void }) {
  return <SiteManager onLogout={onLogout} />
}
