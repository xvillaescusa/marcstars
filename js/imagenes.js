// =============================================================
//  imagenes.js — cargar los sprites (imágenes)
// =============================================================
//  Las imágenes están en la carpeta img/. Son archivos .svg (dibujos
//  hechos con texto: ¡puedes abrirlos con el Bloc de notas y cambiar
//  colores!). También podrías usar .png: solo hay que cambiar la ruta.
//
//  IMPORTANTE: una imagen NO se carga al instante. El navegador tarda
//  un poco en leerla, así que hay que ESPERAR a que todas estén listas
//  antes de empezar. Para eso usamos "onload" (= "cuando termines de cargar").
// =============================================================
const RUTAS_IMAGENES = {
  chispa:  "img/chispa.svg",
  ruda:    "img/ruda.svg",
  pluma:   "img/pluma.svg",
  marc:    "img/marc-retrato.png",   // foto del modelo .glb (de frente)
  enemigo: "img/enemigo.svg",
  muro:    "img/muro.svg",
  arbusto: "img/arbusto.svg",
  agua:    "img/agua.svg",
  suelo:   "img/suelo.svg"
};

// Aquí quedarán las imágenes ya cargadas: IMAGENES.muro, IMAGENES.chispa...
// Si alguna falla, valdrá null y el juego dibujará un círculo en su lugar.
const IMAGENES = {};

function cargarImagenes(alTerminar) {
  const nombres = Object.keys(RUTAS_IMAGENES);   // ["chispa", "ruda", ...]
  let pendientes = nombres.length;

  // Se llama cada vez que una imagen termina (bien o mal)
  function unaMenos() {
    pendientes--;
    if (pendientes === 0) alTerminar();          // ¡todas listas!
  }

  for (const nombre of nombres) {
    const img = new Image();
    img.onload = () => {
      IMAGENES[nombre] = img;
      unaMenos();
    };
    img.onerror = () => {
      console.warn("No se pudo cargar la imagen:", RUTAS_IMAGENES[nombre]);
      IMAGENES[nombre] = null;
      unaMenos();
    };
    img.src = RUTAS_IMAGENES[nombre];            // esto empieza la carga
  }
}
