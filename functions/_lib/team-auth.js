// Shared PIN gate for the team planner.
// The PIN and the session token live in the D1 "settings" table, not in this repo.
export const COOKIE = "ss_team";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return "";
}

async function setting(env, k) {
  const row = await env.DB.prepare("SELECT v FROM settings WHERE k = ?").bind(k).first();
  return row ? row.v : null;
}

export async function sessionToken(env) {
  let t = await setting(env, "token");
  if (!t) {
    const b = crypto.getRandomValues(new Uint8Array(32));
    t = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES ('token', ?)").bind(t).run();
    t = await setting(env, "token");
  }
  return t;
}

export async function isUnlocked(request, env) {
  const c = readCookie(request, COOKIE);
  if (!c) return false;
  const t = await setting(env, "token");
  return !!t && c === t;
}

export async function checkPin(env, pin) {
  const want = await setting(env, "pin");
  return !!want && String(pin || "").trim() === want;
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
export function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
