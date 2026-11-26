import * as THREE from 'three';

/**
 * Entorno de estudio para el oro: una sala oscura con pocas cajas de luz cálidas y un contraluz frío.
 * Da reflejos de producto sobre negro (oro profundo, no blanquecino) y se convierte en PMREM una sola vez.
 */
export function crearEstudio(renderer: THREE.WebGLRenderer) {
  const sala = new THREE.Scene();
  sala.background = new THREE.Color('#0b0c0a');
  const caja = (w: number, h: number, color: string, intensidad: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensidad), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    sala.add(m);
    return m;
  };
  caja(6, 2.2, '#fff1d6', 2.6, [0, 6, 2]); // luz cenital cálida
  caja(3, 5, '#ffe6bd', 1.8, [6, 1.5, 4]); // clave lateral
  caja(2, 4, '#c8d9e4', 1.2, [-6, 1, -3]); // contraluz frío
  caja(8, 1, '#ffcf87', 0.5, [0, -3, 5]); // rebote del suelo
  caja(1.2, 3, '#ffffff', 2.2, [-3, 2.5, 6]); // brillo de borde
  caja(12, 3.5, '#ffdca6', 1.1, [0, 4.5, 9]); // luz frontal alta: la cara del lingote nunca queda negra
  caja(16, 0.6, '#f6d9a8', 0.8, [0, 0.4, -10]); // franja de horizonte detrás
  // Degradado suave del suelo: evita negros absolutos en las caras inferiores.
  const suelo = new THREE.Mesh(
    new THREE.CircleGeometry(14, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#2a2418') }),
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -4;
  sala.add(suelo);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(sala, 0.02).texture;
  sala.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
  pmrem.dispose();
  return tex;
}
