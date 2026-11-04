// Shared PIN gate for the team planner.
// Two levels: the team PIN opens a view-only planner (team.secondsaturdayworship.com),
// the admin PIN opens the editable planner (admin.team.secondsaturdayworship.com).
// PINs and session tokens live in the D1 "settings" table, not in this repo:
//   pin / token             -> team (view only)
//   admin_pin / admin_token -> admin (can edit)
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days
const LEVELS = {
  team: { cookie: "ss_team", pin: "pin", token: "token" },
  admin: { cookie: "ss_admin", pin: "admin_pin", token: "admin_token" },
};

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

async function tokenFor(env, mode) {
  const key = LEVELS[mode].token;
  let t = await setting(env, key);
  if (!t) {
    const b = crypto.getRandomValues(new Uint8Array(32));
    t = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES (?, ?)").bind(key, t).run();
    t = await setting(env, key);
  }
  return t;
}

// "admin", "team", or null. An admin session can also view.
export async function roleOf(request, env) {
  for (const mode of ["admin", "team"]) {
    const c = readCookie(request, LEVELS[mode].cookie);
    if (!c) continue;
    const t = await setting(env, LEVELS[mode].token);
    if (t && c === t) return mode;
  }
  return null;
}

// Checks the PIN for a level and returns the Set-Cookie header value, or null.
export async function login(env, mode, pin) {
  if (!LEVELS[mode]) return null;
  const want = await setting(env, LEVELS[mode].pin);
  if (!want || String(pin || "").trim() !== want) return null;
  const token = await tokenFor(env, mode);
  return `${LEVELS[mode].cookie}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookies() {
  return Object.values(LEVELS).map((l) => `${l.cookie}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

// Serves the planner, or the PIN screen for the given level.
export async function servePlanner(context, mode = "team") {
  const { request, env } = context;
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
  const role = env.DB ? await roleOf(request, env) : null;
  const ok = mode === "admin" ? role === "admin" : !!role;
  if (ok) {
    const page = await env.ASSETS.fetch(new Request(new URL("/team/", request.url), { headers: request.headers }));
    const out = new Response(page.body, { status: page.status, headers: page.headers });
    for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
    return out;
  }
  return new Response(pinPage(mode), { status: 200, headers: { "content-type": "text/html; charset=utf-8", ...headers } });
}

const pinPage = (mode) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#070605">
<title>${mode === "admin" ? "Admin" : "Team"} · Second Saturday</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#070605;--surface:#100e0c;--line:rgba(255,240,225,.14);--fg:#f6f2ec;--muted:#a8a199;--ember:#efa06e;--bad:#f2a283;color-scheme:dark}
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif}
body{display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-left,0px)) 24px max(16px,env(safe-area-inset-right,0px))}
form{width:min(340px,100%);display:grid;gap:18px;justify-items:center;text-align:center}
img{width:56px;height:56px;border-radius:14px}
h1{font:800 26px/1.05 Archivo,Inter,sans-serif;font-stretch:112%;letter-spacing:-.03em;margin:0}
p{margin:0;color:var(--muted);font-size:15px}
.eyebrow{font:700 11px/1 Inter,sans-serif;letter-spacing:.26em;text-transform:uppercase;color:var(--ember)}
input{width:100%;font:700 30px/1 Inter,sans-serif;letter-spacing:.5em;text-align:center;padding:14px 0 14px .5em;background:var(--surface);color:var(--fg);border:1px solid var(--line);border-radius:14px}
input:focus{outline:2px solid var(--ember);outline-offset:2px}
button{width:100%;font:600 16px/1 Inter,sans-serif;padding:15px;border-radius:999px;border:0;background:var(--ember);color:#1a0f07;cursor:pointer}
button:disabled{opacity:.6}
.err{color:var(--bad);min-height:1.2em;font-size:14px}
a{color:var(--muted);font-size:13px}
</style></head>
<body>
<form id="f" autocomplete="off">
  <img src="/favicon.svg" alt="">
  <div class="eyebrow">${mode === "admin" ? "Admin" : "Team only"}</div>
  <h1>Second Saturday Planner</h1>
  <p>${mode === "admin" ? "Enter the admin PIN to edit plans, setlists and the schedule." : "Enter the team PIN to see plans, setlists and the schedule."}</p>
  <input id="pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" aria-label="${mode === "admin" ? "Admin" : "Team"} PIN" required autofocus>
  <button id="go" type="submit">Unlock</button>
  <div class="err" id="err" role="alert"></div>
  <a href="/">Back to secondsaturdayworship.com</a>
</form>
<script>
const f=document.getElementById("f"),pin=document.getElementById("pin"),err=document.getElementById("err"),go=document.getElementById("go");
f.addEventListener("submit",async e=>{
  e.preventDefault();err.textContent="";go.disabled=true;go.textContent="Checking…";
  try{
    const r=await fetch("/api/team/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pin:pin.value,mode:"${mode}"})});
    if(r.ok){location.reload();return}
    err.textContent=r.status===401?"That PIN didn't work. Try again.":"The planner isn't reachable right now. Try again in a minute.";
  }catch(x){err.textContent="Couldn't connect. Check your connection and try again."}
  go.disabled=false;go.textContent="Unlock";pin.select();
});
</script>
</body></html>`;
