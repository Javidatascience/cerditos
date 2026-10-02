// Registro de la PWA (docs/02 §9). El service worker se actualiza en silencio (`autoUpdate`):
// la nueva versión se aplica la siguiente vez que se abre la app, sin avisos. No pide ningún
// permiso (ni notificaciones); `storage.persist()` es silencioso y solo reduce el riesgo de que
// el sistema borre los datos. Solo en producción: en desarrollo un service worker estorba.

/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register';

export function registerPwa(): void {
  void navigator.storage?.persist?.();
  if (import.meta.env.PROD) registerSW({ immediate: true });
}
