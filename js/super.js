// =============================================================
//  super.js — Los súper: cada brawler tiene uno distinto
// =============================================================
//  usarSuper() mira el "tipo" de súper del brawler
//  y hace una cosa u otra. Hay tres tipos:
//    "bomba"     -> Chispa: lanza una bomba que explota en área
//    "embestida" -> Ruda: carga hacia delante rompiendo muros
//    "nova"      -> Pluma: dispara balas en todas direcciones
// =============================================================
const bombas = [];

// Punto al que apunta el súper, sin pasar de su alcance
function destinoSuper(alcance) {
  const dx = raton.x - jugador.x, dy = raton.y - jugador.y;
  const dist = Math.hypot(dx, dy) || 1;
  const d = Math.min(dist, alcance);
  return { x: jugador.x + dx / dist * d, y: jugador.y + dy / dist * d };
}

function usarSuper() {
  if (!jugador || jugador.muerto || jugador.carga < 1 || jugador.embestida) return;
  const s = jugador.brawler.super;

  if (s.tipo === "bomba") {
    const destino = destinoSuper(s.alcance);
    bombas.push({
      desdeX: jugador.x, desdeY: jugador.y,
      haciaX: destino.x, haciaY: destino.y,
      t: 0, x: jugador.x, y: jugador.y, altura: 0,
      radio: s.radio, dano: s.dano,           // la bomba guarda sus datos
      estilo: s.estilo || "bomba"             // "granada" se dibuja distinta
    });

  } else if (s.tipo === "embestida") {
    const angulo = anguloHacia(jugador, raton.x, raton.y);
    jugador.embestida = {
      dirX: Math.cos(angulo),
      dirY: Math.sin(angulo),
      recorrido: 0,
      golpeados: []           // para no golpear dos veces al mismo enemigo
    };

  } else if (s.tipo === "nova") {
    for (let i = 0; i < s.balas; i++) {
      const angulo = (i / s.balas) * Math.PI * 2;   // repartidas en 360º
      crearBala(jugador.x, jugador.y, angulo, "jugador",
                { dano: s.dano, alcance: s.alcance, velocidad: 500, cargaSuper: false });
    }
  }

  jugador.carga = 0;
  jugador.tiempoRevelado = 1;
}

function explotar(x, y, radio, dano) {
  for (const e of enemigos) {
    if (!e.muerto && Math.hypot(e.x - x, e.y - y) < radio + e.radio) {
      herirEnemigo(e, dano);
      if (!e.muerto) empujarEnemigo(e, x, y, CONFIG.superEmpuje);
    }
  }
  for (let i = muros.length - 1; i >= 0; i--) {
    if (circuloTocaRect(x, y, radio, muros[i])) {
      const m = muros[i];
      crearParticulas(m.x + TAM / 2, m.y + TAM / 2, "#a0663f", 10, 220);   // trozos de caja
      muros.splice(i, 1);
    }
  }
  crearExplosion(x, y, radio);
  sacudirPantalla(0.35);
}

// la embestida de Ruda
function actualizarEmbestida(dt) {
  const em = jugador.embestida;
  if (!em) return;
  const s = jugador.brawler.super;
  const paso = CONFIG.embestidaVelocidad * dt;

  // 1) Romper los muros que vamos a atravesar ANTES de movernos
  const sigX = jugador.x + em.dirX * paso;
  const sigY = jugador.y + em.dirY * paso;
  for (let i = muros.length - 1; i >= 0; i--) {
    const m = muros[i];
    if (circuloTocaRect(sigX, sigY, jugador.radio + 2, m)) {
      crearExplosion(m.x + TAM / 2, m.y + TAM / 2, 22);   // explosión pequeñita
      crearParticulas(m.x + TAM / 2, m.y + TAM / 2, "#a0663f", 10, 220);
      sacudirPantalla(0.15);
      muros.splice(i, 1);
    }
  }

  // 2) Movernos. El agua y los bordes SÍ nos frenan.
  const choca = moverConColisiones(jugador, em.dirX * paso, em.dirY * paso);
  em.recorrido += paso;

  // 3) Golpear a los enemigos que toquemos (una sola vez a cada uno)
  for (const e of enemigos) {
    if (!e.muerto && !em.golpeados.includes(e) && circulosSeTocan(jugador, e)) {
      em.golpeados.push(e);
      herirEnemigo(e, s.dano);
      if (!e.muerto) empujarEnemigo(e, jugador.x, jugador.y, CONFIG.superEmpuje);
    }
  }

  // 4) Terminar si hemos llegado al alcance o nos hemos chocado
  if (em.recorrido >= s.alcance || choca) jugador.embestida = null;
}

function actualizarSuper(dt) {
  for (let i = bombas.length - 1; i >= 0; i--) {
    const b = bombas[i];
    b.t += dt;
    const p = Math.min(1, b.t / CONFIG.superDuracionVuelo);
    b.x = b.desdeX + (b.haciaX - b.desdeX) * p;   // lerp
    b.y = b.desdeY + (b.haciaY - b.desdeY) * p;
    b.altura = Math.sin(p * Math.PI) * 70;        // parábola
    if (p >= 1) {
      explotar(b.haciaX, b.haciaY, b.radio, b.dano);
      bombas.splice(i, 1);
    }
  }
  if (jugador && !jugador.muerto) actualizarEmbestida(dt);
}
