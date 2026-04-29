import process from 'node:process';
import * as Y from 'yjs';

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function decodeBase64(value) {
  if (!value) {
    return null;
  }
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

function encodeBase64(update) {
  return Buffer.from(update).toString('base64');
}

try {
  const input = JSON.parse(await readStdin());
  const doc = new Y.Doc();

  const snapshot = decodeBase64(input.snapshot);
  if (snapshot && snapshot.length > 0) {
    Y.applyUpdate(doc, snapshot);
  }

  for (const encodedUpdate of input.updates ?? []) {
    const update = decodeBase64(encodedUpdate);
    if (update && update.length > 0) {
      Y.applyUpdate(doc, update);
    }
  }

  const compacted = Y.encodeStateAsUpdate(doc);
  process.stdout.write(JSON.stringify({ snapshot: encodeBase64(compacted) }));
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exit(1);
}
