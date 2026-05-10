import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';
import { registerSW } from 'virtual:pwa-register';

/**
 * Service Worker registration with safe cache invalidation.
 *
 * Activation lifecycle:
 *   1. Vite PWA builds a new SW manifest on each production build.
 *   2. Browser installs the new SW in the background (does NOT activate yet).
 *   3. `onNeedRefresh` fires when the new SW is installed and waiting.
 *   4. We call `updateSW(true)` which sends `skipWaiting` to the waiting SW.
 *   5. The SW activates and fires a `controllerchange` event on the page.
 *   6. We listen for `controllerchange` once and reload — ensuring the active
 *      tab loads fresh chunks from the new cache, not the stale prior one.
 *
 * Infinite-reload guard:
 *   `controllerchange` fires once per SW takeover.  The `.once` listener
 *   removes itself after first execution, preventing any loop.
 *
 * Stale chunk prevention:
 *   The reload triggered by `controllerchange` fetches the document fresh from
 *   the new SW cache, which contains only the newly hashed JS/CSS chunks.
 *   Old chunk hashes are no longer referenced and will not be served.
 *
 * Active tab refresh:
 *   Only the current tab reloads.  Other tabs receive the same
 *   `controllerchange` event independently and may reload separately.
 */
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // New SW is installed and waiting — send skipWaiting to activate it
    updateSW(true);
  },
  onOfflineReady() {
    console.info('[SW] App is ready for offline use.');
  },
});

/**
 * Listen for the SW controller handoff and reload exactly once.
 *
 * Loop-prevention strategy:
 *   - SW_CTRL_RELOAD_KEY is stored in sessionStorage (survives reload, cleared on tab close).
 *   - On first controllerchange: key is absent → set it → reload.
 *   - On reloaded page: if controllerchange fires again (e.g. rapid SW update cycle),
 *     the key is present → clear it (reset for the next genuine update) → bail without reload.
 *   - { once: true } removes this listener after its first execution within this page load,
 *     preventing the same load from reloading twice.
 *
 * This means: one reload per SW activation cycle maximum, regardless of how many
 * times main.tsx re-executes across navigations.
 */
const SW_CTRL_RELOAD_KEY = 'sw_ctrl_change_reload';
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem(SW_CTRL_RELOAD_KEY)) {
      // Reload already happened for this SW cycle — clear flag and skip.
      sessionStorage.removeItem(SW_CTRL_RELOAD_KEY);
      return;
    }
    sessionStorage.setItem(SW_CTRL_RELOAD_KEY, '1');
    window.location.reload();
  }, { once: true });
}

createRoot(document.getElementById('root')!).render(
  <App />
);
