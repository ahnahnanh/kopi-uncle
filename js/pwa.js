// Installable web app: registers the offline service worker and shows an
// "Install" button when the browser supports it (Android/desktop Chrome, Edge).
// On iPhone there's no install prompt, so we show a one-line Share → Add to Home Screen tip.
const btn = document.getElementById('installBtn');
const tip = document.getElementById('installTip');
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

let deferred = null;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e;
  if (!standalone) btn.hidden = false;
});
btn.addEventListener('click', async () => {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  btn.hidden = true;
});
addEventListener('appinstalled', () => { btn.hidden = true; });

const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
if (iOS && !standalone) tip.hidden = false;
