// =============================================================
//  hud.js — la capa 2D que va ENCIMA del 3D
// =============================================================
//  "HUD" = la información que se pinta encima del juego: marcador,
//  barras de vida, munición, menús... Se dibuja en el lienzo 2D
//  transparente que está encima del lienzo 3D.
//  (Este archivo sustituye a dibujo.js: el mundo ahora lo dibuja escena3d.js)
// =============================================================

function dibujarCirculo(x, y, radio, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  ctx.fill();
}

// Barra con borde oscuro, centrada en (cx, y). "valor" va de 0 a 1.
function dibujarBarra(cx, y, ancho, alto, valor, color) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(cx - ancho / 2 - 2, y - 2, ancho + 4, alto + 4);
  ctx.fillStyle = color;
  ctx.fillRect(cx - ancho / 2, y, ancho * Math.max(0, valor), alto);
}

function textoConBorde(texto, x, y, tamano, color) {
  ctx.font = "bold " + tamano + "px sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "black";
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
  ctx.textAlign = "left";
}

// cabecera más ordenada, con todo ENCIMA de la cabeza y separado:
//
//      MarcStars          <- nombre
//   [██████ 2150 ]        <- barra de vida, con el número DENTRO
//   ─── cabeza ───
//
// y la munición y el súper van a los PIES (como en Brawl Stars), para no
// tapar la cara del personaje.
// aPantalla() (en escena3d.js) convierte una posición 3D en un píxel de la pantalla.
function dibujarCabecera(p, colorVida, nombre) {
  const altura = ((p.brawler && p.brawler.altura3D) || 1.25) * p.radio / 18;
  // ★ CAMBIADO: si es un sprite, usamos el punto real de encima de su cabeza
  const cabeza = (typeof puntoCabezaSprite === "function") ? puntoCabezaSprite(p) : null;
  const s = cabeza ? aPantalla(cabeza.x, cabeza.y, cabeza.altura) : aPantalla(p.x, p.y, altura);
  // Centrar en horizontal con los PIES: con la perspectiva, un punto "encima" en 3D
  // se desplaza un poco hacia los lados, pero el sprite se dibuja siempre derecho.
  s.x = aPantalla(p.x, p.y, 0).x;
  const anchoBarra = 64, altoBarra = 12;
  const yBarra = s.y - altoBarra - 4;                       // la barra acaba 4 px por encima de la cabeza
  dibujarBarra(s.x, yBarra, anchoBarra, altoBarra, p.vida / p.vidaMax, colorVida);
  textoConBorde(Math.round(p.vida), s.x, yBarra + altoBarra - 2, 11, "white");   // número centrado en la barra
  if (nombre) textoConBorde(nombre, s.x, yBarra - 6, 13, "white");             // nombre encima de la barra
  return s;
}

function dibujarMunicionJugador() {
  const pies = aPantalla(jugador.x, jugador.y, 0);          // posición de los pies en pantalla
  const n = jugador.municionMax, ancho = 18, hueco = 3;
  const total = n * ancho + (n - 1) * hueco;
  const y = pies.y + 8;                                     // un poco por debajo de los pies
  for (let i = 0; i < n; i++) {
    const relleno = Math.max(0, Math.min(1, jugador.municion - i));
    const cx = pies.x - total / 2 + i * (ancho + hueco) + ancho / 2;
    dibujarBarra(cx, y, ancho, 6, relleno, relleno === 1 ? "#f39c12" : "#a0601a");
  }
  dibujarBarra(pies.x, y + 11, total, 4, jugador.carga, "#ffd32a");   // súper, debajo de la munición
}

function dibujarHUD() {
  // Personajes (solo los que ves)
  for (const e of enemigos) {
    if (!enemigoVisible(e)) continue;
    const s = dibujarCabecera(e, "#e74c3c", null);
    if (e.estado === "huir") textoConBorde("!", s.x + 34, s.y + 2, 18, "#ffd32a");
  }
  if (!jugador.muerto) {
    const s = dibujarCabecera(jugador, "#2ecc71", jugador.brawler.nombre);
    dibujarMunicionJugador();
  }

  // Números de daño
  for (const ef of efectos) {
    if (ef.tipo !== "texto") continue;
    const p = ef.t / ef.duracion;
    const s = aPantalla(ef.x, ef.y, 2.6 + p * 0.6);   // por encima del nombre, y suben
    ctx.globalAlpha = 1 - p;
    textoConBorde(ef.texto, s.x, s.y, 18, ef.color);
    ctx.globalAlpha = 1;
  }

  // Marcador
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  const yMarcador = margenSeguro.arr;                  // ★ por debajo de la muesca, si la hay
  ctx.fillRect(0, 0, canvas.width, 34 + yMarcador);
  ctx.fillStyle = "white";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("Eliminaciones: " + eliminaciones + "     Récord: " + record, margenSeguro.izq + 12, yMarcador + 23);
  if (jugador.carga >= 1 && !jugador.muerto) {
    ctx.fillStyle = "#ffd32a";
    ctx.textAlign = "right";
    const ayuda = modoTactil ? "¡SÚPER LISTO!" : "¡SÚPER LISTO!  (Espacio, E o clic derecho)";
    ctx.fillText(ayuda, canvas.width - margenSeguro.der - 12, yMarcador + 23);
    ctx.textAlign = "left";
  }

  dibujarControlesTactiles();     // ★ NUEVO: joysticks (tactil.js), solo en el móvil

  if (jugador.muerto) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("¡ELIMINADO!", canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = "20px sans-serif";
    ctx.fillText("Eliminaciones: " + eliminaciones + "  ·  Récord: " + record,
                 canvas.width / 2, canvas.height / 2 - 10);
    ctx.textAlign = "left";
    // ★ NUEVO: botones que se pueden pulsar con el dedo (o el ratón)
    for (const b of botonesMuerte()) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.ancho, b.alto);
      ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.ancho, b.alto);
      textoConBorde(b.texto, b.x + b.ancho / 2, b.y + b.alto / 2 + 7, 18, "white");
    }
  }
}

// ★ NUEVO: botones de la pantalla de ¡ELIMINADO!
function botonesMuerte() {
  const ancho = 200, alto = 50, hueco = 20, y = canvas.height / 2 + 20;
  const x0 = canvas.width / 2 - ancho - hueco / 2;
  return [
    { x: x0, y: y, ancho: ancho, alto: alto, texto: "Reintentar (R)", color: "#27ae60", accion: reiniciar },
    { x: x0 + ancho + hueco, y: y, ancho: ancho, alto: alto, texto: BRAWLERS.length === 1 ? "Menú (M)" : "Cambiar brawler (M)", color: "#2980b9", accion: volverASeleccion }
  ];
}
function pulsarBotonMuerte(x, y) {
  for (const b of botonesMuerte()) {
    if (x >= b.x && x <= b.x + b.ancho && y >= b.y && y <= b.y + b.alto) { b.accion(); return true; }
  }
  return false;
}

// ★ NUEVO: en vertical no se puede jugar bien: pedimos girar el móvil
function dibujarGirarMovil() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("Gira el móvil", canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = "17px sans-serif";
  ctx.fillText("MarcStars se juega en horizontal", canvas.width / 2, canvas.height / 2 + 22);
  ctx.textAlign = "left";
}

// El director: decide qué se dibuja según el estado del juego
function dibujar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);   // el lienzo 2D es transparente
  if (estadoJuego === "cargando") dibujarCargando();
  else if (estadoJuego === "seleccion") dibujarSeleccion();
  else {
    renderizar3D();   // escena3d.js: el mundo
    dibujarHUD();     // y encima, el HUD
  }
  if (canvas.height > canvas.width) dibujarGirarMovil();   // ★ NUEVO
}

// ★ NUEVO: LA PANTALLA DE SELECCIÓN SE DISEÑA EN 960x640 Y SE ESCALA.
// Así cabe igual en un iPhone (más bajito) que en un ordenador.
const ANCHO_DISENO = 960, ALTO_DISENO = 640;
function escalaUI() {
  const e = Math.min(canvas.width / ANCHO_DISENO, canvas.height / ALTO_DISENO);
  return { e: e, ox: (canvas.width - ANCHO_DISENO * e) / 2, oy: (canvas.height - ALTO_DISENO * e) / 2 };
}

function dibujarCargando() {
  ctx.fillStyle = "#2d3436";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Cargando...", canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "left";
}

// ======== PANTALLA DE SELECCIÓN DE BRAWLER ========

// Posición y tamaño de la tarjeta número i.
// Es una función porque la usan el dibujo Y el clic del ratón (entrada.js):
// así los dos están siempre de acuerdo.
function rectTarjeta(i) {
  // con 4 brawlers no caben tarjetas de 220 px: el ancho se calcula
  const hueco = 24, alto = 330;
  const ancho = Math.min(220, (ANCHO_DISENO - 40 - hueco * (BRAWLERS.length - 1)) / BRAWLERS.length);
  const total = BRAWLERS.length * ancho + (BRAWLERS.length - 1) * hueco;
  const inicioX = (ANCHO_DISENO - total) / 2;          // centradas
  return { x: inicioX + i * (ancho + hueco), y: 150, ancho: ancho, alto: alto };
}

// Devuelve el número de tarjeta que hay bajo el ratón, o -1 si ninguna
function tarjetaBajoRaton() {
  // ★ pasar del píxel de la pantalla al "píxel de diseño" (960x640)
  const u = escalaUI();
  const px = (raton.pantallaX - u.ox) / u.e, py = (raton.pantallaY - u.oy) / u.e;
  for (let i = 0; i < BRAWLERS.length; i++) {
    const r = rectTarjeta(i);
    // aquí importa el píxel de la PANTALLA, no el punto del suelo
    if (px >= r.x && px <= r.x + r.ancho && py >= r.y && py <= r.y + r.alto) return i;
  }
  return -1;
}

// Barrita de estadística: "valor" comparado con el mayor de todos los brawlers
function dibujarEstadistica(texto, valor, maximo, x, y) {
  ctx.fillStyle = "#ddd";
  ctx.font = "13px sans-serif";
  ctx.fillText(texto, x, y);
  ctx.fillStyle = "#444";
  ctx.fillRect(x + 75, y - 10, 110, 10);
  ctx.fillStyle = "#ffd32a";
  ctx.fillRect(x + 75, y - 10, 110 * (valor / maximo), 10);
}

function dibujarSeleccion() {
  ctx.fillStyle = "#2d3436";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // ★ NUEVO: todo lo de abajo se dibuja en "coordenadas de diseño" y se escala
  const u = escalaUI();
  ctx.save();
  ctx.translate(u.ox, u.oy);
  ctx.scale(u.e, u.e);

  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText("ELIGE TU BRAWLER", ANCHO_DISENO / 2, 75);
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#bbb";
  // ★ PASO 20: el texto de ayuda depende de cuántos brawlers haya
  const teclas = BRAWLERS.map((b, i) => i + 1).join(", ");
  const ayudaSel = BRAWLERS.length === 1
    ? (modoTactil ? "Toca a MarcStars para empezar la partida" : "Haz clic en MarcStars o pulsa 1 para empezar")
    : (modoTactil ? "Toca una tarjeta para jugar" : "Haz clic en una tarjeta o pulsa " + teclas);
  ctx.fillText(ayudaSel, ANCHO_DISENO / 2, 110);
  ctx.textAlign = "left";

  // Los máximos sirven para que las barras sean comparables entre brawlers.
  // .map() crea una lista nueva con un dato de cada brawler; Math.max(...) coge el mayor.
  const maxVida  = Math.max(...BRAWLERS.map(b => b.vida));
  // daño de un disparo completo = daño de cada bala * balas * tandas de la ráfaga
  const danoDisparo = (b) => b.ataque.dano * b.ataque.balas * (b.ataque.rafaga || 1);
  const maxDano  = Math.max(...BRAWLERS.map(danoDisparo));
  const maxAlc   = Math.max(...BRAWLERS.map(b => b.ataque.alcance));
  const maxVel   = Math.max(...BRAWLERS.map(b => b.velocidad));
  const encima = tarjetaBajoRaton();

  for (let i = 0; i < BRAWLERS.length; i++) {
    const b = BRAWLERS[i];
    const r = rectTarjeta(i);
    const cx = r.x + r.ancho / 2;

    // Fondo de la tarjeta (más claro si el ratón está encima)
    ctx.fillStyle = i === encima ? "#4a5568" : "#3b4252";
    ctx.fillRect(r.x, r.y, r.ancho, r.alto);
    ctx.strokeStyle = i === encima ? "#ffd32a" : b.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(r.x, r.y, r.ancho, r.alto);

    // Número de tecla
    ctx.fillStyle = "#888";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(String(i + 1), r.x + 10, r.y + 22);

    // El personaje
    // el sprite del brawler (girado para que mire hacia arriba)
    const img = IMAGENES[b.sprite];
    if (img && b.retrato) {                         // retrato de frente, sin girar
      ctx.drawImage(img, cx - 60, r.y + 5, 120, 120);
    } else if (img) {
      ctx.save();
      ctx.translate(cx, r.y + 68);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, -50, -50, 100, 100);
      ctx.restore();
    } else {
      dibujarCirculo(cx, r.y + 65, b.radio * 1.8, b.color);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(b.nombre, cx, r.y + 130);
    ctx.fillStyle = b.color;
    ctx.font = "14px sans-serif";
    ctx.fillText(b.rol, cx, r.y + 150);
    ctx.fillStyle = "#ccc";
    ctx.font = "13px sans-serif";
    ctx.fillText(b.descripcion[0], cx, r.y + 175);
    ctx.fillText(b.descripcion[1], cx, r.y + 192);
    ctx.textAlign = "left";

    const sx = r.x + 15;
    dibujarEstadistica("Vida",      b.vida,                          maxVida, sx, r.y + 225);
    dibujarEstadistica("Daño",      danoDisparo(b),                  maxDano, sx, r.y + 247);
    dibujarEstadistica("Alcance",   b.ataque.alcance,                maxAlc,  sx, r.y + 269);
    dibujarEstadistica("Velocidad", b.velocidad,                     maxVel,  sx, r.y + 291);

    ctx.fillStyle = "#ffd32a";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("Súper: " + b.super.nombre, sx, r.y + 318);
  }
  ctx.restore();
}
