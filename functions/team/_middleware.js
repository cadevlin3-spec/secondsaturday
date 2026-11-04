// Shows a PIN screen in front of /team/ until the visitor enters the team PIN.
import { isUnlocked } from "../_lib/team-auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (env.DB && (await isUnlocked(request, env))) {
    const res = await context.next();
    const out = new Response(res.body, res);
    out.headers.set("cache-control", "no-store");
    out.headers.set("x-robots-tag", "noindex, nofollow");
    return out;
  }
  return new Response(PIN_PAGE, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}

const PIN_PAGE = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#070605">
<title>Team · Second Saturday</title>
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
  <div class="eyebrow">Team only</div>
  <h1>Second Saturday Planner</h1>
  <p>Enter the team PIN to see plans, setlists and the schedule.</p>
  <input id="pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" aria-label="Team PIN" required autofocus>
  <button id="go" type="submit">Unlock</button>
  <div class="err" id="err" role="alert"></div>
  <a href="/">Back to secondsaturdayworship.com</a>
</form>
<script>
const f=document.getElementById("f"),pin=document.getElementById("pin"),err=document.getElementById("err"),go=document.getElementById("go");
f.addEventListener("submit",async e=>{
  e.preventDefault();err.textContent="";go.disabled=true;go.textContent="Checking…";
  try{
    const r=await fetch("/api/team/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pin:pin.value})});
    if(r.ok){location.reload();return}
    err.textContent=r.status===401?"That PIN didn't work. Try again.":"The planner isn't reachable right now. Try again in a minute.";
  }catch(x){err.textContent="Couldn't connect. Check your connection and try again."}
  go.disabled=false;go.textContent="Unlock";pin.select();
});
</script>
</body></html>`;
