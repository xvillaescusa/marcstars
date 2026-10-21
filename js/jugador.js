// =============================================================
//  jugador.js — El jugador: datos, movimiento, disparo y vida
// =============================================================

// el jugador ya no existe desde el principio.
// Se crea al elegir brawler (antes de eso vale null = "nada").
let jugador = null;
let brawlerElegido = 0;

// crear el jugador a partir de los datos de un brawler
function crearJugador(b) {
  return {
    brawler: b,                 // guardamos sus datos para consultarlos luego
    x: 400, y: 300,
    radio: b.radio,
    velocidad: b.velocidad,
    color: b.color,
    cadencia: b.cadencia,
    tiempoRecarga: 0,
    municionMax: b.municionMax,
    municion: b.municionMax,
    tiempoPorCarga: b.tiempoPorCarga,
    tiempoDesdeDisparo: 99,
    vidaMax: b.vida,
    vida: b.vida,
    tiempoSinDano: 0,
    tiempoGolpe: 0,
    tiempoRevelado: 0,
    muerto: false,
    carga: 0,
    embestida: null,
    rafagaRestante: 0,          // balas de la ráfaga que faltan por salir
    tiempoRafaga: 0,            // datos de la embestida mientras dura   // datos solo para la animación
    angulo: 0,                  // hacia dónde mira (en radianes)
    moviendose: false,          // para el "rebote" al caminar
    tiempoAnim: 0
  };
}

// un solo código de disparo para todos los brawlers.
// Si "balas" es 1, sale una. Si es 5, salen 5 repartidas en abanico.
// el disparo se divide en dos funciones.
// dispararTanda() saca UNA tanda de balas (1 bala, o el abanico de la escopeta).
// dispararJugador() decide cuántas tandas: 1 normalmente, 3 seguidas si hay ráfaga.
function dispararJugador() {
  const a = jugador.brawler.ataque;
  // ★ PASO 21: LA DIRECCIÓN SE DECIDE UNA SOLA VEZ, al soltar el botón (o hacer clic).
  // Toda la ráfaga usa ESE ángulo, aunque luego te muevas o el apuntado cambie.
  jugador.anguloRafaga = anguloDeDisparo();
  dispararTanda(jugador.anguloRafaga);
  if (a.rafaga > 1) {
    jugador.rafagaRestante = a.rafaga - 1;       // las demás salen después, una a una
    jugador.tiempoRafaga = a.intervaloRafaga;
  }
}

// ★ PASO 21: el ángulo de disparo en ESTE momento (hacia el ratón / donde apunta el dedo)
function anguloDeDisparo() {
  let angulo = anguloHacia(jugador, raton.x, raton.y);
  // Si el personaje es un sprite, la bala sale de la boca del fusil: apuntamos
  // desde la boca hacia el objetivo, para que la línea pase justo por donde apuntas.
  const boca = (typeof obtenerBocaFusil === "function") ? obtenerBocaFusil(jugador, angulo) : null;
  if (boca && Math.hypot(raton.x - boca.x, raton.y - boca.y) > 40) {
    angulo = anguloHacia(boca, raton.x, raton.y);
  }
  return angulo;
}

// Saca UNA tanda de balas en la dirección "angulo" (fija para toda la ráfaga).
// La bala sale de la boca del fusil, desde donde esté el personaje AHORA.
function dispararTanda(angulo) {
  const a = jugador.brawler.ataque;
  const boca = (typeof obtenerBocaFusil === "function") ? obtenerBocaFusil(jugador, angulo) : null;
  const origen = boca || { x: jugador.x, y: jugador.y, altura: 0.45 };
  jugador.contadorDisparos = (jugador.contadorDisparos || 0) + 1;   // avisa al sprite
  // dispersión al azar entre -dispersion y +dispersion grados (0 = todas en línea)
  if (a.dispersion) angulo += (Math.random() - 0.5) * 2 * a.dispersion * Math.PI / 180;
  const abertura = a.abertura * Math.PI / 180;
  for (let i = 0; i < a.balas; i++) {
    // Con 5 balas, (i - 2) da -2, -1, 0, 1, 2 -> centradas en el ratón
    const giro = (i - (a.balas - 1) / 2) * abertura;
    crearBala(origen.x, origen.y, angulo + giro, "jugador",
              { dano: a.dano, alcance: a.alcance, velocidad: a.velocidadBala, cargaSuper: true,
                altura: origen.altura });                // a qué altura vuela (para el 3D)
  }
  jugador.tiempoRevelado = 1;
  jugador.tiempoDesdeDisparo = 0;
}

function herirJugador(cantidad) {
  jugador.vida -= cantidad;
  jugador.tiempoSinDano = 0;
  jugador.tiempoGolpe = 0.1;
  crearNumeroDano(jugador.x, jugador.y - jugador.radio, cantidad, "#ff6b6b");
  if (jugador.vida <= 0) {
    jugador.vida = 0;
    jugador.muerto = true;
    jugador.embestida = null;
  }
}

function actualizarJugador(dt) {
  if (jugador.muerto) return;

  jugador.tiempoGolpe -= dt;
  jugador.tiempoRevelado -= dt;
  jugador.tiempoSinDano += dt;
  if (jugador.tiempoSinDano > 3) {
    jugador.vida = Math.min(jugador.vidaMax, jugador.vida + jugador.vidaMax * 0.13 * dt);
  }

  // durante la embestida no controlas al personaje (lo mueve super.js)   // mirar siempre hacia el ratón
  jugador.angulo = anguloHacia(jugador, raton.x, raton.y);
  // ★ PASO 21: mientras sale la ráfaga, el personaje sigue mirando hacia donde disparó
  if ((jugador.rafagaRestante > 0 || jugador.tiempoDesdeDisparo < 0.35) && jugador.anguloRafaga !== undefined) jugador.angulo = jugador.anguloRafaga;
  jugador.tiempoAnim += dt;

  if (jugador.embestida) return;

  let mx = 0, my = 0;
  // ★ NUEVO: en el móvil, el joystick de la izquierda (tactil.js)
  const tactil = (typeof movimientoTactil === "function") ? movimientoTactil() : null;
  if (tactil) { mx = tactil.x; my = tactil.y; }
  if (teclas["arrowup"]    || teclas["w"]) my -= 1;
  if (teclas["arrowdown"]  || teclas["s"]) my += 1;
  if (teclas["arrowleft"]  || teclas["a"]) mx -= 1;
  if (teclas["arrowright"] || teclas["d"]) mx += 1;
  const largo = Math.hypot(mx, my);
  jugador.moviendose = largo > 0;
  if (largo > 0) {
    moverConColisiones(jugador,
      (mx / largo) * jugador.velocidad * dt,
      (my / largo) * jugador.velocidad * dt);
  }

  jugador.tiempoDesdeDisparo += dt;
  if (jugador.tiempoDesdeDisparo > CONFIG.pausaRecarga) {
    jugador.municion = Math.min(jugador.municionMax,
                                jugador.municion + dt / jugador.tiempoPorCarga);
  }

  // ir sacando las balas pendientes de la ráfaga
  if (jugador.rafagaRestante > 0) {
    jugador.tiempoRafaga -= dt;
    if (jugador.tiempoRafaga <= 0) {
      dispararTanda(jugador.anguloRafaga);       // ★ misma dirección que la primera bala
      jugador.rafagaRestante--;
      jugador.tiempoRafaga = jugador.brawler.ataque.intervaloRafaga;
    }
  }

  jugador.tiempoRecarga -= dt;
  if (raton.pulsado) intentarDisparo();
}

// ★ NUEVO: disparar si hay munición y el arma está lista.
// La usan el ratón (mantener pulsado) y el botón táctil (al soltar el dedo).
function intentarDisparo() {
  if (jugador.muerto || jugador.tiempoRecarga > 0 || jugador.municion < 1) return false;
  dispararJugador();
  jugador.municion -= 1;
  jugador.tiempoRecarga = jugador.cadencia;
  return true;
}
