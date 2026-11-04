// Team planner API: /api/team/login, /logout, /all, and /<collection>/<id>.
import { isUnlocked, checkPin, sessionToken, sessionCookie, clearCookie } from "../../_lib/team-auth.js";

const COLS = new Set(["services", "songs", "people"]);
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

export async function onRequest({ request, env, params }) {
  if (!env.DB) return json({ error: "Planner database is not connected." }, 503);
  const parts = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const method = request.method;

  if (parts[0] === "login" && method === "POST") {
    let pin = "";
    try { pin = (await request.json()).pin; } catch (e) {}
    if (!(await checkPin(env, pin))) {
      await new Promise((r) => setTimeout(r, 700));
      return json({ error: "That PIN didn't work." }, 401);
    }
    const token = await sessionToken(env);
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(token) });
  }
  if (parts[0] === "logout") return json({ ok: true }, 200, { "set-cookie": clearCookie() });

  if (!(await isUnlocked(request, env))) return json({ error: "Locked" }, 401);

  if (parts[0] === "all" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT col, id, data FROM records").all();
    const records = { services: [], songs: [], people: [] };
    for (const r of results) {
      if (!records[r.col]) continue;
      try { records[r.col].push({ ...JSON.parse(r.data), id: r.id }); } catch (e) {}
    }
    return json({ records, now: Date.now() });
  }

  const [col, id] = parts;
  if (!COLS.has(col) || !id || parts.length !== 2 || id.length > 200)
    return json({ error: "Not found" }, 404);

  if (method === "PUT") {
    let data;
    try { data = await request.json(); } catch (e) { return json({ error: "Bad JSON" }, 400); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return json({ error: "Bad body" }, 400);
    delete data.id;
    const body = JSON.stringify(data);
    if (body.length > 200000) return json({ error: "Too large" }, 413);
    await env.DB.prepare(
      "INSERT INTO records (col, id, data, updated) VALUES (?, ?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET data = excluded.data, updated = excluded.updated"
    ).bind(col, id, body, Date.now()).run();
    return json({ ok: true });
  }
  if (method === "DELETE") {
    await env.DB.prepare("DELETE FROM records WHERE col = ? AND id = ?").bind(col, id).run();
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}
