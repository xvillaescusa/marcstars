// =============================================================
//  tactil.js — ★ NUEVO: controles táctiles como en Brawl Stars
// =============================================================
//  En el móvil no hay teclado ni ratón, así que usamos "joysticks
//  virtuales" dibujados en la pantalla:
//
//   · IZQUIERDA (joystick de movimiento): pon el dedo en cualquier
//     sitio de la mitad izquierda y arrástralo. El joystick aparece
//     donde tocas (como en Brawl Stars).
//
//   · DERECHA (botón de ataque, rojo):
//       - TOQUE RÁPIDO  -> dispara solo al enemigo más cercano (auto-apuntado)
//       - ARRASTRAR     -> apuntas (se ve la línea en el suelo) y al
//                          SOLTAR el dedo dispara hacia allí
//
//   · BOTÓN AMARILLO (súper): igual que el de ataque, pero solo
//     funciona cuando el súper está cargado.
//
//  Cada dedo tiene un número (identifier). Así sabemos qué dedo
//  mueve qué joystick aunque toques con dos a la vez.
// =============================================================

let modoTactil = false;                 // se activa con el primer toque
const RADIO_JOYSTICK = 60;              // cuánto puedes alejar el dedo del centro
const ZONA_MUERTA = 0.22;               // por debajo de esto, el toque cuenta como "toque rápido"

function crearJoystick() {
  return { activo: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
}
const joyMov = crearJoystick();         // movimiento
const joyAtq = crearJoystick();         // ataque
const joySup = crearJoystick();         // súper

// Hacia dónde apunta el personaje, RELATIVO a él (en píxeles del mundo).
// El ratón "virtual" se recoloca en cada fotograma: jugador + apunte.
const apunteTactil = { x: 100, y: 0 };

// Posición de los botones (en píxeles de la pantalla). Son funciones porque
// la pantalla puede cambiar de tamaño (girar el móvil).
function posBotonAtaque() { return { x: canvas.width - margenSeguro.der - 105, y: canvas.height - margenSeguro.aba - 100, r: 52 }; }
function posBotonSuper()  { return { x: canvas.width - margenSeguro.der - 215, y: canvas.height - margenSeguro.aba - 62,  r: 38 }; }
function posJoyMovReposo() { return { x: margenSeguro.izq + 120, y: canvas.height - margenSeguro.aba - 110 }; }

function largoJoy(j) { return Math.hypot(j.dx, j.dy); }

function empezarJoy(j, id, x, y) { j.activo = true; j.id = id; j.baseX = x; j.baseY = y; j.dx = 0; j.dy = 0; }
function moverJoy(j, x, y) {
  let dx = (x - j.baseX) / RADIO_JOYSTICK, dy = (y - j.baseY) / RADIO_JOYSTICK;
  const l = Math.hypot(dx, dy);
  if (l > 1) { dx /= l; dy /= l; }                 // no pasar del borde del círculo
  j.dx = dx; j.dy = dy;
}
function soltarJoy(j) { j.activo = false; j.id = null; j.dx = 0; j.dy = 0; }

// Coordenadas de un dedo dentro del lienzo
function posDedo(t) {
  const r = canvas.getBoundingClientRect();
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}

// ---------- Auto-apuntado: el enemigo visible más cercano dentro del alcance ----------
function enemigoMasCercano(alcance) {
  let mejor = null, mejorDist = alcance;
  for (const e of enemigos) {
    if (e.muerto || !enemigoVisible(e)) continue;
    const d = Math.hypot(e.x - jugador.x, e.y - jugador.y);
    if (d < mejorDist) { mejor = e; mejorDist = d; }
  }
  return mejor;
}

// Poner el "ratón virtual" en una dirección del joystick (dx, dy) a cierta distancia.
// En pantalla, arriba = norte del mapa y derecha = este, así que el joystick
// se traduce directamente al mapa.
function apuntarCon(dx, dy, distancia) {
  const l = Math.hypot(dx, dy) || 1;
  apunteTactil.x = dx / l * distancia;
  apunteTactil.y = dy / l * distancia;
}

function soltarAtaque() {
  const a = jugador.brawler.ataque;
  if (largoJoy(joyAtq) > ZONA_MUERTA) {
    apuntarCon(joyAtq.dx, joyAtq.dy, a.alcance);   // disparo apuntado
  } else {
    const e = enemigoMasCercano(a.alcance * 1.05);  // toque rápido: auto-apuntado
    if (e) { apunteTactil.x = e.x - jugador.x; apunteTactil.y = e.y - jugador.y; }
  }
  actualizarRatonTactil();
  intentarDisparo();
}

function soltarSuper() {
  const s = jugador.brawler.super;
  if (largoJoy(joySup) > ZONA_MUERTA) {
    // Como en Brawl Stars: cuanto más arrastras, más lejos va (la bomba)
    apuntarCon(joySup.dx, joySup.dy, (s.alcance || 300) * Math.min(1, largoJoy(joySup)));
  } else {
    const e = enemigoMasCercano(s.alcance || 300);
    if (e) { apunteTactil.x = e.x - jugador.x; apunteTactil.y = e.y - jugador.y; }
  }
  actualizarRatonTactil();
  usarSuper();
}

// ---------- Eventos de los dedos ----------
function alTocar(ev) {
  ev.preventDefault();               // que el navegador no haga zoom ni scroll
  modoTactil = true;
  for (const t of ev.changedTouches) {
    const p = posDedo(t);
    raton.pantallaX = p.x; raton.pantallaY = p.y;

    if (estadoJuego === "seleccion") {
      const i = tarjetaBajoRaton();
      if (i !== -1) empezarPartida(i);
      continue;
    }
    if (estadoJuego !== "jugando") continue;
    if (jugador.muerto) { pulsarBotonMuerte(p.x, p.y); continue; }

    const bs = posBotonSuper();
    if (p.x < canvas.width * 0.45) {
      if (!joyMov.activo) empezarJoy(joyMov, t.identifier, p.x, p.y);   // aparece donde tocas
    } else if (Math.hypot(p.x - bs.x, p.y - bs.y) < bs.r * 1.4 && jugador.carga >= 1) {
      if (!joySup.activo) empezarJoy(joySup, t.identifier, bs.x, bs.y);
    } else {
      const ba = posBotonAtaque();
      if (!joyAtq.activo) empezarJoy(joyAtq, t.identifier, ba.x, ba.y);
      moverJoy(joyAtq, p.x, p.y);
    }
  }
}

function alMoverDedo(ev) {
  ev.preventDefault();
  for (const t of ev.changedTouches) {
    const p = posDedo(t);
    if (t.identifier === joyMov.id) moverJoy(joyMov, p.x, p.y);
    if (t.identifier === joyAtq.id) moverJoy(joyAtq, p.x, p.y);
    if (t.identifier === joySup.id) moverJoy(joySup, p.x, p.y);
  }
}

function alSoltarDedo(ev) {
  ev.preventDefault();
  for (const t of ev.changedTouches) {
    if (t.identifier === joyMov.id) soltarJoy(joyMov);
    if (t.identifier === joyAtq.id) { if (estadoJuego === "jugando" && !jugador.muerto) soltarAtaque(); soltarJoy(joyAtq); }
    if (t.identifier === joySup.id) { if (estadoJuego === "jugando" && !jugador.muerto) soltarSuper(); soltarJoy(joySup); }
  }
}

canvas.addEventListener("touchstart", alTocar, { passive: false });
canvas.addEventListener("touchmove", alMoverDedo, { passive: false });
canvas.addEventListener("touchend", alSoltarDedo, { passive: false });
canvas.addEventListener("touchcancel", alSoltarDedo, { passive: false });
// En iPhone, evitar el zoom con dos dedos
document.addEventListener("gesturestart", (e) => e.preventDefault());

// ---------- Se llama en cada fotograma (desde principal.js) ----------
function actualizarRatonTactil() {
  raton.x = jugador.x + apunteTactil.x;
  raton.y = jugador.y + apunteTactil.y;
}

function actualizarTactil() {
  if (!modoTactil || !jugador) return;
  // Mientras arrastras ataque o súper, el ratón virtual sigue al joystick
  if (joyAtq.activo && largoJoy(joyAtq) > ZONA_MUERTA) apuntarCon(joyAtq.dx, joyAtq.dy, jugador.brawler.ataque.alcance);
  else if (joySup.activo && largoJoy(joySup) > ZONA_MUERTA) {
    const s = jugador.brawler.super;
    apuntarCon(joySup.dx, joySup.dy, (s.alcance || 300) * Math.min(1, largoJoy(joySup)));
  }
  // Si no estás apuntando, el personaje mira hacia donde camina
  else if (joyMov.activo && largoJoy(joyMov) > ZONA_MUERTA) apuntarCon(joyMov.dx, joyMov.dy, 100);
  actualizarRatonTactil();
}

// Dirección de movimiento del joystick (la usa jugador.js). null si no se mueve.
function movimientoTactil() {
  if (!joyMov.activo || largoJoy(joyMov) < 0.15) return null;
  return { x: joyMov.dx, y: joyMov.dy };
}

// ¿Hay que enseñar la línea de apuntado? En el móvil, solo mientras apuntas.
function apuntandoTactil() { return joyAtq.activo && largoJoy(joyAtq) > ZONA_MUERTA; }
function apuntandoSuperTactil() { return joySup.activo && largoJoy(joySup) > ZONA_MUERTA; }

// ---------- Dibujar los controles (lo llama hud.js) ----------
function dibujarCirculoBorde(x, y, r, relleno, borde, grosor) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = grosor || 3; ctx.stroke(); }
}

function dibujarControlesTactiles() {
  if (!modoTactil || jugador.muerto) return;

  // Joystick de movimiento
  const m = joyMov.activo ? { x: joyMov.baseX, y: joyMov.baseY } : posJoyMovReposo();
  dibujarCirculoBorde(m.x, m.y, RADIO_JOYSTICK, "rgba(0,0,0,0.25)", "rgba(255,255,255,0.35)", 3);
  dibujarCirculoBorde(m.x + joyMov.dx * RADIO_JOYSTICK, m.y + joyMov.dy * RADIO_JOYSTICK, 26,
                      "rgba(80,160,255,0.85)", "white", 3);

  // Botón de ataque (rojo) con su "palanca"
  const a = posBotonAtaque();
  dibujarCirculoBorde(a.x, a.y, a.r + 10, joyAtq.activo ? "rgba(0,0,0,0.3)" : null, null);
  dibujarCirculoBorde(a.x + joyAtq.dx * RADIO_JOYSTICK, a.y + joyAtq.dy * RADIO_JOYSTICK, joyAtq.activo ? 30 : a.r,
                      jugador.municion >= 1 ? "rgba(231,76,60,0.9)" : "rgba(120,60,60,0.8)", "white", 3);
  if (!joyAtq.activo) {                         // mira de "diana" en el botón
    ctx.strokeStyle = "white"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(a.x, a.y, 16, 0, Math.PI * 2);
    ctx.moveTo(a.x - 26, a.y); ctx.lineTo(a.x + 26, a.y); ctx.moveTo(a.x, a.y - 26); ctx.lineTo(a.x, a.y + 26);
    ctx.stroke();
  }

  // Botón del súper (amarillo): un anillo que se va llenando con la carga
  const s = posBotonSuper();
  const listo = jugador.carga >= 1;
  dibujarCirculoBorde(s.x + joySup.dx * RADIO_JOYSTICK, s.y + joySup.dy * RADIO_JOYSTICK, joySup.activo ? 26 : s.r,
                      listo ? "rgba(255,211,42,0.95)" : "rgba(60,60,60,0.7)", null);
  ctx.strokeStyle = "#ffd32a"; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * jugador.carga);
  ctx.stroke();
  textoConBorde("SÚPER", s.x, s.y + 5, 12, listo ? "#3b2a00" : "#bbbbbb");
}
