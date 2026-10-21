// =============================================================
//  mapa.js — El mapa, las colisiones y la visibilidad
// =============================================================
// "#" = muro   "." = suelo   "*" = arbusto   "~" = agua
const TAM = 40;
const mapaTexto = [
  "....................",
  ".***............***.",
  "..###..........###..",
  "..#...~~~~~~.....#..",
  "......**....**......",
  "........####........",
  ".....#...****...#...",
  ".....#..........#...",
  ".....#..........#...",
  "........####........",
  "......**....**......",
  "..#.....~~~~~~...#..",
  "..###..........###..",
  ".***............***.",
  "...................."
];

// tamaño del MUNDO (en píxeles lógicos). Antes usábamos el tamaño del
// canvas, pero ahora la pantalla y el mundo son cosas distintas (la cámara 3D
// enseña el mundo inclinado y con perspectiva).
const MUNDO_ANCHO = mapaTexto[0].length * TAM;   // 20 casillas * 40 = 800
const MUNDO_ALTO  = mapaTexto.length * TAM;      // 15 casillas * 40 = 600

const muros = [], aguas = [], arbustos = [];

function construirMapa() {
  muros.length = 0; aguas.length = 0; arbustos.length = 0;
  for (let fila = 0; fila < mapaTexto.length; fila++) {
    for (let col = 0; col < mapaTexto[fila].length; col++) {
      const letra = mapaTexto[fila][col];
      const casilla = { x: col * TAM, y: fila * TAM, ancho: TAM, alto: TAM };
      if (letra === "#") muros.push(casilla);
      if (letra === "~") aguas.push(casilla);
      if (letra === "*") arbustos.push(casilla);
    }
  }
}
construirMapa();

function letraEn(x, y) {
  const col = Math.floor(x / TAM);
  const fila = Math.floor(y / TAM);
  if (fila < 0 || fila >= mapaTexto.length || col < 0 || col >= mapaTexto[0].length) return "#";
  return mapaTexto[fila][col];
}

function estaEnArbusto(p) {
  return letraEn(p.x, p.y) === "*";
}

// --- Colisiones ---
function circuloTocaRect(cx, cy, radio, r) {
  const masCercanoX = Math.max(r.x, Math.min(cx, r.x + r.ancho));
  const masCercanoY = Math.max(r.y, Math.min(cy, r.y + r.alto));
  return Math.hypot(cx - masCercanoX, cy - masCercanoY) < radio;
}

function tocaAlguno(cx, cy, radio, lista) {
  for (const r of lista) {
    if (circuloTocaRect(cx, cy, radio, r)) return true;
  }
  return false;
}

function chocaConMuro(cx, cy, radio)      { return tocaAlguno(cx, cy, radio, muros); }
function chocaConObstaculo(cx, cy, radio) { return chocaConMuro(cx, cy, radio) || tocaAlguno(cx, cy, radio, aguas); }

function circulosSeTocan(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.radio + b.radio;
}

// Mueve a un personaje eje por eje. Devuelve true si ha chocado.
function moverConColisiones(p, pasoX, pasoY) {
  let choca = false;
  p.x += pasoX;
  if (chocaConObstaculo(p.x, p.y, p.radio) || p.x < p.radio || p.x > MUNDO_ANCHO - p.radio) {
    p.x -= pasoX;
    choca = true;
  }
  p.y += pasoY;
  if (chocaConObstaculo(p.x, p.y, p.radio) || p.y < p.radio || p.y > MUNDO_ALTO - p.radio) {
    p.y -= pasoY;
    choca = true;
  }
  return choca;
}

// --- Visibilidad ---
function hayVision(x1, y1, x2, y2) {
  const pasos = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 10);
  for (let i = 1; i < pasos; i++) {
    const t = i / pasos;
    if (chocaConMuro(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 1)) return false;
  }
  return true;
}

function puedeVer(observador, objetivo, alcance) {
  const dist = Math.hypot(objetivo.x - observador.x, objetivo.y - observador.y);
  if (dist > alcance) return false;
  if (!hayVision(observador.x, observador.y, objetivo.x, objetivo.y)) return false;
  if (estaEnArbusto(objetivo) && dist > CONFIG.distanciaRevelar && objetivo.tiempoRevelado <= 0) {
    return false;
  }
  return true;
}

function posicionLibreAleatoria(radio) {
  let x, y;
  do {
    x = radio + Math.random() * (MUNDO_ANCHO  - radio * 2);
    y = radio + Math.random() * (MUNDO_ALTO - radio * 2);
  } while (chocaConObstaculo(x, y, radio));
  return { x: x, y: y };
}

function anguloHacia(desde, haciaX, haciaY) {
  return Math.atan2(haciaY - desde.y, haciaX - desde.x);
}
