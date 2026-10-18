import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const relayPort = 19090;
const backendPort = 19091;
const queueDir = await mkdtemp(join(tmpdir(), 'casamento-webhook-relay-'));
const received = [];

const relay = spawn(process.execPath, ['deploy/webhook-relay.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(relayPort),
    QUEUE_DIR: queueDir,
    WEBHOOK_SECRET: 'relay-test-secret',
    BACKEND_WEBHOOK_URL: `http://127.0.0.1:${backendPort}/webhook?secret=relay-test-secret`,
    RETRY_MS: '100',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

async function waitFor(predicate, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('timeout waiting for condition');
}

let backend;
try {
  await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${relayPort}/health`);
      return response.ok;
    } catch {
      return false;
    }
  });

  const payload = {
    event: 'onmessage',
    id: 'relay-test-message',
    from: '5519999999999@c.us',
    body: 'PARAR',
  };

  const accepted = await fetch(
    `http://127.0.0.1:${relayPort}/webhook?secret=relay-test-secret`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  assert.equal(accepted.status, 202);

  await waitFor(async () => {
    const files = await readdir(queueDir);
    return files.some((name) => name.endsWith('.json'));
  });

  backend = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise((resolve) => backend.listen(backendPort, '127.0.0.1', resolve));

  await waitFor(() => received.length === 1);
  assert.equal(received[0].body, 'PARAR');

  await waitFor(async () => {
    const files = await readdir(queueDir);
    return !files.some((name) => name.endsWith('.json'));
  });

  console.log('webhook relay persistence test passed');
} finally {
  relay.kill('SIGTERM');
  if (backend) await new Promise((resolve) => backend.close(resolve));
  await rm(queueDir, { recursive: true, force: true });
}
