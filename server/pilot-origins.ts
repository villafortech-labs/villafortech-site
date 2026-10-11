type PreviewEnvironment = {
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  VERCEL_BRANCH_URL?: string;
};

export function pilotPreviewOrigins(environment: PreviewEnvironment): string[] {
  if (environment.VERCEL_ENV !== 'preview') return [];
  const origins = [environment.VERCEL_URL, environment.VERCEL_BRANCH_URL]
    .filter((host): host is string => !!host)
    .filter((host) =>
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/i.test(host),
    )
    .map((host) => `https://${host.toLowerCase()}`);
  // Exact Vercel-provided hosts only; never trust a request Origin or wildcard.
  return [...new Set(origins)];
}
