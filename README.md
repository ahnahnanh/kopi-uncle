# ☕ Kopi Order Master

A silly kopitiam game. Decode Singlish kopi orders ("Kopi O kosong peng!", "Teh C siew dai dabao!"), build them from raw ingredients, and survive the 2½-minute morning rush (slow start, then it picks up) before 3 customers walk off.

## Project layout

```
index.html        page structure (screens, station, overlays)
css/style.css     all styling
js/game.js        game flow: state, station UI, queue, serving, timer, tutorial, screens
js/drink.js       drink model: naming (Singlish/English), random orders, checking, prices
js/content.js     all the words: customers, lines, complaints, tutorial lessons, ranks, cheat sheet
js/sound.js       Web Audio beeps + mute
js/utils.js       tiny helpers
js/pwa.js         installable-app bits: offline service worker + Install button
sw.js             service worker (offline cache)
manifest.webmanifest + icons/   app name, colours and home-screen icons
```

**Want to add Singlish lines, customers, or lessons?** Edit `js/content.js` only.

## Run locally

It uses native JavaScript modules, so open it through a local server (double-clicking `index.html` won't work):

```
npx serve .        # or: python3 -m http.server
```

## Installable web app

Players can install it to their home screen (📲 **Install as app** on Android/desktop Chrome, or **Share → Add to Home Screen** on iPhone). It then opens full-screen and works offline.

**When you deploy changes, bump `VERSION` in `sw.js`** (e.g. `kopi-v1` → `kopi-v2`) so installed players pick up the new files.

## Deploy

Static site, no build step. Import the repo in Vercel and keep the defaults (Framework: Other).
