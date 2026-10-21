// =============================================================
//  efectos.js — Cosas que se ven un rato y desaparecen
// =============================================================

// Cada efecto es un objeto con un campo "tipo" que dice cómo actualizarlo
// y dibujarlo. Añadir un tipo nuevo (chispas, humo...) es añadir un "if".
const efectos = [];   // TEMBLOR DE PANTALLA. Mientras sea > 0, la pantalla tiembla.
let temblor = 0;
function sacudirPantalla(cantidad) {
  temblor = Math.max(temblor, cantidad);   // no acortar un temblor más fuerte
}   // PARTÍCULAS. Muchos cuadraditos que salen disparados en
// direcciones al azar, se frenan y se encogen. Dan mucha "vida" al juego.
function crearParticulas(x, y, color, cantidad, velocidad) {
  for (let i = 0; i < cantidad; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const v = velocidad * (0.3 + Math.random() * 0.7);   // cada una a una velocidad
    efectos.push({
      tipo: "particula",
      x: x, y: y,
      vx: Math.cos(angulo) * v,
      vy: Math.sin(angulo) * v,
      tamano: 3 + Math.random() * 4,
      color: color,
      t: 0,
      duracion: 0.35 + Math.random() * 0.3
    });
  }
}

function crearExplosion(x, y, radio) {
  efectos.push({ tipo: "explosion", x: x, y: y, radio: radio, t: 0, duracion: 0.4 });
}


function crearNumeroDano(x, y, cantidad, color) {
  efectos.push({
    tipo: "texto",
    x: x + (Math.random() - 0.5) * 16,   // un poco de azar para que no se amontonen
    y: y,
    texto: "-" + cantidad,
    color: color,
    t: 0,
    duracion: 0.8
  });
}

function actualizarEfectos(dt) {
  temblor = Math.max(0, temblor - dt);   // el temblor se va apagando
  for (let i = efectos.length - 1; i >= 0; i--) {
    const ef = efectos[i];
    ef.t += dt;
    if (ef.tipo === "texto") ef.y -= 40 * dt;   // los números suben
    if (ef.tipo === "particula") {
      ef.x += ef.vx * dt;
      ef.y += ef.vy * dt;
      ef.vx *= Math.max(0, 1 - 4 * dt);           // rozamiento: se van frenando
      ef.vy *= Math.max(0, 1 - 4 * dt);
    }
    if (ef.t >= ef.duracion) efectos.splice(i, 1);
  }
}

// (El dibujo de los efectos ahora está en escena3d.js y hud.js)
