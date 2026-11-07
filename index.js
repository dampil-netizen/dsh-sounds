/**
 * dsh-sounds — хост-плагин звуковых уведомлений.
 *
 * Слушает `session/event` (Cordis-событие хоста, по одному на каждый
 * добавленный в журнал сессии факт) и играет wav через PowerShell
 * `Media.SoundPlayer`. Плагин работает в host-процессе DSH, поэтому
 * песочница оболочки ему не мешает.
 *
 * События:
 *   turn/end          — ход агента завершён  -> done (или error при сбое/отмене не пользователем)
 *   approval/asked    — запрос подтверждения -> ask
 *   tool/call "ask_user_question" — вопрос к человеку -> ask
 *   user/message (source.kind === "user") — так помечаем «человеческие» сессии,
 *                     чтобы не пиликать на служебные сессии субагентов.
 *
 * Отладка: пишет строки в ~/.dsh/dsh-sounds.log.
 * @module @local/dsh-sounds
 */
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-sounds'

const HERE = dirname(fileURLToPath(import.meta.url))
const SOUNDS = {
  done: join(HERE, 'assets', 'done.wav'),
  ask: join(HERE, 'assets', 'ask.wav'),
  error: join(HERE, 'assets', 'error.wav'),
}
const LOG = join(homedir(), '.dsh', 'dsh-sounds.log')

function log(line) {
  try {
    mkdirSync(dirname(LOG), { recursive: true })
    appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`)
  } catch {}
}

function play(kind) {
  const path = SOUNDS[kind]
  if (!path || !existsSync(path)) {
    log(`missing sound ${kind}`)
    return
  }
  if (process.env.DSH_SOUNDS === '0') return
  try {
    const cmd = `(New-Object Media.SoundPlayer '${path.replace(/'/g, "''")}').PlaySync()`
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', cmd],
      { windowsHide: true, stdio: 'ignore', detached: false },
    )
    child.on('error', (err) => log(`spawn error: ${err && err.message}`))
    log(`play ${kind}`)
  } catch (err) {
    log(`play failed: ${err && err.message}`)
  }
}

/** Возвращает true, если turn/end выглядит как сбой/отмена не пользователем. */
function looksLikeError(data) {
  if (!data || typeof data !== 'object') return false
  if (data.error) return true
  const cause = data.cancelCause
  if (cause && typeof cause === 'object') {
    const kind = String(cause.kind || '')
    if (kind && kind !== 'user' && kind !== 'completed' && kind !== 'done') return true
  }
  const reason = String(data.reason || '')
  if (reason && /error|fail|abort|timeout|crash/i.test(reason)) return true
  return false
}

export function apply(ctx, config = {}) {
  const enabled = config && config.enabled !== false
  log(`applied enabled=${enabled}`)
  if (!enabled) return

  const humanSessions = new Set()
  const lastPlayed = new Map()

  function playThrottled(kind) {
    const now = Date.now()
    const prev = lastPlayed.get(kind) || 0
    if (now - prev < 350) return
    lastPlayed.set(kind, now)
    play(kind)
  }

  ctx.on('session/event', (session, event) => {
    try {
      if (!event || typeof event.type !== 'string') return
      const type = event.type
      const sid = session && session.id
      const data = event.data

      if (type === 'user/message') {
        const sourceKind = data && data.source && data.source.kind
        log(`user/message session=${sid} source=${sourceKind}`)
        const humanKinds = ['user', 'steering']
        if (sourceKind === undefined || humanKinds.includes(sourceKind)) humanSessions.add(sid)
        return
      }

      if (type === 'approval/asked') {
        log(`approval/asked session=${sid}`)
        if (sid) humanSessions.add(sid)
        playThrottled('ask')
        return
      }

      if (type === 'tool/call') {
        const toolName = (data && (data.name || data.tool)) || ''
        if (toolName === 'ask_user_question') {
          log(`tool/call ask_user_question session=${sid}`)
          if (sid) humanSessions.add(sid)
          playThrottled('ask')
        }
        return
      }

      if (type === 'turn/end') {
        const keys = data && typeof data === 'object' ? Object.keys(data).join(',') : ''
        log(`turn/end session=${sid} human=${humanSessions.has(sid)} keys=${keys}`)
        if (!humanSessions.has(sid)) return
        playThrottled(looksLikeError(data) ? 'error' : 'done')
      }
    } catch (err) {
      log(`handler error: ${err && err.message}`)
    }
  })

  ctx.on('dispose', () => log('disposed'))
}
