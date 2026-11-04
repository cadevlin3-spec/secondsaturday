// Host routing for the whole site.
// - The old pages.dev address and www redirect to secondsaturdayworship.com.
// - team.secondsaturdayworship.com is the PIN-locked team planner (view only).
// - admin.team.secondsaturdayworship.com is the same planner for editors (admin PIN).
// - secondsaturdayworship.com/team/ forwards to the team address.
// Preview deployments (<hash>.secondsaturdayworship.pages.dev) are left alone,
// except that /team/ there shows the planner so changes can be tested.
import { servePlanner } from "./_lib/team-auth.js";

const MAIN_HOST = "secondsaturdayworship.com";
const TEAM_HOST = "team.secondsaturdayworship.com";
const ADMIN_HOST = "admin.team.secondsaturdayworship.com";
const REDIRECT_HOSTS = new Set([
  "secondsaturdayworship.pages.dev",
  "www.secondsaturdayworship.com",
]);
const TEAM_PASSTHROUGH = new Set(["/favicon.svg", "/favicon-512.png", "/apple-touch-icon.png"]);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = MAIN_HOST;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  const isTeamPath = url.pathname === "/team" || url.pathname.startsWith("/team/");

  if (url.hostname === TEAM_HOST || url.hostname === ADMIN_HOST) {
    if (url.pathname.startsWith("/api/team/") || TEAM_PASSTHROUGH.has(url.pathname)) return context.next();
    if (url.pathname === "/robots.txt")
      return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain" } });
    return servePlanner(context, url.hostname === ADMIN_HOST ? "admin" : "team");
  }

  if (url.hostname === MAIN_HOST && isTeamPath) {
    return Response.redirect(`https://${TEAM_HOST}/`, 301);
  }

  if (isTeamPath) return servePlanner(context, url.searchParams.has("admin") ? "admin" : "team");
  return context.next();
}
