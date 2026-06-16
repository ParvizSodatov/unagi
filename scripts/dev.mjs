// Запуск фронта и бэка одной командой, без внешних зависимостей.
// Вывод каждого процесса помечается цветным префиксом [front] / [back].
import { spawn } from 'node:child_process'

const RESET = '\x1b[0m'
const procs = [
  { name: 'back', color: '\x1b[34m', args: ['--prefix', 'backend', 'run', 'dev'] },
  { name: 'front', color: '\x1b[32m', args: ['--prefix', 'frontend', 'run', 'dev'] },
]

const children = procs.map((p) => {
  const prefix = `${p.color}[${p.name}]${RESET} `
  const child = spawn('npm', p.args, { shell: true })
  const pipe = (stream, out) =>
    stream.on('data', (chunk) =>
      chunk
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((line) => out.write(prefix + line + '\n')),
    )
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on('exit', (code) => process.stdout.write(prefix + `завершился (код ${code})\n`))
  return child
})

const killAll = () => children.forEach((c) => c.kill())
process.on('SIGINT', killAll)
process.on('SIGTERM', killAll)
