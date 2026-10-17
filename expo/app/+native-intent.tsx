export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'rork-app://app');
    const pathname = url.pathname === '' ? `/${url.hostname}` : url.pathname;
    if (pathname === '/trip-detail' && url.searchParams.get('id')) {
      return `/trip-detail?id=${encodeURIComponent(url.searchParams.get('id')!)}`;
    }
    if (pathname === '/save-trip') return pathname;
    return '/';
  } catch { return '/'; }
}
