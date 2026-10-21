// =============================================================
//  sw.js — ★ NUEVO (paso 19): el "service worker" para jugar sin internet
// =============================================================
//  El navegador lo ejecuta aparte del juego. Cada vez que el juego pide
//  un archivo, pasa por aquí ("fetch"):
//    1. intentamos traerlo de internet (así siempre tienes la última versión)
//       y guardamos una copia en la caché;
//    2. si no hay internet, entregamos la copia guardada.
//
//  ¡IMPORTANTE! Si cambias el juego y lo vuelves a subir, sube también el
//  número de VERSION: así se borra la caché vieja.
// =============================================================
const VERSION = "marcstars-v5";
const ARCHIVOS = [
  "./",
  "img/agua.svg",
  "img/arbusto.svg",
  "img/chispa.svg",
  "img/enemigo.svg",
  "img/iconos/apple-touch-icon.png",
  "img/iconos/icono-192.png",
  "img/iconos/icono-512.png",
  "img/marc-presentacion.png",
  "img/marc-retrato.png",
  "img/marc.svg",
  "img/muro.svg",
  "img/pluma.svg",
  "img/ruda.svg",
  "img/suelo.svg",
  "index.html",
  "js/balas.js",
  "js/brawlers.js",
  "js/config.js",
  "js/efectos.js",
  "js/enemigos.js",
  "js/entrada.js",
  "js/escena3d.js",
  "js/hud.js",
  "js/imagenes.js",
  "js/jugador.js",
  "js/lib/GLTFLoader.js",
  "js/lib/SkeletonUtils.js",
  "js/lib/three.min.js",
  "js/mapa.js",
  "js/modelo-marc.js",
  "js/modelos-glb.js",
  "js/modelos/marc-sprites.js",
  "js/principal.js",
  "js/sprites.js",
  "js/super.js",
  "js/tactil.js",
  "manifest.json"
];

// Al instalarse: descargar y guardar todos los archivos del juego
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

// Al activarse: borrar las cachés de versiones anteriores
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((nombres) =>
    Promise.all(nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n)))));
  self.clients.claim();
});

// Cada petición: primero internet, si falla la copia guardada
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copia));
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
