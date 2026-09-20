self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Manteniamo le richieste online normali.
// Non mettiamo in cache prezzi e dati finanziari.
self.addEventListener("fetch", () => {
  // Il browser continua a gestire normalmente la richiesta.
});