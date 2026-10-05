import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const port = Number(process.env.PORT || 8080);
const queueDir = process.env.QUEUE_DIR || '/data/queue';
const webhookSecret = process.env.WEBHOOK_SECRET || '';
const backendWebhookUrl = process.env.BACKEND_WEBHOOK_URL || '';
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 2 * 1024 * 1024);
const retryMs = Number(process.env.RETRY_MS || 3000);

if (!webhookSecret || !backendWebhookUrl) {
  throw new Error('WEBHOOK_SECRET and BACKEND_WEBHOOK_URL are required');
}

await mkdir(queueDir, { recursive: true });

let draining = false;

async function enqueue(rawBody) {
  const stamp = String(Date.now()).padStart(13, '0');
  const id = `${stamp}-${randomUUID()}`;
  const tmp = join(queueDir, `.${id}.tmp`);
  const target = join(queueDir, `${id}.json`);
  await writeFile(tmp, rawBody, { encoding: 'utf8', flag: 'wx' });
  await rename(tmp, target);
}

async function drainOne() {
  if (draining) return;
  draining = true;
  try {
    const files = (await readdir(queueDir))
      .filter((name) => name.endsWith('.json'))
      .sort();
    if (!files.length) return;

    const file = files[0];
    const path = join(queueDir, file);
    const raw = await readFile(path, 'utf8');

    try {
      const response = await fetch(backendWebhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: raw,
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        await unlink(path);
      } else {
        console.error(`backend webhook returned ${response.status}; keeping ${file} queued`);
      }
    } catch (error) {
      console.error(`backend webhook unavailable; keeping ${file} queued`, error?.message ?? error);
    }
  } finally {
    draining = false;
  }
}

setInterval(() => void drainOne(), retryMs).unref();

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    const queued = (await readdir(queueDir)).filter((name) => name.endsWith('.json')).length;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, queued }));
    return;
  }

  if (req.method !== 'POST' || url.pathname !== '/webhook') {
    res.writeHead(404);
    res.end();
    return;
  }

  if (url.searchParams.get('secret') !== webhookSecret) {
    res.writeHead(401);
    res.end();
    return;
  }

  let size = 0;
  const chunks = [];
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBodyBytes) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    JSON.parse(raw);
    await enqueue(raw);

    res.writeHead(202, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ accepted: true }));
    void drainOne();
  } catch (error) {
    console.error('failed to persist webhook', error);
    res.writeHead(400);
    res.end();
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`webhook relay listening on ${port}`);
});
