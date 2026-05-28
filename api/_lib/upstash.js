const BASE  = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function kget(key) {
  if (!BASE || !TOKEN) return null;
  const res = await fetch(`${BASE}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const { result } = await res.json();
  return result ? JSON.parse(result) : null;
}

export async function kset(key, value, exSeconds = 86400) {
  if (!BASE || !TOKEN) return;
  await fetch(`${BASE}/set/${encodeURIComponent(key)}?ex=${exSeconds}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'text/plain' },
    body: JSON.stringify(value),
  });
}

export async function kdel(key) {
  if (!BASE || !TOKEN) return;
  await fetch(`${BASE}/del/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
}
