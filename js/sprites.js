// =============================================================
//  sprites.js — personajes 2D dentro del mundo 3D
// =============================================================
//  En vez de un modelo 3D, MarcStars es un DIBUJO (sprite) que
//  siempre mira a la cámara. Es la técnica de muchos juegos clásicos
//  (y de juegos 2.5D modernos): el mundo es 3D, los personajes 2D.
//
//  La hoja de sprites (img/sprites/marc-atlas.png) es una rejilla:
//    - cada FILA es una animación (quieto, disparar, correr al norte...)
//    - cada COLUMNA es un fotograma de esa animación (4 por fila)
//  Para animar, en cada momento enseñamos solo UNA casilla de la
//  rejilla, cambiándola varias veces por segundo (como un flipbook).
// =============================================================

let texturaMarc = null;

// Cargar la hoja (desde el texto base64 de js/modelos/marc-sprites.js)
function cargarSprites(alTerminar) {
  if (typeof MARC_SPRITES === "undefined") { alTerminar(); return; }
  const img = new Image();
  img.onload = () => {
    texturaMarc = new THREE.Texture(img);
    texturaMarc.needsUpdate = true;
    alTerminar();
  };
  img.onerror = () => { console.warn("No se pudo cargar la hoja de sprites"); alTerminar(); };
  img.src = MARC_SPRITES.imagen;
}

// ★ CAMBIADO (paso 18): hojas nuevas con 3 animaciones en 5 direcciones.
// Las filas del atlas se llaman "animación_dirección" (quieto_s, correr_ne...).
// Solo hay dibujos de S, SE, E, NE y N: las otras 3 direcciones se sacan
// dando la vuelta al dibujo (ESPEJO): Oeste = Este, Suroeste = Sureste,
// Noroeste = Noreste.
//
// direccion8() devuelve 0..7 empezando por el Este y girando hacia el Sur
// (en la pantalla la y crece hacia abajo, hacia la cámara).
const DIRECCIONES_SPRITE = [
  { dir: "e",  espejo: false },   // 0: Este
  { dir: "se", espejo: false },   // 1: Sureste
  { dir: "s",  espejo: null  },   // 2: Sur (null = según hacia qué lado mire)
  { dir: "se", espejo: true  },   // 3: Suroeste = Sureste en espejo
  { dir: "e",  espejo: true  },   // 4: Oeste    = Este en espejo
  { dir: "ne", espejo: true  },   // 5: Noroeste = Noreste en espejo
  { dir: "n",  espejo: false },   // 6: Norte (de espaldas)
  { dir: "ne", espejo: false }    // 7: Noreste
];
const ANIM_SPRITES = {
  quieto:   { fps: 4 },
  correr:   { fps: 10 },
  disparar: { fps: 1 }      // no se reproduce sola: el juego elige el fotograma
};

// Fotogramas de la hoja de disparar (columnas):
//   0 = apuntando, 1 y 2 = FOGONAZO (sale la bala), 3 = vuelta a apuntar
const COL_APUNTAR = 0, COL_FOGONAZO = 1, COL_RETROCESO = 2;

// DÓNDE ESTÁ LA BOCA DEL FUSIL en cada dirección de disparo.
// Píxeles dentro de la casilla (de MARC_SPRITES.celda = 160 px), medidos en el
// fotograma de apuntar: es el punto más a la derecha del cañón.
// De espaldas (n) el fusil no se ve: la bala sale de delante del pecho.
const TAM_SPRITE = 2.3;     // lo que mide la casilla en el mundo 3D (unidades)
const ANCLA_PIES = 4 / 160; // los pies están a 4 px del borde de abajo
// ★ CAMBIADO (hoja de disparar nueva): medido en el fotograma de apuntar (col 0),
// es la punta del cañón, donde nace el fogonazo de las columnas 1 y 2.
const BOCA_FUSIL = {
  s:  { x: 91,  y: 88 },   // apunta a la cámara: el cañón está delante del pecho
  se: { x: 132, y: 92 },
  e:  { x: 146, y: 80 },
  ne: { x: 128, y: 48 },
  n:  { x: 82,  y: 16 }    // de espaldas: el cañón asoma por encima de la cabeza
};
// ★ NUEVO: ¿qué hoja usamos para disparar? "correr" ahora; "disparar" cuando tengas la nueva.
const HOJA_DISPARO = "disparar";

// ★ NUEVO: el punto ENCIMA DE LA CABEZA del sprite, para poner el nombre y la vida.
// Como el sprite está inclinado hacia la cámara, su cabeza no está "en vertical"
// sobre los pies: hay que subir por la flecha "arriba" de la cámara (igual que con
// la boca del fusil). Devuelve null si el personaje no es un sprite.
const ALTO_CABEZA = 2.0;     // un poco más que la cabeza (unidades, en la dirección del sprite)
function puntoCabezaSprite(p) {
  if (!texturaMarc || !p.brawler || p.brawler.sprite !== "marc") return null;
  const w = new THREE.Vector3(0, 1, 0).applyQuaternion(camara.quaternion).multiplyScalar(ALTO_CABEZA);
  return { x: p.x + w.x / ESCALA, y: p.y + w.z / ESCALA, altura: w.y };
}

// Dirección del dibujo (s, se, e, ne, n) y si va en espejo, para un ángulo
function elegirDireccion(angulo) {
  const d = direccion8(angulo);
  const info = DIRECCIONES_SPRITE[d];
  const espejo = info.espejo === null ? Math.cos(angulo) < 0 : info.espejo;
  return { d: d, dir: info.dir, espejo: espejo };
}

// Posición de la boca del fusil EN EL MUNDO, para que la bala salga de ahí.
// jugador.js la usa al disparar. Devuelve null si el personaje no es un sprite.
//
// El sprite está siempre de cara a la cámara, así que "a la derecha en el dibujo"
// es la dirección derecha de la cámara y "hacia arriba en el dibujo" es la
// dirección arriba de la cámara (que está inclinada). Sumamos esas dos flechas.
function obtenerBocaFusil(p, angulo) {
  if (!texturaMarc || !p.brawler || p.brawler.sprite !== "marc") return null;
  const e = elegirDireccion(angulo);
  const b = BOCA_FUSIL[e.dir];
  const celda = MARC_SPRITES.celda;
  let lx = (b.x / celda - 0.5) * TAM_SPRITE;                 // de píxel de la casilla a unidades 3D
  if (e.espejo) lx = -lx;
  const ly = ((celda - b.y) / celda - ANCLA_PIES) * TAM_SPRITE;
  const derecha = new THREE.Vector3(1, 0, 0).applyQuaternion(camara.quaternion);
  const arriba = new THREE.Vector3(0, 1, 0).applyQuaternion(camara.quaternion);
  const w = derecha.multiplyScalar(lx).add(arriba.multiplyScalar(ly));
  return { x: p.x + w.x / ESCALA, y: p.y + w.z / ESCALA, altura: w.y };
}

// Elegir dirección: el ángulo (en radianes) se divide en 8 "porciones" de 45º.
function direccion8(angulo) {
  const porcion = Math.round(angulo / (Math.PI / 4));   // -4 ... 4
  return ((porcion % 8) + 8) % 8;                       // 0 ... 7
}

function crearSpriteMarc() {
  if (!texturaMarc) return null;

  // Cada sprite necesita su PROPIA copia de la textura, porque cada uno
  // enseña una casilla distinta. clone() comparte la imagen (no gasta memoria).
  const tex = texturaMarc.clone();
  tex.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(material);   // un Sprite SIEMPRE mira a la cámara
  sprite.center.set(0.5, ANCLA_PIES);                // el "ancla" en los pies, no en el centro
  sprite.scale.set(TAM_SPRITE, TAM_SPRITE, 1);

  // Sombra redonda en el suelo (los sprites no proyectan sombras de verdad)
  const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 24),
    new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.3, depthWrite: false })
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.02;
  sombra.scale.set(1, 0.6, 1);

  const grupo = new THREE.Group();
  grupo.add(sombra);
  grupo.add(sprite);
  grupo.userData.materiales = [];     // no usa los materiales 3D normales

  const filas = MARC_SPRITES.filas.length, cols = MARC_SPRITES.columnas;
  let animActual = "", tiempo = 0, ultX = null, ultY = null, dirMov = Math.PI / 2;
  let mirada = Math.PI / 2;   // ★ hacia dónde mira el dibujo (empieza mirando a la cámara)
  let ultimoDisparo = 0;     // para detectar cada bala nueva
  let desdeFogonazo = 99;    // segundos desde la última bala

  // Enseñar la casilla (fila, columna) de la hoja, con o sin espejo.
  // repeat = qué parte de la imagen se ve; offset = desde dónde.
  function enseñar(nombreFila, columna, espejo) {
    const fila = MARC_SPRITES.filas.indexOf(nombreFila);
    tex.repeat.set((espejo ? -1 : 1) / cols, 1 / filas);
    tex.offset.set((espejo ? columna + 1 : columna) / cols, 1 - (fila + 1) / filas);
  }

  // escena3d.js llama a esto en cada fotograma con los datos del personaje
  grupo.userData.actualizarSprite = (p, opacidad, visible, dt) => {
    grupo.visible = visible && !p.muerto;
    grupo.position.set(p.x * ESCALA, 0, p.y * ESCALA);

    // Dirección del movimiento: comparamos con la posición del fotograma anterior
    if (ultX !== null && (p.x !== ultX || p.y !== ultY)) dirMov = Math.atan2(p.y - ultY, p.x - ultX);
    ultX = p.x; ultY = p.y;

    // ★ CAMBIADO (paso 18): COMO EN BRAWL STARS
    //   - corriendo sin disparar: mira hacia donde CORRE (fila correr_...)
    //   - parado sin disparar: se queda mirando hacia donde miraba (quieto_...)
    //   - al disparar (o mientras arrastras el botón de ataque en el móvil):
    //     se gira hacia donde APUNTA y usa la hoja de disparar
    if ((p.contadorDisparos || 0) !== ultimoDisparo) {   // ¿acaba de salir una bala?
      ultimoDisparo = p.contadorDisparos || 0;
      desdeFogonazo = 0;
    }
    desdeFogonazo += dt;
    const apuntandoMovil = p === jugador && typeof apuntandoTactil === "function" &&
                           (apuntandoTactil() || apuntandoSuperTactil());
    const disparando = p.tiempoDesdeDisparo < 0.35 || p.rafagaRestante > 0;

    let anim, columnaFija = null;
    if (disparando || apuntandoMovil) {
      anim = HOJA_DISPARO;
      mirada = p.angulo;                                           // se gira hacia donde apunta
      if (HOJA_DISPARO === "disparar") {
        if (desdeFogonazo < 0.05) columnaFija = COL_FOGONAZO;      // fogonazo = bala
        else if (desdeFogonazo < 0.10) columnaFija = COL_RETROCESO; // 2º fogonazo, más corto
        else columnaFija = COL_APUNTAR;
      } else if (!p.moviendose) {
        columnaFija = 0;              // parado disparando: un fotograma fijo de la hoja de correr
      }
    } else if (p.moviendose) {
      anim = "correr";
      mirada = dirMov;
    } else {
      anim = "quieto";                                             // mirada: la última
    }
    const e = elegirDireccion(mirada);
    const nombre = anim + "_" + e.dir;
    if (nombre !== animActual) { animActual = nombre; tiempo = 0; }
    tiempo += dt;
    const columna = columnaFija !== null ? columnaFija
                  : Math.floor(tiempo * ANIM_SPRITES[anim].fps) % cols;
    enseñar(nombre, columna, e.espejo);

    // Golpe: se tiñe de rojo un instante. Escondido en arbusto: semitransparente.
    material.color.set(p.tiempoGolpe > 0 ? "#ff7a7a" : "#ffffff");
    material.opacity = opacidad;
  };
  return grupo;
}
