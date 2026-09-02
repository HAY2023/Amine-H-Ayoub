import './service-worker.ts';

// Workbox injection point
const precacheManifest = self.__WB_MANIFEST || [];
void precacheManifest;
