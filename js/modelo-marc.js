// =============================================================
//  modelo-marc.js — el modelo 3D de MarcStars
// =============================================================
//  Hecho a partir de la imagen de referencia: pelo rizado castaño,
//  perilla, uniforme de camuflaje, chaleco táctico con bolsillos,
//  guantes negros, rodilleras y botas, y un fusil.
//
//  Igual que los otros personajes, se monta con formas simples y
//  mira hacia +x. Este archivo SOLO necesita Three.js, así que
//  también lo usa visor.html para verlo girar de cerca.
// =============================================================

// --- Números "aleatorios" que siempre salen iguales ---
// Math.random() daría un camuflaje distinto cada vez. Con una "semilla"
// fija, la secuencia de números es siempre la misma -> mismo dibujo.
function crearAleatorio(semilla) {
  return function () {
    semilla = (semilla * 16807) % 2147483647;
    return (semilla - 1) / 2147483646;     // número entre 0 y 1
  };
}

// --- Textura de camuflaje dibujada con código ---
function crearTexturaCamuflaje() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  const azar = crearAleatorio(42);
  g.fillStyle = "#8b7d5a";                              // color base (caqui)
  g.fillRect(0, 0, 128, 128);
  // Manchas de varios colores, de la más clara a la más oscura
  for (const color of ["#a89a72", "#6e6a45", "#5a4a32", "#3f3a28"]) {
    g.fillStyle = color;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.ellipse(azar() * 128, azar() * 128, 6 + azar() * 12, 4 + azar() * 7,
                azar() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function crearModeloMarc() {
  const grupo = new THREE.Group();
  const materiales = [];
  const azar = crearAleatorio(7);

  // Crear un material y apuntarlo en la lista (para el destello y la transparencia)
  function mat(opciones) {
    const m = new THREE.MeshLambertMaterial(Object.assign({ transparent: true }, opciones));
    materiales.push(m);
    return m;
  }
  // Añadir una pieza a un "padre" (el grupo entero o una pierna)
  function pieza(padre, geometria, material, x, y, z) {
    const malla = new THREE.Mesh(geometria, material);
    malla.position.set(x, y, z);
    malla.castShadow = true;
    padre.add(malla);
    return malla;
  }
  // Un cilindro que va DE un punto A A un punto B (para brazos).
  // Un cilindro nace vertical; lo giramos para que apunte de A a B.
  function cilindroEntre(a, b, radio, material) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const largo = A.distanceTo(B);
    const malla = pieza(grupo, new THREE.CylinderGeometry(radio, radio, largo, 10), material, 0, 0, 0);
    malla.position.copy(A).add(B).multiplyScalar(0.5);                 // en medio de A y B
    malla.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),    // de "vertical"...
                                        B.clone().sub(A).normalize()); // ...a "de A hacia B"
    return malla;
  }

  // ---------- Materiales ----------
  const camo = mat({ map: crearTexturaCamuflaje() });
  const chaleco = mat({ color: "#4b4a33" });
  const bolsillo = mat({ color: "#5f5c3d" });
  const correa = mat({ color: "#2b2a20" });
  const piel = mat({ color: "#e8b896" });
  const pelo = mat({ color: "#8a5a32" });
  const peloOscuro = mat({ color: "#6b4224" });
  const barba = mat({ color: "#7a5030" });
  const guante = mat({ color: "#1c1c1c" });
  const rodillera = mat({ color: "#9c8a66" });
  const bota = mat({ color: "#3b2a1e" });
  const metal = mat({ color: "#2a2a2a" });
  const metalOscuro = mat({ color: "#161616" });
  const blanco = mat({ color: "#ffffff" });
  const ojo = mat({ color: "#4a2e1a" });

  // ---------- Piernas (dentro de un "pivote" para poder balancearlas) ----------
  // El pivote está en la cadera: al girarlo, toda la pierna se mueve como un péndulo.
  const piernas = [];
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.position.set(0, 0.42, lado * 0.11);
    grupo.add(pivote);
    pieza(pivote, new THREE.CylinderGeometry(0.09, 0.085, 0.34, 10), camo, 0, -0.17, 0);       // pierna
    pieza(pivote, new THREE.BoxGeometry(0.06, 0.1, 0.12), rodillera, 0.08, -0.19, 0);          // rodillera
    pieza(pivote, new THREE.BoxGeometry(0.06, 0.07, 0.07), bolsillo, 0.0, -0.08, lado * 0.09); // bolsillo lateral
    pieza(pivote, new THREE.BoxGeometry(0.24, 0.1, 0.14), bota, 0.04, -0.37, 0);               // bota
    piernas.push(pivote);
  }

  // ---------- Cinturón ----------
  pieza(grupo, new THREE.CylinderGeometry(0.235, 0.235, 0.07, 14), correa, 0, 0.45, 0);
  pieza(grupo, new THREE.BoxGeometry(0.04, 0.05, 0.08), metalOscuro, 0.235, 0.45, 0);          // hebilla
  pieza(grupo, new THREE.BoxGeometry(0.08, 0.08, 0.07), bolsillo, 0.12, 0.43, 0.2);           // bolsillos del cinturón
  pieza(grupo, new THREE.BoxGeometry(0.08, 0.08, 0.07), bolsillo, 0.12, 0.43, -0.2);

  // ---------- Torso, chaleco y cuello ----------
  pieza(grupo, new THREE.BoxGeometry(0.36, 0.4, 0.5), camo, 0, 0.67, 0);                       // torso
  pieza(grupo, new THREE.BoxGeometry(0.42, 0.3, 0.44), chaleco, 0.01, 0.69, 0);                // chaleco
  for (const z of [-0.12, 0, 0.12]) {                                                         // 3 bolsillos delante
    pieza(grupo, new THREE.BoxGeometry(0.07, 0.14, 0.1), bolsillo, 0.24, 0.63, z);
  }
  pieza(grupo, new THREE.BoxGeometry(0.03, 0.06, 0.2), bolsillo, 0.23, 0.77, 0);               // placa de arriba
  for (const lado of [-1, 1]) {                                                                // correas de los hombros
    pieza(grupo, new THREE.BoxGeometry(0.42, 0.04, 0.08), correa, 0.01, 0.85, lado * 0.15);
  }
  pieza(grupo, new THREE.CylinderGeometry(0.13, 0.15, 0.1, 12), camo, 0, 0.9, 0);              // cuello alto

  // ---------- Fusil (delante, a la altura del pecho) ----------
  const yF = 0.62, zF = 0.05;
  pieza(grupo, new THREE.BoxGeometry(0.36, 0.09, 0.07), metal, 0.38, yF, zF);                   // cuerpo
  pieza(grupo, new THREE.BoxGeometry(0.17, 0.08, 0.06), metalOscuro, 0.13, yF - 0.01, zF);      // culata
  const canon = pieza(grupo, new THREE.CylinderGeometry(0.022, 0.022, 0.26, 8), metalOscuro, 0.68, yF + 0.01, zF);
  canon.rotation.z = Math.PI / 2;                                                               // tumbar el cañón
  const cargador = pieza(grupo, new THREE.BoxGeometry(0.06, 0.15, 0.05), metalOscuro, 0.42, yF - 0.1, zF);
  cargador.rotation.z = 0.25;
  pieza(grupo, new THREE.BoxGeometry(0.1, 0.05, 0.05), metalOscuro, 0.36, yF + 0.07, zF);      // mira

  // ---------- Brazos y guantes ----------
  const manoDer = [0.3, yF - 0.04, zF + 0.07];     // en la empuñadura
  const manoIzq = [0.5, yF - 0.03, zF - 0.06];     // sujetando por delante
  cilindroEntre([0.0, 0.8, 0.3], manoDer, 0.08, camo);
  cilindroEntre([0.0, 0.8, -0.3], manoIzq, 0.08, camo);
  pieza(grupo, new THREE.SphereGeometry(0.1, 12, 10), camo, 0, 0.8, 0.3);                        // hombros
  pieza(grupo, new THREE.SphereGeometry(0.1, 12, 10), camo, 0, 0.8, -0.3);
  pieza(grupo, new THREE.BoxGeometry(0.1, 0.09, 0.02), chaleco, 0.02, 0.8, 0.395);              // parches
  pieza(grupo, new THREE.BoxGeometry(0.1, 0.09, 0.02), chaleco, 0.02, 0.8, -0.395);
  pieza(grupo, new THREE.SphereGeometry(0.075, 10, 8), guante, ...manoDer);
  pieza(grupo, new THREE.SphereGeometry(0.075, 10, 8), guante, ...manoIzq);

  // ---------- Cabeza ----------
  const yC = 1.1;                                                     // altura del centro de la cabeza
  pieza(grupo, new THREE.SphereGeometry(0.26, 20, 16), piel, 0, yC, 0);
  for (const lado of [-1, 1]) {
    pieza(grupo, new THREE.SphereGeometry(0.06, 8, 6), piel, -0.01, yC - 0.01, lado * 0.255);   // orejas
    pieza(grupo, new THREE.SphereGeometry(0.05, 10, 8), blanco, 0.22, yC + 0.02, lado * 0.085); // ojos
    pieza(grupo, new THREE.SphereGeometry(0.03, 8, 6), ojo, 0.262, yC + 0.02, lado * 0.085);
    const ceja = pieza(grupo, new THREE.BoxGeometry(0.03, 0.025, 0.1), peloOscuro, 0.235, yC + 0.09, lado * 0.085);
  }
  pieza(grupo, new THREE.SphereGeometry(0.035, 8, 6), piel, 0.265, yC - 0.04, 0);                // nariz
  pieza(grupo, new THREE.BoxGeometry(0.05, 0.08, 0.1), barba, 0.21, yC - 0.18, 0);               // perilla
  pieza(grupo, new THREE.BoxGeometry(0.03, 0.02, 0.12), barba, 0.245, yC - 0.09, 0);             // bigote fino

  // ---------- Pelo rizado ----------
  // Muchas bolitas repartidas por la parte de arriba y de atrás de la cabeza.
  // Usamos coordenadas esféricas: un ángulo "vertical" (desde arriba) y otro "alrededor".
  const geoRizo = new THREE.IcosahedronGeometry(1, 1);
  for (let capa = 0; capa < 5; capa++) {
    const vertical = 0.15 + capa * 0.3;                       // de la coronilla hacia abajo
    const cuantos = capa === 0 ? 5 : 10 + capa * 2;
    for (let i = 0; i < cuantos; i++) {
      const alrededor = (i / cuantos) * Math.PI * 2 + capa * 0.4;
      const dx = Math.sin(vertical) * Math.cos(alrededor);
      const dy = Math.cos(vertical);
      const dz = Math.sin(vertical) * Math.sin(alrededor);
      // No poner rizos sobre la cara (delante y por debajo de la frente)
      if (dx > 0.25 && dy < 0.75) continue;
      if (dy < 0.05 && dx > -0.3) continue;                    // ni sobre las orejas
      const rizo = pieza(grupo, geoRizo, azar() < 0.35 ? peloOscuro : pelo,
                         dx * 0.26, yC + dy * 0.26, dz * 0.26);
      rizo.scale.setScalar(0.065 + azar() * 0.03);
    }
  }

  grupo.userData.materiales = materiales;
  grupo.userData.piernas = piernas;           // escena3d.js las balancea al caminar
  return grupo;
}
