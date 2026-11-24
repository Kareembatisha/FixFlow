/** Endpoints that must work without a session: no token is attached and a 401 means "bad credentials". */
const PUBLIC_API_PATHS = ['/auth/login', '/auth/register'];

/** True only for requests to the FixFlow API, so the token is never sent to third parties. */
export function isApiRequest(url: string, apiUrl: string): boolean {
  return url === apiUrl || url.startsWith(apiUrl + '/');
}

export function isPublicRequest(url: string, apiUrl: string): boolean {
  if (!isApiRequest(url, apiUrl)) return false;
  const path = url.slice(apiUrl.length).split(/[?#]/)[0];
  return PUBLIC_API_PATHS.includes(path);
}
