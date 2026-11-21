const { setTimeout: wait } = require('node:timers/promises');

const secret = process.env.CRON_SECRET;
const base = process.env.WORKER_APP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
if (!secret || secret.length < 32) throw new Error('Set CRON_SECRET to the same worker secret as the app');
const endpoint = new URL('/api/scheduler/execute', base);
const controller = new AbortController();

process.on('SIGINT', () => controller.abort());
process.on('SIGTERM', () => controller.abort());

async function work() {
  while (!controller.signal.aborted) {
    let idle = true;
    try {
      const response = await fetch(endpoint, {
        method: 'POST', redirect: 'error', headers: { Authorization: 'Bearer ' + secret },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(180_000)]),
      });
      if (!response.ok) throw new Error('Worker endpoint returned HTTP ' + response.status);
      const result = await response.json();
      idle = result.executedCount === 0;
      if (!idle) console.log(new Date().toISOString(), result.jobs);
    } catch (error) {
      if (!controller.signal.aborted) console.error(new Date().toISOString(), error.message);
      if (process.argv.includes('--once')) process.exitCode = 1;
    }
    if (process.argv.includes('--once')) return;
    if (idle) await wait(15_000, undefined, { signal: controller.signal }).catch(() => {});
  }
}
void work();
