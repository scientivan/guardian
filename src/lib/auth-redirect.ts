/** Only return to application routes after login, never to an external URL. */
export function appDestination(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) return "/projects";
  const url = new URL(value, "http://guardian.local");
  if (!/^\/(app|projects|case|join|admin|hospitals)(\/|$)/.test(url.pathname)) return "/projects";
  return `${url.pathname}${url.search}`;
}
