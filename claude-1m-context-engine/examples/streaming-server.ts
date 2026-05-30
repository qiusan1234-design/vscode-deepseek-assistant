// ============================================================
// Streaming Server Example — SSE + WebSocket
// ============================================================

import http from 'http';

// Simple SSE client for streaming queries
async function sseQuery(query: string) {
  return new Promise<void>((resolve, reject) => {
    const data = JSON.stringify({ query, stream: true });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3721,
        path: '/api/query',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let buffer = '';
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6);
              if (payload === '[DONE]') {
                console.log('\n--- Stream complete ---');
                resolve();
                return;
              }
              try {
                const parsed = JSON.parse(payload);
                process.stdout.write(parsed.text);
              } catch {
                // ignore parse errors
              }
            }
          }
        });
        res.on('end', resolve);
        res.on('error', reject);
      },
    );
    req.write(data);
    req.end();
  });
}

// WebSocket client example
import WebSocket from 'ws';

async function wsQuery(query: string) {
  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:3721/ws');

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'query',
        payload: { query },
      }));
    });

    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'chunk') {
        process.stdout.write(msg.data);
      } else if (msg.type === 'done') {
        console.log('\n--- WS stream complete ---');
        ws.close();
        resolve();
      } else if (msg.type === 'error') {
        console.error('Error:', msg.error);
        ws.close();
        reject(new Error(msg.error));
      }
    });

    ws.on('error', reject);
  });
}

async function main() {
  console.log('=== SSE Streaming ===');
  await sseQuery('Explain how the context tree eviction works.');

  console.log('\n=== WebSocket Streaming ===');
  await wsQuery('What are the supported file formats?');
}

main().catch(console.error);
