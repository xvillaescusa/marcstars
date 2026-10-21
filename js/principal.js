// =============================================================
//  principal.js — El director de orquesta: estados y bucle
// =============================================================

// EL ESTADO DEL JUEGO
// El juego entero está siempre en UNO de estos estados:
//   "seleccion" -> pantalla para elegir brawler
//   "jugando"   -> la partida (incluida la pantalla de ¡ELIMINADO!)
// Según el estado, se actualizan y dibujan cosas distintas.
// Es la misma idea que los comportamientos de los enemigos, pero para el juego.
//   "cargando"  -> esperando a que se carguen las imágenes
let estadoJuego = "cargando";

function empezarPartida(indice) {
  brawlerElegido = indice;
  jugador = crearJugador(BRAWLERS[indice]);
  eliminaciones = 0;
  balas.length = 0;
  bombas.length = 0;
  efectos.length = 0;
  construirMapa();
  for (let i = 0; i < enemigos.length; i++) {
    enemigos[i] = crearEnemigo(PUNTOS_SALIDA[i][0], PUNTOS_SALIDA[i][1]);
  }
  raton.pulsado = false;     // que el clic de elegir no dispare nada más empezar
  estadoJuego = "jugando";
}

function reiniciar() {
  empezarPartida(brawlerElegido);   // mismo brawler otra vez
}

function volverASeleccion() {
  if (BRAWLERS.length === 1) return;       // ★ PASO 20: solo hay uno, no hay nada que elegir
  estadoJuego = "seleccion";
}

function actualizar(dt) {
  if (estadoJuego !== "jugando") return;          // en la selección no se mueve nada
  actualizarTactil();                             // ★ NUEVO: joysticks del móvil (tactil.js)
  actualizarJugador(dt);
  for (const e of enemigos) actualizarEnemigo(e, dt);
  actualizarBalas(dt);
  actualizarSuper(dt);
  actualizarEfectos(dt);
}

// ★ NUEVO: AJUSTAR EL JUEGO AL TAMAÑO DE LA PANTALLA.
// Se llama al empezar y cada vez que cambia (girar el móvil, cambiar la ventana).
function ajustarPantalla() {
  const ancho = window.innerWidth, alto = window.innerHeight;
  medirMargenSeguro();                              // ★ NUEVO (paso 19)
  canvas.width = ancho;  canvas.height = alto;      // el HUD trabaja en píxeles de pantalla
  canvas.style.width = ancho + "px"; canvas.style.height = alto + "px";
  redimensionar3D(ancho, alto);
}
// ★ NUEVO (paso 19): medir la zona que tapan la muesca y la barrita del iPhone.
// JavaScript no puede leer env(safe-area-inset-left) directamente, así que
// usamos un truco: un <div> invisible con ese relleno (padding) y medimos el relleno.
const medidorSeguro = document.createElement("div");
medidorSeguro.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;" +
  "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
document.body.appendChild(medidorSeguro);
function medirMargenSeguro() {
  const cs = getComputedStyle(medidorSeguro);
  margenSeguro.arr = parseFloat(cs.paddingTop) || 0;
  margenSeguro.der = parseFloat(cs.paddingRight) || 0;
  margenSeguro.aba = parseFloat(cs.paddingBottom) || 0;
  margenSeguro.izq = parseFloat(cs.paddingLeft) || 0;
}

window.addEventListener("resize", ajustarPantalla);
window.addEventListener("orientationchange", () => setTimeout(ajustarPantalla, 300));
ajustarPantalla();

let tiempoAnterior = performance.now();
function bucle(tiempoActual) {
  const dt = Math.min(0.05, (tiempoActual - tiempoAnterior) / 1000);
  tiempoAnterior = tiempoActual;
  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);

// Empezar a cargar las imágenes Y los modelos 3D (.glb) a la vez.
// (el bucle ya está en marcha, así que mientras tanto se ve "Cargando...")
// ahora hay que esperar a DOS cargas. Contamos cuántas faltan.
let cargasPendientes = 3;   // imágenes, modelos .glb y hoja de sprites
function unaCargaMenos() {
  cargasPendientes--;
  if (cargasPendientes === 0) {
    // ★ PASO 20: si solo hay un brawler, empezamos la partida directamente
    if (BRAWLERS.length === 1) empezarPartida(0);
    else estadoJuego = "seleccion";
  }
}
cargarImagenes(unaCargaMenos);
cargarModelosGLB(unaCargaMenos);
cargarSprites(unaCargaMenos);
// ★ NUEVO (paso 19): JUGAR SIN INTERNET.
// Un "service worker" es un pequeño programa (sw.js) que el navegador guarda y
// que se pone en medio entre el juego y la red: guarda una copia de cada archivo
// y, si no hay conexión, entrega esa copia. Solo funciona en una web de verdad
// (https://), no abriendo el archivo con doble clic.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Sin modo offline:", e));
}
