// Send every visitor to the main address, secondsaturdayworship.com.
// The old pages.dev address and www both redirect here permanently.
// Preview deployments (<hash>.secondsaturdayworship.pages.dev) are left alone.
const MAIN_HOST = "secondsaturdayworship.com";
const REDIRECT_HOSTS = new Set([
  "secondsaturdayworship.pages.dev",
  "www.secondsaturdayworship.com",
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = MAIN_HOST;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
