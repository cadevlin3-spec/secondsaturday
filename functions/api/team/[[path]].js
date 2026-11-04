// Team planner API: /api/team/login, /logout, /me, /all, /files, and /<collection>/<id>.
// Anyone with the team or admin PIN can read; only admin sessions can change things.
import { roleOf, login, clearCookies } from "../../_lib/team-auth.js";

const COLS = new Set(["services", "songs", "people"]);
const json = (body, status = 200, headers = {}) => {
  const h = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  for (const [k, v] of Object.entries(headers)) {
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x));
    else h.set(k, v);
  }
  return new Response(JSON.stringify(body), { status, headers: h });
};

export async function onRequest({ request, env, params }) {
  if (!env.DB) return json({ error: "Planner database is not connected." }, 503);
  const parts = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const method = request.method;

  if (parts[0] === "login" && method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const mode = body.mode === "admin" ? "admin" : "team";
    const cookie = await login(env, mode, body.pin);
    if (!cookie) {
      await new Promise((r) => setTimeout(r, 700));
      return json({ error: "That PIN didn't work." }, 401);
    }
    return json({ ok: true, role: mode }, 200, { "set-cookie": cookie });
  }
  if (parts[0] === "logout") return json({ ok: true }, 200, { "set-cookie": clearCookies() });

  const role = await roleOf(request, env);
  if (!role) return json({ error: "Locked" }, 401);

  if (parts[0] === "me" && method === "GET") return json({ role });

  if (parts[0] === "all" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT col, id, data FROM records").all();
    const records = { services: [], songs: [], people: [] };
    for (const r of results) {
      if (!records[r.col]) continue;
      try { records[r.col].push({ ...JSON.parse(r.data), id: r.id }); } catch (e) {}
    }
    return json({ records, role, now: Date.now() });
  }

  if (parts[0] === "files") return files(request, env, role, parts.slice(1));

  const [col, id] = parts;
  if (!COLS.has(col) || !id || parts.length !== 2 || id.length > 200)
    return json({ error: "Not found" }, 404);
  if (role !== "admin") return json({ error: "View only. Ask Cade or Mandy to make changes." }, 403);

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

// ---------- song files (audio, charts, images, documents) ----------
const MAX_FILE = 25 * 1024 * 1024; // Cloudflare KV limit per file
const TYPES = {
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg",
  flac: "audio/flac", aif: "audio/aiff", aiff: "audio/aiff",
  pdf: "application/pdf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", heic: "image/heic",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8", rtf: "application/rtf",
  cho: "text/plain; charset=utf-8", chopro: "text/plain; charset=utf-8", pro: "text/plain; charset=utf-8", onsong: "text/plain; charset=utf-8",
};
const INLINE = /^(audio\/(mpeg|mp4|aac|wav|ogg|flac)|application\/pdf|image\/(png|jpeg|gif|webp)|text\/plain)/;

async function files(request, env, role, rest) {
  if (!env.FILES) return json({ error: "File storage is not connected." }, 503);
  const method = request.method;

  if (rest.length === 0 && method === "POST") {
    if (role !== "admin") return json({ error: "View only. Ask Cade or Mandy to upload files." }, 403);
    const url = new URL(request.url);
    const name = (url.searchParams.get("name") || "file").replace(/[\\/\r\n"]/g, "_").slice(0, 160);
    const ext = (name.split(".").pop() || "").toLowerCase();
    const type = TYPES[ext];
    if (!type) return json({ error: "That file type isn't supported. Use audio (MP3, M4A, WAV, AAC), PDF, images, Word or text files." }, 415);
    const len = Number(request.headers.get("content-length") || 0);
    if (len > MAX_FILE) return json({ error: "That file is over 25 MB. Export a smaller MP3 and try again." }, 413);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return json({ error: "The file was empty." }, 400);
    if (buf.byteLength > MAX_FILE) return json({ error: "That file is over 25 MB. Export a smaller MP3 and try again." }, 413);
    const b = crypto.getRandomValues(new Uint8Array(12));
    const id = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    await env.FILES.put("f:" + id, buf, { metadata: { name, type, size: buf.byteLength, at: Date.now() } });
    return json({ id, name, type, size: buf.byteLength });
  }

  const id = rest[0];
  if (!id || rest.length !== 1 || !/^[a-f0-9]{24}$/.test(id)) return json({ error: "Not found" }, 404);

  if (method === "DELETE") {
    if (role !== "admin") return json({ error: "View only." }, 403);
    await env.FILES.delete("f:" + id);
    return json({ ok: true });
  }

  if (method === "GET" || method === "HEAD") {
    const { value, metadata } = await env.FILES.getWithMetadata("f:" + id, { type: "arrayBuffer" });
    if (!value) return json({ error: "Not found" }, 404);
    const meta = metadata || {};
    const type = meta.type || "application/octet-stream";
    const total = value.byteLength;
    const inline = INLINE.test(type);
    const fname = encodeURIComponent(meta.name || "file");
    const h = new Headers({
      "content-type": type,
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${fname}`,
    });
    const range = request.headers.get("range");
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : total - Number(m[2]);
      let end = m[1] && m[2] ? Number(m[2]) : total - 1;
      if (start < 0) start = 0;
      if (end >= total) end = total - 1;
      if (start > end || start >= total) {
        h.set("content-range", `bytes */${total}`);
        return new Response(null, { status: 416, headers: h });
      }
      h.set("content-range", `bytes ${start}-${end}/${total}`);
      h.set("content-length", String(end - start + 1));
      return new Response(method === "HEAD" ? null : value.slice(start, end + 1), { status: 206, headers: h });
    }
    h.set("content-length", String(total));
    return new Response(method === "HEAD" ? null : value, { status: 200, headers: h });
  }
  return json({ error: "Method not allowed" }, 405);
}
