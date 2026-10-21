// =============================================================
//  enemigos.js — Los enemigos y su inteligencia
// =============================================================
function crearEnemigo(x, y) {
  return {
    x: x, y: y,
    radio: 18,
    velocidad: 120,
    color: "#e74c3c",
    vidaMax: 1200,
    vida: 1200,
    dirX: 0, dirY: 0,
    tiempoCambio: 0,
    tiempoGolpe: 0,
    tiempoSinDano: 0,
    tiempoRevelado: 0,
    muerto: false,
    tiempoReaparecer: 0,
    alcanceVista: 350,
    cadencia: CONFIG.cadenciaEnemigo,
    tiempoDisparo: 1,
    estado: "pasear",
    empujeX: 0, empujeY: 0,    // velocidad de empuje (la explosión lo lanza)
    angulo: 0, moviendose: false, tiempoAnim: 0   // animación
  };
}

const PUNTOS_SALIDA = [ [60, 30], [740, 570], [740, 30] ];
const enemigos = PUNTOS_SALIDA.map(p => crearEnemigo(p[0], p[1]));

let eliminaciones = 0;
let record = 0;

function herirEnemigo(e, cantidad) {
  e.vida -= cantidad;
  e.tiempoGolpe = 0.1;
  e.tiempoSinDano = 0;
  e.tiempoRevelado = 0.5;
  crearNumeroDano(e.x, e.y - e.radio, cantidad, "#ffffff");
  if (e.vida <= 0) {
    e.vida = 0;
    e.muerto = true;
    e.tiempoReaparecer = 3;
    eliminaciones++;
    crearParticulas(e.x, e.y, "#e74c3c", 18, 260);   // "explota" en trocitos
    record = Math.max(record, eliminaciones);
  }
}


function empujarEnemigo(e, desdeX, desdeY, fuerza) {
  const dx = e.x - desdeX, dy = e.y - desdeY;   // dirección: del centro HACIA el enemigo
  const dist = Math.hypot(dx, dy) || 1;
  e.empujeX = dx / dist * fuerza;
  e.empujeY = dy / dist * fuerza;
}

function actualizarEnemigo(e, dt) {
  if (e.muerto) {
    e.tiempoReaparecer -= dt;
    if (e.tiempoReaparecer <= 0) {
      const pos = posicionLibreAleatoria(e.radio);
      e.x = pos.x; e.y = pos.y;
      e.vida = e.vidaMax;
      e.muerto = false;
      e.tiempoDisparo = 1;
      e.empujeX = 0; e.empujeY = 0;
    }
    return;
  }


  // Multiplicar por un número menor que 1 en cada fotograma lo va apagando.
  // Usamos moverConColisiones para que el empuje no le meta dentro de un muro.
  if (Math.abs(e.empujeX) + Math.abs(e.empujeY) > 5) {
    moverConColisiones(e, e.empujeX * dt, e.empujeY * dt);
    const freno = Math.max(0, 1 - 6 * dt);
    e.empujeX *= freno;
    e.empujeY *= freno;
    return;   // mientras sale volando, no piensa ni dispara
  }

  e.tiempoAnim += dt;
  e.tiempoGolpe -= dt;
  e.tiempoDisparo -= dt;
  e.tiempoRevelado -= dt;
  e.tiempoSinDano += dt;
  if (e.tiempoSinDano > 3) e.vida = Math.min(e.vidaMax, e.vida + e.vidaMax * 0.13 * dt);

  const teVe = !jugador.muerto && puedeVer(e, jugador, e.alcanceVista);
  const dist = Math.hypot(jugador.x - e.x, jugador.y - e.y);
  const dirX = (jugador.x - e.x) / (dist || 1);
  const dirY = (jugador.y - e.y) / (dist || 1);

  if (teVe && e.vida < e.vidaMax * 0.3) {
    e.estado = "huir";
    e.angulo = anguloHacia(e, jugador.x, jugador.y) + Math.PI;   // mira hacia el lado contrario
    e.moviendose = true;
    const choca = moverConColisiones(e, -dirX * e.velocidad * 1.2 * dt, -dirY * e.velocidad * 1.2 * dt);
    if (choca) moverConColisiones(e, -dirY * e.velocidad * dt, dirX * e.velocidad * dt);
  } else if (teVe) {
    e.estado = "atacar";
    e.angulo = anguloHacia(e, jugador.x, jugador.y);   // te apunta
    e.moviendose = dist > 200;
    if (dist > 200) moverConColisiones(e, dirX * e.velocidad * dt, dirY * e.velocidad * dt);
    if (e.tiempoDisparo <= 0) {
      crearBala(e.x, e.y, anguloHacia(e, jugador.x, jugador.y), "enemigo",
                { dano: CONFIG.danoEnemigo, alcance: 350, velocidad: 420 });
      e.tiempoDisparo = e.cadencia;
      e.tiempoRevelado = 1;
    }
  } else {
    e.estado = "pasear";
    e.angulo = Math.atan2(e.dirY, e.dirX);   // mira hacia donde camina
    e.moviendose = true;
    e.tiempoCambio -= dt;
    if (e.tiempoCambio <= 0) {
      const angulo = Math.random() * Math.PI * 2;
      e.dirX = Math.cos(angulo);
      e.dirY = Math.sin(angulo);
      e.tiempoCambio = 1 + Math.random() * 2;
    }
    if (moverConColisiones(e, e.dirX * e.velocidad * dt, e.dirY * e.velocidad * dt)) e.tiempoCambio = 0;
  }
}
