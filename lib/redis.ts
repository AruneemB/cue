const UPSTASH_URL_KEY = "UPSTASH_REDIS_REST_URL";
const UPSTASH_TOKEN_KEY = "UPSTASH_REDIS_REST_TOKEN";

function getConfig() {
  const url = process.env[UPSTASH_URL_KEY];
  const token = process.env[UPSTASH_TOKEN_KEY];
  if (!url || !token) {
    throw new Error(`Missing ${UPSTASH_URL_KEY} or ${UPSTASH_TOKEN_KEY}`);
  }
  return { url, token };
}

async function redisCommand<T = unknown>(
  command: string[]
): Promise<T> {
  const { url, token } = getConfig();

  const res = await fetch(`${url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!res.ok) {
    throw new Error(`Upstash Redis error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.result as T;
}

/** SET key value EX ttlSeconds — returns "OK" on success */
export async function set(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<string> {
  const cmd = ["SET", key, value];
  if (ttlSeconds) {
    cmd.push("EX", String(ttlSeconds));
  }
  return redisCommand<string>(cmd);
}

/** GET key — returns the value or null */
export async function get(key: string): Promise<string | null> {
  return redisCommand<string | null>(["GET", key]);
}

/** DEL key — returns number of keys deleted */
export async function del(key: string): Promise<number> {
  return redisCommand<number>(["DEL", key]);
}

/**
 * Check if a notification dedup key exists.
 * Key format: notif:{userId}:{channel}
 * TTL: 90 minutes (as per spec)
 */
export async function checkDedup(
  userId: string,
  channel: string
): Promise<boolean> {
  const key = `notif:${userId}:${channel}`;
  const existing = await get(key);
  return existing !== null;
}

/** Mark a notification as sent (dedup key with 90-min TTL) */
export async function markSent(
  userId: string,
  channel: string
): Promise<void> {
  const key = `notif:${userId}:${channel}`;
  await set(key, "1", 90 * 60);
}

/**
 * Cache a value with TTL. Returns cached value if exists,
 * otherwise calls factory and caches the result.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>
): Promise<T> {
  const existing = await get(key);
  if (existing !== null) {
    return JSON.parse(existing) as T;
  }
  const value = await factory();
  await set(key, JSON.stringify(value), ttlSeconds);
  return value;
}
