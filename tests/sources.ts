import { existsSync, readFileSync } from 'node:fs'

export const appSource = readFileSync('frontend/src/App.tsx', 'utf8')
export const apiSiteSource = readFileSync('frontend/src/api/apiSite.ts', 'utf8')
export const stylesSource = readFileSync('frontend/src/styles.css', 'utf8')
export const viteConfigSource = readFileSync('frontend/vite.config.ts', 'utf8')
export const mainSource = readFileSync('frontend/src/main.tsx', 'utf8')
export const toastSource = existsSync('frontend/src/toast.tsx') ? readFileSync('frontend/src/toast.tsx', 'utf8') : ''
export const npmrcSource = existsSync('.npmrc') ? readFileSync('.npmrc', 'utf8') : ''
export const packageSource = readFileSync('package.json', 'utf8')
export const readmeSource = readFileSync('README.md', 'utf8')
export const localScheduledDevSource = readFileSync('scripts/local-scheduled-dev.mjs', 'utf8')
export const checkinLogRepositorySource = readFileSync('worker/src/repositories/checkin-log-repository.ts', 'utf8')
export const taskLogRepositorySource = readFileSync('worker/src/repositories/task-log-repository.ts', 'utf8')
export const schedulerServiceSource = readFileSync('worker/src/services/scheduler-service.ts', 'utf8')
export const tokenServiceSource = readFileSync('worker/src/services/token-service.ts', 'utf8')
