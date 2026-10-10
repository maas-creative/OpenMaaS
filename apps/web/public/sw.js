// Retire the legacy worker. Authenticated pages and API responses must use the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name.startsWith('openmaas-')).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.registration.unregister()),
  );
});
