// =============================================================
//  brawlers.js — los personajes que puedes elegir
// =============================================================
//  Cada brawler es SOLO DATOS: no tiene código.
//  El mismo código del jugador lee estos datos y se comporta distinto.
//  Esto se llama "diseño guiado por datos" (data-driven): para crear un
//  brawler nuevo no hay que programar nada, solo añadir un objeto más.
// =============================================================
const BRAWLERS = [
  // brawler personalizado, creado a partir de una imagen
  {
    nombre: "MarcStars",
    sprite: "marc",
    retrato: true,                            // su imagen es un retrato de frente (no se gira)
    rol: "Soldado",
    descripcion: ["Fusil de asalto que dispara", "ráfagas de 5 balas."],
    color: "#8b7d5a",
    vida: 3400, velocidad: 255, radio: 19,
    altura3D: 2.25,                           // es más alto, la barra de vida va más arriba
    municionMax: 3, tiempoPorCarga: 1.0, cadencia: 0.6,   // ★ recarga: 1 s por bala del cargador
    // "rafaga" = cuántas tandas salen SEGUIDAS con un solo disparo
    //          "intervaloRafaga" = segundos entre una bala y la siguiente
    //          "dispersion" = grados de imprecisión al azar (como un fusil de verdad)
    ataque: { balas: 1, abertura: 0, dano: 230, alcance: 460, velocidadBala: 760,
              rafaga: 5, intervaloRafaga: 0.08, dispersion: 0 },   // ★ ráfaga de 5 balas, todas en la misma línea
    cargaPorImpacto: 0.07,                    // cada bala de la ráfaga carga un poco (ahora salen 5)
    super: { tipo: "bomba", nombre: "Granada", estilo: "granada", dano: 1100, radio: 85, alcance: 340 }
  }
];

// ★ PASO 20: de momento solo juega MarcStars. Los otros brawlers están guardados
// aquí abajo (sin usar). Para recuperarlos, vuelve a meterlos dentro de BRAWLERS.
const BRAWLERS_GUARDADOS = [
  {
    nombre: "Chispa",
    sprite: "chispa",   // nombre de su imagen
    rol: "Tiradora",
    descripcion: ["Equilibrada en todo.", "Dispara una bala rápida."],
    color: "#3498db",
    vida: 3000, velocidad: 250, radio: 18,
    municionMax: 3, tiempoPorCarga: 1.5, cadencia: 0.3,
    // abertura = grados entre bala y bala (si dispara varias)
    ataque: { balas: 1, abertura: 0, dano: 300, alcance: 400, velocidadBala: 600 },
    cargaPorImpacto: 0.2,                     // 5 aciertos = súper
    super: { tipo: "bomba", nombre: "Bomba", dano: 900, radio: 90, alcance: 320 }
  },
  {
    nombre: "Ruda",
    sprite: "ruda",
    rol: "Tanque",
    descripcion: ["Mucha vida y escopeta", "de corto alcance."],
    color: "#e67e22",
    vida: 4500, velocidad: 220, radio: 21,
    municionMax: 3, tiempoPorCarga: 1.8, cadencia: 0.5,
    ataque: { balas: 5, abertura: 12, dano: 220, alcance: 240, velocidadBala: 550 },
    cargaPorImpacto: 0.07,                    // cada perdigón carga poco (dispara 5)
    super: { tipo: "embestida", nombre: "Embestida", dano: 1000, alcance: 300 }
  },
  {
    nombre: "Pluma",
    sprite: "pluma",
    rol: "Francotiradora",
    descripcion: ["Poca vida, pero mucho", "alcance y daño."],
    color: "#1abc9c",
    vida: 2200, velocidad: 270, radio: 16,
    municionMax: 2, tiempoPorCarga: 1.6, cadencia: 0.6,
    ataque: { balas: 1, abertura: 0, dano: 600, alcance: 600, velocidadBala: 900 },
    cargaPorImpacto: 0.34,                    // 3 aciertos = súper
    super: { tipo: "nova", nombre: "Nova", dano: 400, alcance: 260, balas: 16 }
  }
];
