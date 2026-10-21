// =============================================================
//  balas.js — Crear, mover y comprobar impactos de las balas
// =============================================================
const balas = [];

// cada bala guarda su propio daño, alcance y velocidad,
// porque ahora cada brawler dispara balas distintas.
//   datos = { dano, alcance, velocidad, cargaSuper }
function crearBala(desdeX, desdeY, angulo, dueno, datos) {
  balas.push({
    x: desdeX, y: desdeY,
    vx: Math.cos(angulo) * datos.velocidad,
    vy: Math.sin(angulo) * datos.velocidad,
    radio: 6, recorrido: 0,
    alcance: datos.alcance,
    dano: datos.dano,
    cargaSuper: datos.cargaSuper === true,   // ¿este acierto carga el súper?
    altura: datos.altura || 0.45,             // altura en 3D (sale de la boca del fusil)
    dueno: dueno
  });
}

function actualizarBalas(dt) {
  for (const bala of balas) {
    bala.x += bala.vx * dt;
    bala.y += bala.vy * dt;
    bala.recorrido += Math.hypot(bala.vx, bala.vy) * dt;
  }

  for (let i = balas.length - 1; i >= 0; i--) {
    const b = balas[i];
    let borrar = b.recorrido >= b.alcance;
    if (chocaConMuro(b.x, b.y, b.radio)) {
      borrar = true;
      crearParticulas(b.x, b.y, "#d9b38c", 4, 120);   // astillas al chocar
    }

    if (b.dueno === "jugador") {
      for (const e of enemigos) {
        if (!e.muerto && circulosSeTocan(b, e)) {
          herirEnemigo(e, b.dano);
          crearParticulas(b.x, b.y, "#ffffff", 3, 100);
          if (b.cargaSuper) {
            jugador.carga = Math.min(1, jugador.carga + jugador.brawler.cargaPorImpacto);
          }
          borrar = true;
          break;
        }
      }
    } else {
      if (!jugador.muerto && circulosSeTocan(b, jugador)) {
        herirJugador(b.dano);
        borrar = true;
      }
    }

    if (borrar) balas.splice(i, 1);
  }
}
