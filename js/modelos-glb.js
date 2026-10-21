// =============================================================
//  modelos-glb.js — Cargar modelos 3D de verdad (.glb) y animarlos
// =============================================================
//  Un archivo .glb es un modelo 3D completo: la forma (miles de
//  triángulos), los colores (texturas) y los materiales, todo junto.
//  Se puede crear con Blender o con herramientas de IA a partir de
//  una imagen.
//
//  EL PROBLEMA: al abrir el juego con doble clic (file://), el
//  navegador no deja leer archivos sueltos por seguridad.
//  LA SOLUCIÓN: el .glb está convertido a texto "base64" dentro de un
//  .js (js/modelos/marc-glb.js). Un <script> sí se puede cargar, y aquí
//  convertimos ese texto otra vez en los bytes del modelo.
// =============================================================

// Lista de modelos .glb: nombre -> datos del modelo
const FUENTES_GLB = {
  marc: {
    base64: (typeof MARC_GLB_BASE64 !== "undefined") ? MARC_GLB_BASE64 : null,
    altura: 1.5,            // altura final en unidades 3D (1 unidad = 1 casilla)
    giro: Math.PI / 2,      // el modelo mira hacia +z; lo giramos para que mire hacia +x como los demás
    fusil: true             // el modelo no trae arma: le ponemos un fusil que sigue a las manos
  }
};

// aquí quedan las ANIMACIONES de cada modelo (reposo, correr, disparar, morir)
const ANIMACIONES_GLB = {};

// Aquí quedan los modelos ya cargados (o null si alguno falla)
const MODELOS_GLB = {};

// Texto base64 -> bytes (ArrayBuffer), que es lo que entiende el cargador
function base64ABytes(texto) {
  const binario = atob(texto);                        // atob = "ASCII to binary"
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}

function cargarModelosGLB(alTerminar) {
  const nombres = Object.keys(FUENTES_GLB);
  let pendientes = nombres.length;
  function unoMenos() {
    pendientes--;
    if (pendientes === 0) alTerminar();
  }

  const cargador = new THREE.GLTFLoader();
  for (const nombre of nombres) {
    const fuente = FUENTES_GLB[nombre];
    if (!fuente.base64) {                               // no está el archivo -> plan B
      MODELOS_GLB[nombre] = null;
      unoMenos();
      continue;
    }
    // parse() es como load(), pero con los bytes ya en memoria
    cargador.parse(base64ABytes(fuente.base64), "",
      (gltf) => {
        MODELOS_GLB[nombre] = prepararModelo(gltf.scene, fuente);
        ANIMACIONES_GLB[nombre] = gltf.animations;      // las animaciones vienen dentro del .glb
        unoMenos();
      },
      (error) => {
        console.warn("No se pudo cargar el modelo", nombre, error);
        MODELOS_GLB[nombre] = null;
        unoMenos();
      });
  }
}

// Ajustar el modelo UNA vez: tamaño, giro y que apoye los pies en el suelo
function prepararModelo(modelo, fuente) {
  // Box3 = la "caja" más pequeña que envuelve al modelo entero
  const caja = new THREE.Box3().setFromObject(modelo);
  const tamano = caja.getSize(new THREE.Vector3());
  const escala = fuente.altura / tamano.y;

  modelo.scale.setScalar(escala);
  modelo.rotation.y = fuente.giro;
  // Centrarlo y bajar/subir para que los pies toquen y = 0
  const centro = caja.getCenter(new THREE.Vector3());
  modelo.position.set(-centro.x * escala, -caja.min.y * escala, -centro.z * escala);
  // (como lo hemos girado, la x y la z se intercambian, pero al estar centrado da igual)

  modelo.traverse((obj) => {                          // traverse = visitar todas sus piezas
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      // Ajustes del material para que se vea igual de luminoso que el resto del juego:
      const m = obj.material;
      if (m.map) { m.map.encoding = THREE.LinearEncoding; m.map.needsUpdate = true; }
      m.metalnessMap = null;    // la textura de "metal" lo oscurecía (no tenemos reflejos del cielo)
      m.metalness = 0;
      m.roughness = 0.85;
    }
  });

  const contenedor = new THREE.Group();
  contenedor.add(modelo);
  contenedor.userData.conFusil = !!fuente.fusil;
  return contenedor;
}

// Un fusil sencillo hecho con cajas. Apunta hacia +z, porque lookAt() orienta el +z.
function crearFusilSimple() {
  const exterior = new THREE.Group();
  const fusil = new THREE.Group();
  fusil.rotation.y = -Math.PI / 2;                 // las cajas están hechas mirando a +x: las giramos a +z
  exterior.add(fusil);
  const negro = new THREE.MeshLambertMaterial({ color: "#2a2a2a" });
  const oscuro = new THREE.MeshLambertMaterial({ color: "#151515" });
  function caja(an, al, fo, material, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(an, al, fo), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    fusil.add(m);
  }
  caja(0.34, 0.08, 0.06, negro, 0.12, 0, 0);       // cuerpo
  caja(0.15, 0.07, 0.05, oscuro, -0.1, -0.01, 0);  // culata
  caja(0.22, 0.03, 0.03, oscuro, 0.4, 0.01, 0);    // cañón
  caja(0.05, 0.13, 0.04, oscuro, 0.16, -0.09, 0);  // cargador
  caja(0.09, 0.04, 0.04, oscuro, 0.1, 0.06, 0);    // mira
  return exterior;
}

// Crear una COPIA del modelo para meterla en la escena.
// Cada copia necesita sus propios materiales (para parpadear en blanco o
// volverse transparente) y su propio "mezclador" de animaciones.
function crearModeloGLB(nombre) {
  const original = MODELOS_GLB[nombre];
  if (!original) return null;

  // un modelo con esqueleto NO se puede copiar con clone() normal,
  // porque la copia seguiría usando los huesos del original. SkeletonUtils.clone
  // copia también el esqueleto y lo conecta bien.
  const copia = THREE.SkeletonUtils.clone(original);
  const materiales = [];
  copia.traverse((obj) => {
    if (obj.isMesh) {
      obj.material = obj.material.clone();
      obj.material.transparent = true;
      materiales.push(obj.material);
      obj.frustumCulled = false;     // al animarse se sale de su "caja" y podría desaparecer
    }
  });

  const grupo = new THREE.Group();
  const balanceo = new THREE.Group();
  balanceo.add(copia);
  grupo.add(balanceo);
  grupo.userData.materiales = materiales;

  const clips = ANIMACIONES_GLB[nombre] || [];
  if (clips.length === 0) {
    grupo.userData.balanceo = balanceo;              // sin animaciones: el bamboleo de antes
    return grupo;
  }

  // EL MEZCLADOR DE ANIMACIONES (AnimationMixer)
  // Cada animación se convierte en una "acción" que se puede encender, apagar
  // y mezclar con otra. Al cambiar de una a otra hacemos un "fundido" (crossFade)
  // de 0,15 s para que no dé un salto brusco.
  const mezclador = new THREE.AnimationMixer(copia);
  const acciones = {};
  for (const clip of clips) acciones[clip.name] = mezclador.clipAction(clip);
  if (acciones.morir) {                              // morir se reproduce UNA vez y se queda tumbado
    acciones.morir.setLoop(THREE.LoopOnce);
    acciones.morir.clampWhenFinished = true;
  }
  let actual = null;

  // El fusil sigue a las manos: se pone en la mano derecha y apunta hacia la izquierda
  let fusil = null, manoDer = null, manoIzq = null;
  if (original.userData.conFusil) {
    fusil = crearFusilSimple();
    copia.add(fusil);
    manoDer = copia.getObjectByName("mixamorigRightHand");
    manoIzq = copia.getObjectByName("mixamorigLeftHand");
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3();

  // escena3d.js llama a esta función en cada fotograma
  grupo.userData.animar = (nombreAnim, dt, velocidad) => {
    const accion = acciones[nombreAnim];
    if (accion && accion !== actual) {
      accion.reset().play();
      if (actual) accion.crossFadeFrom(actual, 0.15, false);
      actual = accion;
    }
    if (actual) actual.timeScale = velocidad || 1;
    mezclador.update(dt);
    if (fusil && manoDer && manoIzq) {
      copia.updateMatrixWorld(true);
      manoDer.getWorldPosition(a);
      manoIzq.getWorldPosition(b);
      fusil.position.copy(copia.worldToLocal(a.clone()));
      fusil.lookAt(b);                               // apuntar hacia la mano izquierda
    }
  };
  return grupo;
}
