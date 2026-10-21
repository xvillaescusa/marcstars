// =============================================================
//  config.js — Números generales y el lienzo
// =============================================================
//  los datos del jugador (vida, velocidad,
//  daño...) ya no están aquí: ahora cada brawler tiene los suyos
//  en brawlers.js. Aquí solo queda lo que es común para todos.
// =============================================================

const canvas = document.getElementById("juego");
const ctx = canvas.getContext("2d");

const CONFIG = {
  pausaRecarga: 0.5,         // no recargar hasta 0.5 s después de disparar
  distanciaRevelar: 90,      // dentro de un arbusto, te ven si están más cerca que esto

  danoEnemigo: 250,
  cadenciaEnemigo: 1.2,

  superDuracionVuelo: 0.6,   // segundos que tarda la bomba en caer
  superEmpuje: 550,          // fuerza con la que los súper empujan (0 = nada)
  embestidaVelocidad: 900    // velocidad de la embestida de Ruda
};

// ★ NUEVO (paso 19): MARGEN SEGURO.
// En el iPhone, la muesca (notch) de la cámara y la barrita de abajo tapan
// parte de la pantalla. El navegador nos dice cuánto con env(safe-area-inset-...)
// (ver principal.js). Los joysticks y el marcador se apartan esos píxeles.
const margenSeguro = { izq: 0, der: 0, arr: 0, aba: 0 };
