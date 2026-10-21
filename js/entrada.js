// =============================================================
//  entrada.js — Teclado y ratón
// =============================================================
const teclas = {};
// ahora hay DOS posiciones del ratón:
//   pantallaX/pantallaY -> píxel de la pantalla donde está la flecha
//   x / y              -> punto del SUELO del mapa que hay debajo.
// Con la cámara inclinada ya no son lo mismo. escena3d.js calcula x/y
// lanzando un "rayo" desde la cámara a través del ratón hasta el suelo.
const raton = { x: 0, y: 0, pantallaX: 400, pantallaY: 300, pulsado: false };

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  teclas[k] = true;
  if (e.key.startsWith("Arrow") || k === " ") e.preventDefault();

  // cada tecla hace cosas distintas según el ESTADO del juego
  if (estadoJuego === "cargando") return;   // aún no hay nada que controlar

  if (estadoJuego === "seleccion") {
    // "1", "2", "3"... -> número - 1 = posición en la lista BRAWLERS
    const n = parseInt(k);                      // convierte "2" en 2 (o NaN si no es número)
    if (n >= 1 && n <= BRAWLERS.length) empezarPartida(n - 1);
    return;
  }

  if (jugador.muerto) {
    if (k === "r") reiniciar();
    if (k === "m") volverASeleccion();
    return;
  }
  if ((k === " " || k === "e") && !e.repeat) usarSuper();
});
window.addEventListener("keyup", (e) => { teclas[e.key.toLowerCase()] = false; });

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  raton.pantallaX = e.clientX - rect.left;
  raton.pantallaY = e.clientY - rect.top;
});
canvas.addEventListener("mousedown", (e) => {
  // en la selección, el clic elige la tarjeta que hay debajo del ratón
  if (estadoJuego === "cargando") return;
  if (estadoJuego === "seleccion") {
    const i = tarjetaBajoRaton();
    if (i !== -1) empezarPartida(i);
    return;
  }
  if (jugador.muerto) {                                 // ★ NUEVO: botones de la pantalla final
    const r = canvas.getBoundingClientRect();
    pulsarBotonMuerte(e.clientX - r.left, e.clientY - r.top);
    return;
  }
  if (e.button === 0) raton.pulsado = true;
  if (e.button === 2) usarSuper();
});
window.addEventListener("mouseup", () => { raton.pulsado = false; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
