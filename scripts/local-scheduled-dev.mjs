import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const DEFAULT_PORT = 8787
const CHECK_INTERVAL_MS = 5000
const FETCH_TIMEOUT_MS = 3000
const SERVER_READY_TIMEOUT_MS = 30000
const NEXT_TRIGGER_LOOKAHEAD_MINUTES = 60 * 24 * 366

function parseCrons(source) {
  const match = source.match(/crons\s*=\s*\[(.*?)\]/s)
  if (!match) throw new Error('wrangler.toml is missing [triggers].crons')
  const crons = [...match[1].matchAll(/"([^"]+)"/g)].map(item => item[1])
  if (!crons.length) throw new Error('wrangler.toml [triggers].crons is empty')
  return crons
}

function getPort(args) {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--port') return Number(args[index + 1] || DEFAULT_PORT)
    if (arg.startsWith('--port=')) return Number(arg.slice('--port='.length) || DEFAULT_PORT)
  }
  return DEFAULT_PORT
}

function fieldMatches(field, value, min, max) {
  if (field === '*') return true
  return field.split(',').some(part => {
    if (part.includes('/')) {
      const [rangePart, stepPart] = part.split('/')
      const step = Number(stepPart)
      if (!Number.isFinite(step) || step <= 0) return false
      const [start, end] = rangePart === '*'
        ? [min, max]
        : rangePart.split('-').map(Number)
      return value >= start && value <= end && (value - start) % step === 0
    }
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      return value >= start && value <= end
    }
    const exact = Number(part)
    if (max === 7 && exact === 7) return value === 0
    return value === exact
  })
}

function cronMatches(cron, date) {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cron.trim().split(/\s+/)
  if (!dayOfWeek) return false
  return fieldMatches(minute, date.getUTCMinutes(), 0, 59) &&
    fieldMatches(hour, date.getUTCHours(), 0, 23) &&
    fieldMatches(dayOfMonth, date.getUTCDate(), 1, 31) &&
    fieldMatches(month, date.getUTCMonth() + 1, 1, 12) &&
    fieldMatches(dayOfWeek, date.getUTCDay(), 0, 7)
}

function formatUtcMinute(date) {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

function findNextTrigger(crons, fromDate = new Date()) {
  const cursor = new Date(fromDate)
  cursor.setUTCSeconds(0, 0)
  cursor.setUTCMilliseconds(0)

  for (let offset = 1; offset <= NEXT_TRIGGER_LOOKAHEAD_MINUTES; offset++) {
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)
    const cron = crons.find(item => cronMatches(item, cursor))
    if (cron) return { cron, date: new Date(cursor) }
  }

  return null
}

function logNextTrigger(crons, fromDate = new Date()) {
  const next = findNextTrigger(crons, fromDate)
  if (!next) {
    console.warn('[scheduled-dev] no matching cron found within the next year')
    return
  }
  console.log(`[scheduled-dev] next local scheduled trigger: "${next.cron}" at ${formatUtcMinute(next.date)}`)
}

function quoteCmdArg(arg) {
  if (!/[\s"&<>|^]/.test(arg)) return arg
  return `"${arg.replace(/"/g, '\\"')}"`
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function checkLocalHealth(baseUrl) {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/health`)
    return response.ok
  } catch {
    return false
  }
}

function spawnWrangler(extraArgs) {
  const args = ['npx', 'wrangler', 'dev', '--test-scheduled', ...extraArgs]
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', args.map(quoteCmdArg).join(' ')], {
      stdio: 'inherit'
    })
  }
  return spawn('npx', ['wrangler', 'dev', '--test-scheduled', ...extraArgs], {
    stdio: 'inherit'
  })
}

async function waitForServer(baseUrl, isStopped) {
  const startedAt = Date.now()
  for (;;) {
    if (isStopped()) throw new Error('wrangler dev exited before the local server became ready')
    if (Date.now() - startedAt > SERVER_READY_TIMEOUT_MS) {
      throw new Error(`wrangler dev did not become ready at ${baseUrl} within ${SERVER_READY_TIMEOUT_MS / 1000}s. Stop any stale process using port ${new URL(baseUrl).port}, then run npm run dev again.`)
    }
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch {
      // Wrangler is still booting.
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

async function triggerScheduled(baseUrl, cron) {
  try {
    const query = new URLSearchParams({ cron })
    const response = await fetchWithTimeout(`${baseUrl}/__scheduled?${query.toString()}`)
    if (!response.ok) {
      console.error(`[scheduled-dev] scheduled trigger failed for "${cron}": ${response.status} ${response.statusText}`)
      return
    }
    console.log(`[scheduled-dev] scheduled trigger sent for "${cron}"`)
  } catch (error) {
    console.error(`[scheduled-dev] scheduled trigger failed for "${cron}": ${error instanceof Error ? error.message : String(error)}`)
  }
}

function runDueScheduledTriggers(baseUrl, crons, lastTriggered, now = new Date()) {
  const minuteKey = now.toISOString().slice(0, 16)
  let triggered = 0

  for (const cron of crons) {
    if (!cronMatches(cron, now)) continue
    if (lastTriggered.get(cron) === minuteKey) continue
    lastTriggered.set(cron, minuteKey)
    triggered++
    console.log(`[scheduled-dev] local scheduled trigger due: "${cron}" at ${formatUtcMinute(now)}`)
    void triggerScheduled(baseUrl, cron)
  }

  return triggered
}

async function main() {
  const extraArgs = process.argv.slice(2)
  const port = getPort(extraArgs)
  const baseUrl = `http://127.0.0.1:${port}`
  const crons = parseCrons(await readFile('wrangler.toml', 'utf8'))
  if (await checkLocalHealth(baseUrl)) {
    throw new Error(`port ${port} already has a healthy Worker at ${baseUrl}. Stop the existing dev server before running npm run dev again.`)
  }
  const wrangler = spawnWrangler(extraArgs)
  const lastTriggered = new Map()
  let timer = null
  let stopped = false

  wrangler.on('exit', (code, signal) => {
    stopped = true
    if (timer) clearInterval(timer)
    if (signal) process.exitCode = 1
    else process.exitCode = code ?? 0
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      if (timer) clearInterval(timer)
      wrangler.kill(signal)
    })
  }

  await waitForServer(baseUrl, () => stopped)
  console.log(`[scheduled-dev] local scheduled simulator ready: ${crons.join(' | ')}`)
  logNextTrigger(crons)
  runDueScheduledTriggers(baseUrl, crons, lastTriggered)
  timer = setInterval(() => {
    if (runDueScheduledTriggers(baseUrl, crons, lastTriggered) > 0) logNextTrigger(crons)
  }, CHECK_INTERVAL_MS)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
