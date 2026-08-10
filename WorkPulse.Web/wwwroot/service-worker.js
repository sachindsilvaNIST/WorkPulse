// Deliberately minimal: this app is authenticated and API-driven, so aggressive
// asset/API caching risks serving stale data. Registering a (near) no-op service
// worker is enough to satisfy Chrome/Android's "installable" PWA criteria; iOS
// "Add to Home Screen" doesn't require one at all — the manifest + meta tags do that.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
