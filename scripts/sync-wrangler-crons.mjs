import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const wranglerPath = path.join(root, 'wrangler.toml')
const outputPath = path.join(root, 'shared', 'generated', 'wrangler-crons.ts')

function parseCrons(source) {
  const match = source.match(/crons\s*=\s*\[(.*?)\]/s)
  if (!match) throw new Error('wrangler.toml 中未找到 [triggers].crons 配置')
  // Worker 运行时和设置页展示都只消费这里解析出来的值，避免再手写第二份业务 Cron。
  const values = [...match[1].matchAll(/"([^"]+)"/g)].map(item => item[1])
  if (values.length < 2) throw new Error('wrangler.toml 中的 crons 至少需要两条：签到任务和历史记录清理任务')
  return values
}

async function main() {
  const wrangler = await readFile(wranglerPath, 'utf8')
  const [checkinCron, cleanupCron] = parseCrons(wrangler)
  const content = `// Generated from wrangler.toml by scripts/sync-wrangler-crons.mjs\nexport const WRANGLER_CHECKIN_CRON = ${JSON.stringify(checkinCron)} as const\nexport const WRANGLER_CLEANUP_CRON = ${JSON.stringify(cleanupCron)} as const\n`
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, content, 'utf8')
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
