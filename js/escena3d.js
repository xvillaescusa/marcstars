// =============================================================
//  escena3d.js — el mundo dibujado en 3D con Three.js
// =============================================================
//  LA GRAN IDEA: la LÓGICA del juego sigue siendo 2D (x, y en píxeles),
//  exactamente igual que antes. Este archivo solo LEE esos datos y los
//  convierte en objetos 3D. Gracias a que separamos lógica y dibujo en
//  el Paso 9, hemos podido pasar a 3D sin tocar cómo se juega.
//
//  Cómo se traduce el 2D al 3D:
//      2D (x, y)   ->   3D (x, altura, z)
//      x del mapa  ->   x
//      y del mapa  ->   z   (hacia la cámara)
//      y además dividimos entre 40: 1 casilla = 1 unidad 3D.
//
//  Las 4 piezas de cualquier escena 3D:
//      1. ESCENA:   la "caja" donde se meten todos los objetos
//      2. CÁMARA:   desde dónde miramos
//      3. LUCES:    sin luz, todo se ve negro
//      4. MALLAS:   objetos = FORMA (geometría) + ASPECTO (material)
// =============================================================

const ESCALA = 1 / TAM;   // píxeles del mapa -> unidades 3D

// ---------- 1) Renderizador, escena y cámara ----------
const lienzo3d = document.getElementById("vista3d");
const renderer = new THREE.WebGLRenderer({ canvas: lienzo3d, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));   // ★ CAMBIADO: máx. 2 (en iPhone es 3 y va lento)
renderer.setSize(lienzo3d.width, lienzo3d.height, false);
renderer.shadowMap.enabled = true;                    // sombras de verdad
renderer.shadowMap.type = THREE.PCFSoftShadowMap;     // sombras suaves

const escena = new THREE.Scene();
escena.background = new THREE.Color("#7ec8e3");      // cielo
escena.fog = new THREE.Fog("#7ec8e3", 22, 40);       // niebla a lo lejos

// Cámara con PERSPECTIVA: lo lejano se ve más pequeño (como en la vida real).
// 40 = ángulo de visión, luego proporción ancho/alto, y distancia mínima/máxima.
const camara = new THREE.PerspectiveCamera(40, lienzo3d.width / lienzo3d.height, 0.1, 100);

// Dónde se pone la cámara respecto al punto que mira:
// arriba (y) y "hacia el sur" (z). Así se ve el mapa inclinado, como en Brawl Stars.
const CAMARA_ALTURA = 13;
const CAMARA_ATRAS = 8.5;
const camaraMira = new THREE.Vector3(10, 0, 7.5);    // punto al que mira (se va moviendo)

// ---------- 2) Luces ----------
// Luz "de ambiente" que viene del cielo (azulada) y del suelo (verdosa)
escena.add(new THREE.HemisphereLight("#ffffff", "#5a7a4a", 0.55));
// Luz del "sol": es la que proyecta sombras
const sol = new THREE.DirectionalLight("#fff4e0", 0.65);
sol.position.set(4, 18, 12);
sol.target.position.set(10, 0, 7.5);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
sol.shadow.camera.left = -16; sol.shadow.camera.right = 16;
sol.shadow.camera.top = 16;   sol.shadow.camera.bottom = -16;
escena.add(sol);
escena.add(sol.target);

// ---------- Texturas hechas con código ----------
// Dibujamos en un canvas 2D invisible y lo usamos como "pegatina" (textura) en 3D.
// (Usar las imágenes .svg directamente no funciona al abrir el juego con doble
//  clic, porque el navegador no deja pasar archivos locales a la tarjeta gráfica.)
function crearTextura(ancho, alto, pintar) {
  const c = document.createElement("canvas");
  c.width = ancho; c.height = alto;
  pintar(c.getContext("2d"));
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

const texturaSuelo = crearTextura(128, 128, (g) => {
  g.fillStyle = "#74b955"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#68ad4a"; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  g.strokeStyle = "#4f8f36"; g.lineWidth = 3;
  for (const [x, y] of [[18, 40], [90, 22], [100, 100], [36, 110]]) {
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y - 10); g.lineTo(x + 8, y); g.stroke();
  }
});
texturaSuelo.wrapS = texturaSuelo.wrapT = THREE.RepeatWrapping;
texturaSuelo.repeat.set(MUNDO_ANCHO / TAM / 2, MUNDO_ALTO / TAM / 2);   // cada textura = 2x2 casillas

const texturaCaja = crearTextura(64, 64, (g) => {
  g.fillStyle = "#a0663f"; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "#6e4224"; g.lineWidth = 4;
  g.strokeRect(2, 2, 60, 60);
  g.beginPath(); g.moveTo(4, 22); g.lineTo(60, 22); g.moveTo(4, 42); g.lineTo(60, 42); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(6, 6); g.lineTo(58, 58); g.stroke();
});
const texturaCajaArriba = crearTextura(64, 64, (g) => {
  g.fillStyle = "#c98b5a"; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "#8a5530"; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60);
});

// ---------- 3) El suelo y el borde del mapa ----------
// Una MALLA = geometría (forma) + material (color/textura). Un plano es un "folio".
const suelo = new THREE.Mesh(
  new THREE.PlaneGeometry(MUNDO_ANCHO * ESCALA, MUNDO_ALTO * ESCALA),
  new THREE.MeshLambertMaterial({ map: texturaSuelo })
);
suelo.rotation.x = -Math.PI / 2;                     // tumbarlo (los planos nacen de pie)
suelo.position.set(MUNDO_ANCHO * ESCALA / 2, 0, MUNDO_ALTO * ESCALA / 2);
suelo.receiveShadow = true;
escena.add(suelo);

// Terreno de fuera del mapa, más oscuro y un poco más bajo
const fuera = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: "#4e7d3a" }));
fuera.rotation.x = -Math.PI / 2;
fuera.position.set(10, -0.3, 7.5);
escena.add(fuera);

// Valla de piedra alrededor del mapa (solo decorativa: la lógica ya impide salir)
const materialValla = new THREE.MeshLambertMaterial({ color: "#8d8d7a" });
function crearValla(x, z, ancho, fondo) {
  const v = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.6, fondo), materialValla);
  v.position.set(x, 0, z);
  v.castShadow = true; v.receiveShadow = true;
  escena.add(v);
}
const W = MUNDO_ANCHO * ESCALA, H = MUNDO_ALTO * ESCALA;
crearValla(W / 2, -0.25, W + 1, 0.5);   crearValla(W / 2, H + 0.25, W + 1, 0.5);
crearValla(-0.25, H / 2, 0.5, H);       crearValla(W + 0.25, H / 2, 0.5, H);

// ---------- 4) Fábricas de objetos 3D ----------
// Geometrías y materiales que se repiten: se crean UNA vez y se reutilizan.
const geoCaja = new THREE.BoxGeometry(1, 1, 1);
const materialesCaja = [   // una caja tiene 6 caras: derecha, izquierda, ARRIBA, abajo, delante, detrás
  new THREE.MeshLambertMaterial({ map: texturaCaja }),
  new THREE.MeshLambertMaterial({ map: texturaCaja }),
  new THREE.MeshLambertMaterial({ map: texturaCajaArriba }),
  new THREE.MeshLambertMaterial({ map: texturaCaja }),
  new THREE.MeshLambertMaterial({ map: texturaCaja }),
  new THREE.MeshLambertMaterial({ map: texturaCaja })
];
function crearMuro3D(m) {
  const malla = new THREE.Mesh(geoCaja, materialesCaja);
  // posición = centro de la casilla, y media altura hacia arriba para que apoye en el suelo
  malla.position.set((m.x + m.ancho / 2) * ESCALA, 0.5, (m.y + m.alto / 2) * ESCALA);
  malla.castShadow = true;
  malla.receiveShadow = true;
  return malla;
}

const geoAgua = new THREE.PlaneGeometry(1, 1);
const materialAgua = new THREE.MeshPhongMaterial({ color: "#1f6fbf", shininess: 120, specular: "#bfe3ff" });
function crearAgua3D(a) {
  const malla = new THREE.Mesh(geoAgua, materialAgua);
  malla.rotation.x = -Math.PI / 2;
  malla.position.set((a.x + a.ancho / 2) * ESCALA, 0.02, (a.y + a.alto / 2) * ESCALA);
  malla.receiveShadow = true;
  return malla;
}

// Arbusto = varias "bolas" de hojas con caras planas (estilo low-poly)
const geoHoja = new THREE.IcosahedronGeometry(0.36, 0);
function crearArbusto3D(a) {
  const grupo = new THREE.Group();   // un Group junta varias mallas para moverlas a la vez
  // Cada arbusto tiene su PROPIO material, para poder hacerlo transparente por separado
  const material = new THREE.MeshLambertMaterial({ color: "#2ea84a", flatShading: true, transparent: true });
  for (const [dx, dy, dz, s] of [[-0.2, 0.35, -0.2, 1], [0.22, 0.4, -0.15, 1.05], [-0.15, 0.38, 0.22, 1], [0.2, 0.33, 0.2, 0.95], [0, 0.62, 0, 0.9]]) {
    const hoja = new THREE.Mesh(geoHoja, material);
    hoja.position.set(dx, dy, dz);
    hoja.scale.setScalar(s);
    hoja.rotation.set(dx * 5, dz * 5, 0);           // girarlas un poco para que no sean iguales
    hoja.castShadow = true;
    grupo.add(hoja);
  }
  grupo.position.set((a.x + a.ancho / 2) * ESCALA, 0, (a.y + a.alto / 2) * ESCALA);
  grupo.userData.material = material;                // userData: sitio para guardar lo que queramos
  return grupo;
}

// PERSONAJE: construido con formas simples (cilindro, esferas y cajas).
// Se modela mirando hacia +x, igual que los sprites 2D.
function crearPersonaje3D(tipo, color, colorOscuro) {
  const grupo = new THREE.Group();
  const materiales = [];   // los guardamos para el destello blanco y la transparencia
  function mat(c) {
    const m = new THREE.MeshLambertMaterial({ color: c, transparent: true });
    materiales.push(m);
    return m;
  }
  function pieza(geometria, material, x, y, z) {
    const malla = new THREE.Mesh(geometria, material);
    malla.position.set(x, y, z);
    malla.castShadow = true;
    grupo.add(malla);
    return malla;
  }
  const piel = mat("#f2c08f"), oscuro = mat(colorOscuro), metal = mat("#3d3d3d");
  const blanco = mat("#ffffff"), negro = mat("#1e1e1e");

  pieza(new THREE.CylinderGeometry(0.3, 0.36, 0.5, 16), mat(color), 0, 0.3, 0);     // cuerpo
  pieza(new THREE.SphereGeometry(0.3, 18, 14), piel, 0, 0.78, 0);                   // cabeza
  // Media esfera encima de la cabeza = pelo / gorro / casco
  const media = new THREE.SphereGeometry(0.315, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const pelo = pieza(media, tipo === "ruda" ? mat("#7f8c8d") : oscuro, -0.02, 0.8, 0);
  if (tipo === "ruda") pelo.scale.set(1.08, 1.1, 1.08);                               // casco más grande
  // Ojos: blanco + pupila, delante de la cara (x positivo)
  for (const lado of [-1, 1]) {
    pieza(new THREE.SphereGeometry(0.075, 10, 8), blanco, 0.25, 0.82, lado * 0.11);
    pieza(new THREE.SphereGeometry(0.04, 8, 6), negro, 0.315, 0.82, lado * 0.11);
  }
  // Manos
  pieza(new THREE.SphereGeometry(0.08, 10, 8), piel, 0.3, 0.42, 0.2);
  pieza(new THREE.SphereGeometry(0.08, 10, 8), piel, 0.3, 0.42, -0.05);

  // Extras según el personaje
  if (tipo === "chispa") {
    pieza(new THREE.BoxGeometry(0.42, 0.1, 0.12), metal, 0.45, 0.45, 0.2);           // pistola
    pieza(new THREE.BoxGeometry(0.2, 0.04, 0.4), oscuro, 0.27, 0.92, 0);             // visera de la gorra
  } else if (tipo === "ruda") {
    pieza(new THREE.BoxGeometry(0.5, 0.09, 0.09), metal, 0.48, 0.47, 0.14);          // escopeta doble
    pieza(new THREE.BoxGeometry(0.5, 0.09, 0.09), metal, 0.48, 0.47, 0.25);
  } else if (tipo === "pluma") {
    pieza(new THREE.BoxGeometry(0.7, 0.08, 0.08), metal, 0.5, 0.45, 0.2);            // rifle largo
    pieza(new THREE.BoxGeometry(0.16, 0.08, 0.08), mat("#88c0d0"), 0.45, 0.54, 0.2); // mira
    const p = pieza(new THREE.ConeGeometry(0.07, 0.55, 6), mat("#f9e79f"), -0.2, 1.1, 0);  // pluma
    p.rotation.z = 0.7;
  } else {                                                                            // enemigo
    pieza(new THREE.BoxGeometry(0.42, 0.1, 0.12), metal, 0.45, 0.45, 0.2);
    for (const lado of [-1, 1]) {                                                     // cejas de enfadado
      const ceja = pieza(new THREE.BoxGeometry(0.04, 0.035, 0.15), negro, 0.29, 0.92, lado * 0.11);
      ceja.rotation.x = lado * 0.5;
    }
  }
  grupo.userData.materiales = materiales;
  return grupo;
}

const COLORES_MODELO = {
  chispa:  ["#3498db", "#1f4e79"],
  ruda:    ["#e67e22", "#a04000"],
  pluma:   ["#1abc9c", "#117864"],
  enemigo: ["#e74c3c", "#922b21"]
};
function crearModelo(tipo) {
  // MarcStars usa el modelo .glb; si no se pudo cargar, el hecho con formas (plan B)
  // MarcStars ahora es un sprite 2D animado (sprites.js). Si fallara, el de formas.
  if (tipo === "marc") return crearSpriteMarc() || crearModeloMarc();
  const c = COLORES_MODELO[tipo];
  return crearPersonaje3D(tipo, c[0], c[1]);
}

// Balas, bombas, explosiones y partículas
const geoBala = new THREE.SphereGeometry(0.11, 10, 8);
const matBalaJugador = new THREE.MeshBasicMaterial({ color: "#ffe14d" });   // "Basic" = no le afecta la luz: brilla
const matBalaEnemigo = new THREE.MeshBasicMaterial({ color: "#d17bff" });
const geoBomba = new THREE.SphereGeometry(0.2, 14, 10);
const matBomba = new THREE.MeshLambertMaterial({ color: "#2c3e50" });
const geoGranada = new THREE.SphereGeometry(0.14, 12, 10);
const matGranada = new THREE.MeshLambertMaterial({ color: "#4b5320" });    // verde militar
const geoExplosion = new THREE.SphereGeometry(1, 20, 14);
const geoParticula = new THREE.BoxGeometry(0.09, 0.09, 0.09);
const materialesParticula = {};     // uno por color, se crean cuando hacen falta
function materialParticula(color) {
  if (!materialesParticula[color]) materialesParticula[color] = new THREE.MeshBasicMaterial({ color: color });
  return materialesParticula[color];
}

// ---------- Indicadores en el suelo (apuntado y súper) ----------
// Una "flecha" en el suelo: un rectángulo que sale del personaje hacia donde apuntas.
function crearIndicador(color, opacidad) {
  const grupo = new THREE.Group();
  const rect = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacidad, depthWrite: false })
  );
  rect.rotation.x = -Math.PI / 2;
  grupo.add(rect);
  grupo.position.y = 0.03;
  grupo.userData.rect = rect;
  escena.add(grupo);
  return grupo;
}
const indicadorAtaque = crearIndicador("#ffffff", 0.22);
const indicadorSuper = crearIndicador("#ffd32a", 0.3);

const anilloSuper = new THREE.Mesh(
  new THREE.RingGeometry(0.92, 1, 48),
  new THREE.MeshBasicMaterial({ color: "#ffd32a", transparent: true, opacity: 0.8, depthWrite: false })
);
anilloSuper.rotation.x = -Math.PI / 2;
escena.add(anilloSuper);

// Coloca un indicador desde el personaje, con un ángulo, largo y ancho (en píxeles del mapa)
function colocarIndicador(ind, p, angulo, largo, ancho) {
  ind.position.x = p.x * ESCALA;
  ind.position.z = p.y * ESCALA;
  ind.rotation.y = -angulo;          // en 3D el giro va al revés que en el canvas 2D
  const rect = ind.userData.rect;
  rect.scale.set(largo * ESCALA, ancho * ESCALA, 1);
  rect.position.x = largo * ESCALA / 2;   // que EMPIECE en el personaje (no que esté centrado en él)
  ind.visible = true;
}

// ---------- 5) SINCRONIZAR la lógica con el 3D ----------
// La lógica crea y borra cosas (balas, efectos, muros rotos...). Esta función
// mantiene un objeto 3D por cada objeto lógico:
//   - si aparece uno nuevo en la lista -> crea su malla 3D
//   - si desaparece de la lista        -> quita su malla de la escena
//   - para todos los demás             -> actualiza su posición
// Un Map es como un diccionario: objeto lógico -> su malla 3D.
function sincronizar(lista, mapa, crear, actualizar) {
  const presentes = new Set(lista);
  for (const [obj, malla] of mapa) {
    if (!presentes.has(obj)) {
      escena.remove(malla);
      mapa.delete(obj);
    }
  }
  for (const obj of lista) {
    let malla = mapa.get(obj);
    if (!malla) {
      malla = crear(obj);
      escena.add(malla);
      mapa.set(obj, malla);
    }
    if (actualizar) actualizar(obj, malla);
  }
}

const mallasMuros = new Map(), mallasAgua = new Map(), mallasArbustos = new Map();
const mallasEnemigos = new Map(), mallasJugador = new Map();
const mallasBalas = new Map(), mallasBombas = new Map(), mallasEfectos = new Map();

// ¿Ves TÚ a este enemigo? (misma regla que en 2D: en un arbusto, solo si está cerca o se delata)
function enemigoVisible(e) {
  if (e.muerto) return false;
  const oculto = estaEnArbusto(e)
              && Math.hypot(e.x - jugador.x, e.y - jugador.y) > CONFIG.distanciaRevelar
              && e.tiempoRevelado <= 0;
  return !oculto;
}

// Colocar un personaje 3D según sus datos lógicos
function actualizarPersonaje3D(p, grupo, opacidad, visible, dt) {
  // los sprites se actualizan a su manera (sprites.js)
  if (grupo.userData.actualizarSprite) { grupo.userData.actualizarSprite(p, opacidad, visible, dt); return; }
  grupo.visible = visible;
  const rebote = p.moviendose ? Math.abs(Math.sin(p.tiempoAnim * 12)) * 0.08 : 0;
  grupo.position.set(p.x * ESCALA, rebote, p.y * ESCALA);
  grupo.rotation.y = -p.angulo;
  grupo.scale.setScalar(p.radio / 18);               // los más grandes (Ruda) se ven más grandes
  // si el modelo tiene piernas, balancearlas al caminar (una adelante, otra atrás)
  // el .glb no tiene esqueleto (no puede mover las piernas), así que al
  // andar se "bambolea" de lado a lado, como un muñeco. Queda simpático.
  // modelos con animaciones -> elegir cuál toca según lo que está haciendo
  if (grupo.userData.animar) {
    let anim = "reposo", velocidad = 1;
    if (p.muerto) anim = "morir";
    else if (p.moviendose) { anim = "correr"; velocidad = 1.3; }
    else if (p.tiempoDesdeDisparo < 0.4) anim = "disparar";
    grupo.userData.animar(anim, dt, velocidad);
  }
  const balanceo = grupo.userData.balanceo;
  if (balanceo) balanceo.rotation.x = p.moviendose ? Math.sin(p.tiempoAnim * 12) * 0.08 : 0;
  const piernas = grupo.userData.piernas;
  if (piernas) {
    const paso = p.moviendose ? Math.sin(p.tiempoAnim * 12) * 0.6 : 0;
    piernas[0].rotation.z = paso;
    piernas[1].rotation.z = -paso;
  }
  for (const m of grupo.userData.materiales) {
    m.opacity = opacidad;
    m.emissive.set(p.tiempoGolpe > 0 && !p.muerto ? "#ffffff" : "#000000");   // destello al recibir daño
  }
}

// ---------- 6) Cámara que sigue al jugador + ratón en el suelo ----------
const raycaster = new THREE.Raycaster();
const planoSuelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);   // plano a la altura de las balas

function actualizarCamara(dt) {
  // La cámara no salta de golpe: se acerca poco a poco al jugador (lerp otra vez)
  const objetivoX = Math.max(7, Math.min(W - 7, jugador.x * ESCALA));
  const objetivoZ = Math.max(4, Math.min(H - 2, jugador.y * ESCALA));
  const suavidad = Math.min(1, 6 * dt);
  camaraMira.x += (objetivoX - camaraMira.x) * suavidad;
  camaraMira.z += (objetivoZ - camaraMira.z) * suavidad;

  camara.position.set(camaraMira.x, CAMARA_ALTURA, camaraMira.z + CAMARA_ATRAS);
  // Temblor: movemos la cámara un poquito al azar
  if (temblor > 0) {
    camara.position.x += (Math.random() - 0.5) * temblor * 1.2;
    camara.position.y += (Math.random() - 0.5) * temblor * 1.2;
  }
  camara.lookAt(camaraMira);
}

// Del píxel de la pantalla al punto del mapa: lanzamos un RAYO desde la cámara
// atravesando el ratón y miramos dónde corta al suelo.
// ★ NUEVO: cambiar el tamaño cuando la pantalla cambia (girar el móvil, ventana...)
function redimensionar3D(ancho, alto) {
  renderer.setSize(ancho, alto);
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
}

function actualizarRatonEnMundo() {
  if (typeof modoTactil !== "undefined" && modoTactil) return;   // ★ en el móvil lo pone tactil.js
  const ndc = new THREE.Vector2(
    (raton.pantallaX / lienzo3d.clientWidth) * 2 - 1,      // de -1 (izquierda) a 1 (derecha)
    -(raton.pantallaY / lienzo3d.clientHeight) * 2 + 1     // de -1 (abajo) a 1 (arriba)
  );
  raycaster.setFromCamera(ndc, camara);
  const punto = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(planoSuelo, punto)) {
    raton.x = punto.x / ESCALA;      // de unidades 3D a píxeles del mapa
    raton.y = punto.z / ESCALA;
  }
}

// De un punto del mundo (píxeles del mapa + altura 3D) a un píxel de la pantalla.
// Lo usa hud.js para poner las barras de vida encima de las cabezas.
function aPantalla(x, y, altura) {
  const v = new THREE.Vector3(x * ESCALA, altura, y * ESCALA).project(camara);
  return { x: (v.x + 1) / 2 * canvas.width, y: (1 - v.y) / 2 * canvas.height };
}

// ---------- 7) DIBUJAR LA ESCENA ----------
let ultimoTiempo3D = performance.now();

function renderizar3D() {
  const ahora = performance.now();
  const dt = Math.min(0.05, (ahora - ultimoTiempo3D) / 1000);
  ultimoTiempo3D = ahora;

  actualizarCamara(dt);
  actualizarRatonEnMundo();

  sincronizar(muros, mallasMuros, crearMuro3D);
  sincronizar(aguas, mallasAgua, crearAgua3D);

  // Arbustos: se vuelven transparentes si estás cerca de ellos (como en el juego original)
  sincronizar(arbustos, mallasArbustos, crearArbusto3D, (a, grupo) => {
    const cerca = !jugador.muerto &&
      Math.hypot(a.x + TAM / 2 - jugador.x, a.y + TAM / 2 - jugador.y) < TAM * 1.6;
    grupo.userData.material.opacity = cerca ? 0.45 : 1;
    // Se mueven un poco si alguien está dentro
    const alguien = [jugador, ...enemigos].some(p => !p.muerto && letraEn(p.x, p.y) === "*" &&
      Math.floor(p.x / TAM) === a.x / TAM && Math.floor(p.y / TAM) === a.y / TAM);
    grupo.rotation.z = alguien ? Math.sin(ahora / 80) * 0.06 : 0;
  });

  sincronizar(enemigos, mallasEnemigos, () => crearModelo("enemigo"),
    (e, grupo) => actualizarPersonaje3D(e, grupo, 1, enemigoVisible(e), dt));

  sincronizar([jugador], mallasJugador, (j) => crearModelo(j.brawler.sprite), (j, grupo) => {
    const escondido = estaEnArbusto(j) && j.tiempoRevelado <= 0;
    // si el modelo sabe animarse, se queda visible al morir para ver la caída
    const verMuerte = !!grupo.userData.animar;
    actualizarPersonaje3D(j, grupo, escondido ? 0.5 : 1, !j.muerto || verMuerte, dt);
  });

  sincronizar(balas, mallasBalas,
    (b) => new THREE.Mesh(geoBala, b.dueno === "jugador" ? matBalaJugador : matBalaEnemigo),
    (b, malla) => malla.position.set(b.x * ESCALA, b.altura, b.y * ESCALA));   // cada bala a su altura

  sincronizar(bombas, mallasBombas, (b) => {
    const m = b.estilo === "granada" ? new THREE.Mesh(geoGranada, matGranada)
                                     : new THREE.Mesh(geoBomba, matBomba);
    m.castShadow = true;                 // ¡su sombra en el suelo sale sola!
    return m;
  }, (b, malla) => malla.position.set(b.x * ESCALA, 0.25 + b.altura * ESCALA * 1.5, b.y * ESCALA));

  // Efectos: los textos (números de daño) se dibujan en 2D en hud.js
  const efectos3D = efectos.filter(ef => ef.tipo !== "texto");
  sincronizar(efectos3D, mallasEfectos, (ef) => {
    if (ef.tipo === "explosion") {
      return new THREE.Mesh(geoExplosion,
        new THREE.MeshBasicMaterial({ color: "#ff9f1a", transparent: true, depthWrite: false }));
    }
    return new THREE.Mesh(geoParticula, materialParticula(ef.color));
  }, (ef, malla) => {
    const p = ef.t / ef.duracion;
    if (ef.tipo === "explosion") {
      malla.position.set(ef.x * ESCALA, 0.2, ef.y * ESCALA);
      malla.scale.setScalar(ef.radio * ESCALA * (0.4 + p * 0.6));
      malla.material.opacity = 0.85 * (1 - p);
    } else {
      // Las partículas saltan hacia arriba y caen (una parábola, como la bomba)
      malla.position.set(ef.x * ESCALA, 0.2 + Math.sin(p * Math.PI) * 0.6, ef.y * ESCALA);
      malla.scale.setScalar(Math.max(0.01, (ef.tamano / 5) * (1 - p)));
      malla.rotation.set(ef.t * 8, ef.t * 6, 0);
    }
  });

  // Indicadores de apuntado (solo si estás vivo)
  indicadorAtaque.visible = false;
  indicadorSuper.visible = false;
  anilloSuper.visible = false;
  // ★ CAMBIADO: en el móvil, la línea de apuntado solo se ve mientras apuntas (como en Brawl Stars)
  const tactil = typeof modoTactil !== "undefined" && modoTactil;
  const verAtaque = !tactil || apuntandoTactil();
  const verSuper = !tactil || apuntandoSuperTactil();
  if (!jugador.muerto) {
    const a = jugador.brawler.ataque;
    const angulo = anguloHacia(jugador, raton.x, raton.y);
    const ancho = a.balas > 1 ? 60 : 14;                       // la escopeta apunta un "abanico" ancho
    if (verAtaque) colocarIndicador(indicadorAtaque, jugador, angulo, a.alcance, ancho);

    if (jugador.carga >= 1 && verSuper) {
      const s = jugador.brawler.super;
      if (s.tipo === "bomba") {
        const d = destinoSuper(s.alcance);
        anilloSuper.position.set(d.x * ESCALA, 0.04, d.y * ESCALA);
        anilloSuper.scale.setScalar(s.radio * ESCALA);
        anilloSuper.visible = true;
      } else if (s.tipo === "embestida") {
        colocarIndicador(indicadorSuper, jugador, angulo, s.alcance, jugador.radio * 2);
      } else if (s.tipo === "nova") {
        anilloSuper.position.set(jugador.x * ESCALA, 0.04, jugador.y * ESCALA);
        anilloSuper.scale.setScalar(s.alcance * ESCALA);
        anilloSuper.visible = true;
      }
    }
  }

  renderer.render(escena, camara);   // ¡foto de la escena desde la cámara!
}
