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
  // ★ PASO 22: con un solo brawler, vale tocar el personaje o el botón JUGAR
  if (BRAWLERS.length === 1) {
    const L = layoutPresentacion(), x = raton.pantallaX, y = raton.pantallaY;
    const dentro = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    return (dentro(L.pers) || dentro(L.boton)) ? 0 : -1;
  }
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
  if (BRAWLERS.length === 1) { dibujarPresentacion(); return; }   // ★ PASO 22
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

// =============================================================
// ★ PASO 22: PANTALLA DE PRESENTACIÓN (cuando solo hay un brawler)
// =============================================================
// Como en Brawl Stars: el personaje MUY GRANDE a la izquierda y su ficha
// (nombre, rol, estadísticas, súper y botón JUGAR) a la derecha.
// Aquí NO usamos el diseño fijo de 960x640: medimos la pantalla real para
// aprovecharla entera (y respetamos la muesca del iPhone con margenSeguro).

// Dónde va cada cosa, en píxeles de pantalla. La usan el dibujo Y el toque.
function layoutPresentacion() {
  const izq = margenSeguro.izq, der = canvas.width - margenSeguro.der;
  const arr = margenSeguro.arr, aba = canvas.height - margenSeguro.aba;
  const ancho = der - izq, alto = aba - arr;
  const k = Math.min(ancho / 960, alto / 540);          // "unidad" de tamaño

  // Personaje: lo más grande posible dentro de la mitad izquierda
  const img = IMAGENES.marcGrande;
  const prop = img ? img.width / img.height : 0.7;      // ancho / alto del dibujo
  const zonaAncho = ancho * 0.48;
  let h = alto * 0.9;                                   // casi todo el alto...
  if (h * prop > zonaAncho * 0.95) h = zonaAncho * 0.95 / prop;   // ...sin salirse de su mitad
  const w = h * prop;
  const pies = aba - alto * 0.04;
  const pers = { x: izq + zonaAncho / 2 - w / 2, y: pies - h, w: w, h: h };

  // Ficha a la derecha
  const px = izq + ancho * 0.5, pw = der - px - 24 * k;
  const bw = Math.min(pw, 320 * k), bh = 70 * k;
  const boton = { x: px, y: aba - alto * 0.06 - bh, w: bw, h: bh };
  return { izq, der, arr, aba, ancho, alto, k, pers, panel: { x: px, w: pw }, boton };
}

// Texto grueso con borde negro, alineado a la izquierda (para la ficha)
function textoFicha(texto, x, y, tam, color, borde) {
  ctx.font = "900 " + tam + "px sans-serif";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  if (borde) { ctx.lineWidth = borde; ctx.strokeStyle = "#111"; ctx.strokeText(texto, x, y); }
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
}

// Una fila de estadística: nombre, barra y número
function filaEstadistica(L, texto, valor, maximo, y) {
  const k = L.k, x = L.panel.x, anchoBarra = Math.min(L.panel.w - 200 * k, 260 * k);
  textoFicha(texto, x, y, 20 * k, "#e8ecff", 0);
  const bx = x + 110 * k, by = y - 16 * k, bh = 16 * k;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(bx, by, anchoBarra, bh);
  ctx.fillStyle = "#ffd32a";
  ctx.fillRect(bx, by, anchoBarra * Math.min(1, valor / maximo), bh);
  ctx.strokeStyle = "#111"; ctx.lineWidth = 2 * k; ctx.strokeRect(bx, by, anchoBarra, bh);
  textoFicha(String(valor), bx + anchoBarra + 12 * k, y, 20 * k, "white", 4 * k);
}

function dibujarPresentacion() {
  const L = layoutPresentacion(), k = L.k, b = BRAWLERS[0];
  const t = performance.now() / 1000;                   // segundos, para animar
  const W = canvas.width, H = canvas.height;

  // 1) Fondo: degradado azul -> morado, como el menú de Brawl Stars
  const fondo = ctx.createLinearGradient(0, 0, 0, H);
  fondo.addColorStop(0, "#2a6edc");
  fondo.addColorStop(1, "#4a2a9a");
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, W, H);

  // 2) Rayos de luz que giran despacio detrás del personaje
  const cx = L.pers.x + L.pers.w / 2, cy = L.pers.y + L.pers.h * 0.45;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.08);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  const largo = Math.hypot(W, H);
  for (let i = 0; i < 16; i += 2) {
    const a0 = i * Math.PI / 8, a1 = a0 + Math.PI / 8;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * largo, Math.sin(a0) * largo);
    ctx.lineTo(Math.cos(a1) * largo, Math.sin(a1) * largo);
    ctx.fill();
  }
  ctx.restore();

  // 3) Brillo amarillo detrás del personaje
  const radio = L.pers.h * 0.55;
  const brillo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radio);
  brillo.addColorStop(0, "rgba(255,220,90,0.85)");
  brillo.addColorStop(0.6, "rgba(255,200,40,0.35)");
  brillo.addColorStop(1, "rgba(255,200,40,0)");
  ctx.fillStyle = brillo;
  ctx.beginPath(); ctx.arc(cx, cy, radio, 0, Math.PI * 2); ctx.fill();

  // 4) Sombra en el suelo y el personaje (respira: sube y baja un poquito)
  const pies = L.pers.y + L.pers.h;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(cx, pies - 4 * k, L.pers.w * 0.42, 14 * k, 0, 0, Math.PI * 2); ctx.fill();
  const img = IMAGENES.marcGrande || IMAGENES.marc;
  if (img) {
    const respira = Math.sin(t * 2.2) * 0.012;          // 1,2 % más alto / más bajo
    const h = L.pers.h * (1 + respira), w = L.pers.w * (1 - respira * 0.5);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";               // borde oscuro suave alrededor
    ctx.shadowBlur = 14 * k;
    ctx.drawImage(img, cx - w / 2, pies - h, w, h);
    ctx.restore();
  }

  // 5) La ficha de la derecha
  const x = L.panel.x;
  let y = L.arr + L.alto * 0.17;
  textoFicha("BRAWLER", x, y, 18 * k, "#ffd32a", 4 * k);
  y += 62 * k;
  textoFicha(b.nombre.toUpperCase(), x, y, 60 * k, "white", 8 * k);
  // etiqueta del rol
  y += 16 * k;
  ctx.font = "900 " + 18 * k + "px sans-serif";
  const rw = ctx.measureText(b.rol.toUpperCase()).width + 24 * k;
  ctx.fillStyle = b.color;
  ctx.fillRect(x, y, rw, 30 * k);
  ctx.strokeStyle = "#111"; ctx.lineWidth = 2 * k; ctx.strokeRect(x, y, rw, 30 * k);
  textoFicha(b.rol.toUpperCase(), x + 12 * k, y + 22 * k, 18 * k, "white", 3 * k);
  y += 62 * k;
  textoFicha(b.descripcion.join(" "), x, y, 18 * k, "#e8ecff", 0);

  // estadísticas (con un máximo de referencia, para que las barras signifiquen algo)
  const a = b.ataque;
  const dano = a.dano * a.balas * (a.rafaga || 1);
  y += 44 * k; filaEstadistica(L, "Vida",      b.vida,      5000, y);
  y += 32 * k; filaEstadistica(L, "Daño",      dano,        1500, y);
  y += 32 * k; filaEstadistica(L, "Alcance",   a.alcance,   700,  y);
  y += 32 * k; filaEstadistica(L, "Velocidad", b.velocidad, 350,  y);
  y += 40 * k;
  textoFicha("SÚPER: " + b.super.nombre.toUpperCase(), x, y, 20 * k, "#ffd32a", 4 * k);

  // 6) Botón JUGAR (late un poco para invitar a pulsarlo)
  const bt = L.boton, late = 1 + Math.sin(t * 4) * 0.03;
  ctx.save();
  ctx.translate(bt.x + bt.w / 2, bt.y + bt.h / 2);
  ctx.scale(late, late);
  const g = ctx.createLinearGradient(0, -bt.h / 2, 0, bt.h / 2);
  g.addColorStop(0, "#ffe46b"); g.addColorStop(1, "#ffb300");
  ctx.fillStyle = "#111";
  ctx.fillRect(-bt.w / 2 - 3 * k, -bt.h / 2 + 3 * k, bt.w + 6 * k, bt.h + 3 * k);   // sombra de abajo
  ctx.fillStyle = g;
  ctx.fillRect(-bt.w / 2, -bt.h / 2, bt.w, bt.h);
  ctx.strokeStyle = "#111"; ctx.lineWidth = 4 * k; ctx.strokeRect(-bt.w / 2, -bt.h / 2, bt.w, bt.h);
  ctx.font = "900 " + 34 * k + "px sans-serif";
  ctx.textAlign = "center"; ctx.lineJoin = "round";
  ctx.lineWidth = 6 * k; ctx.strokeStyle = "#111"; ctx.strokeText("JUGAR", 0, 12 * k);
  ctx.fillStyle = "white"; ctx.fillText("JUGAR", 0, 12 * k);
  ctx.restore();
  ctx.textAlign = "left";
}
