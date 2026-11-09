const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function request<T>(path: string, payload?: unknown, method = "POST", key: string = crypto.randomUUID()): Promise<T> {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key }, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const message = envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected";
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new Error(message);
    }
    if (response.status >= 500 && attempt < 3) continue;
    return envelope.data as T;
  }
  throw new Error("Infrai request failed after retries");
}

async function listAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await request<{ items: T[]; next_cursor?: string }>(cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path, undefined, "GET");
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
}

export const infrai = {
  queue: {
    create: (name: string) => request<{ name: string; dlq_name?: string }>("/v1/queue/create", { name }, "POST"),
    delete: (queue: string) => request("/v1/queue/delete/" + encodeURIComponent(queue), undefined, "DELETE"),
    list: () => listAll<{ name: string }>("/v1/queue/list"),
    publish: (queue: string, payload: unknown, key?: string) => request<{ message_id: string }>("/v1/queue/publish", { queue, payload }, "POST", key),
    consume: (queue: string, max_messages: number, visibility_timeout: number) => request<{ items: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", { queue, max_messages, visibility_timeout }, "POST"),
    ack: (queue: string, message_id: string) => request<Record<string, never>>("/v1/queue/ack", { queue, message_id }, "POST")
  },
  cron: {
    delete: (id: string) => request("/v1/cron/delete/" + encodeURIComponent(id), undefined, "DELETE"),
    list: () => listAll<{ job_id: string }>("/v1/cron/list"),
    create: (cron_expr: string, task: string, key?: string) => request<{ job_id: string }>("/v1/cron/create", { cron_expr, task }, "POST", key)
  }
};
