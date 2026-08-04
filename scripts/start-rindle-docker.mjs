import { spawn } from 'node:child_process'
import { createConnection, createServer } from 'node:net'

// Rindle 0.9 supervises the replicated fleet described by rindle.ncl. Keep its
// rendered state and SQLite files in the mounted volume so restarts are durable.
const runDir = '/var/lib/slides'
const internalPort = 7600
const proxyPort = 7602

// rindle-dev-edge binds to loopback by design. Bridge its single HTTP/WebSocket
// ingress to the container network without changing the generated topology.
const proxy = createServer((socket) => {
  const upstream = createConnection({ host: '127.0.0.1', port: internalPort })
  socket.pipe(upstream)
  upstream.pipe(socket)
  socket.on('error', () => upstream.destroy())
  upstream.on('error', () => socket.destroy())
})
proxy.listen(proxyPort, '0.0.0.0')

const child = spawn(
  process.execPath,
  ['/app/node_modules/@rindle/cli/dist/cli.js', 'up', '/app/rindle.ncl', '--migrate'],
  {
    cwd: runDir,
    env: {
      ...process.env,
      RINDLE_MIGRATIONS_DIR: '/app/migrations',
    },
    stdio: 'inherit',
  },
)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    proxy.close()
    child.kill(signal)
  })
}

child.on('exit', (code, signal) => {
  proxy.close()
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
