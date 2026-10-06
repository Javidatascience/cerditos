// Registro de la PWA (docs/06 y README). El service worker se actualiza en silencio (`autoUpdate`):
// la nueva versión se aplica la siguiente vez que se abre la app, sin avisos. No pide ningún
// permiso (ni notificaciones); `storage.persist()` es silencioso y solo reduce el riesgo de que
// el sistema borre los datos. Solo en producción: en desarrollo un service worker estorba, y si un
// `npm run preview` anterior dejó uno registrado en este mismo origen (localhost:puerto), se
// elimina para que no sirva una versión vieja desde la caché (pasa en Chrome, que lo conserva).

/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register';

export function registerPwa(): void {
  void navigator.storage?.persist?.();
  if (import.meta.env.PROD) {
    registerSW({ immediate: true });
    return;
  }
  void navigator.serviceWorker?.getRegistrations().then((registrations) => {
    for (const registration of registrations) void registration.unregister();
  });
  void globalThis.caches?.keys().then((keys) => {
    for (const key of keys) void globalThis.caches.delete(key);
  });
}
