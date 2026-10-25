// Geometría del corte transversal en píxeles, a partir del Estado (Avance 1, Figuras 1 y 2).
//
// Solo traduce posiciones: no calcula física. El ángulo θ, la posición del ascensor r_a y la
// gravedad aparente salen del Estado que entrega la librería. Separado del dibujo en Canvas
// para poder probarlo sin navegador.
import type { Estado } from '../../fisica/tipos';
import { aG } from '../unidades';

export interface Punto {
  readonly x: number;
  readonly y: number;
}

export interface Escena {
  readonly centro: Punto;
  /** Píxeles por metro. */
  readonly escala: number;
  readonly radioAro: number; // [px]
  readonly radioHub: number; // [px]
  /** Extremos de cada radio estructural, del borde del hub al aro. */
  readonly radios: readonly { readonly desde: Punto; readonly hasta: Punto }[];
  /** Posición del ascensor sobre el radio 0, a la distancia r_a del eje. */
  readonly ascensor: Punto;
  /** Posición del tripulante sobre la cara interna del aro. */
  readonly tripulante: Punto;
  /** Punta de la flecha de a_c, que apunta del tripulante hacia el eje. */
  readonly puntaAc: Punto;
  /** Ángulo de pantalla del radio del ascensor [rad], para orientar su etiqueta. */
  readonly anguloAscensor: number;
}

/** Fracción del lado menor del lienzo que ocupa el diámetro del aro. */
const OCUPACION = 0.8;
/** Largo de la flecha de a_c: esta fracción del radio por cada g de gravedad aparente. */
const FLECHA_POR_G = 0.28;

/**
 * Pasa de coordenadas polares de la estación (r [m], ángulo [rad] antihorario, como en la
 * Figura 2) a píxeles de pantalla, donde el eje y crece hacia abajo.
 */
export function polarAPantalla(centro: Punto, escala: number, r: number, angulo: number): Punto {
  return { x: centro.x + r * escala * Math.cos(angulo), y: centro.y - r * escala * Math.sin(angulo) };
}

export function calcularEscena(estado: Estado, ancho: number, alto: number): Escena {
  const { R, r_hub } = estado.config;
  const n = Math.max(1, Math.round(estado.config.n));
  const centro = { x: ancho / 2, y: alto / 2 };
  const escala = (Math.min(ancho, alto) * OCUPACION) / (2 * R);
  // El hub real mide 12 m contra 240 m del aro: se dibuja con un mínimo para que se vea.
  const radioHub = Math.max(r_hub * escala, 10);
  const r_hubDibujo = radioHub / escala;

  const radios = Array.from({ length: n }, (_, k) => {
    const angulo = estado.theta + (2 * Math.PI * k) / n;
    return { desde: polarAPantalla(centro, escala, r_hubDibujo, angulo), hasta: polarAPantalla(centro, escala, R, angulo) };
  });

  // El ascensor recorre el radio 0 entre el hub y el aro.
  const r_aDibujo = r_hubDibujo + ((estado.r_a - r_hub) / (R - r_hub)) * (R - r_hubDibujo);
  const ascensor = polarAPantalla(centro, escala, r_aDibujo, estado.theta);

  // El tripulante está sobre el aro, a medio camino entre el último radio y el del ascensor.
  const anguloTripulante = estado.theta - Math.PI / n;
  const tripulante = polarAPantalla(centro, escala, R, anguloTripulante);
  const largoFlecha = Math.min(aG(estado.a_piso) * FLECHA_POR_G, 0.6) * R;
  const puntaAc = polarAPantalla(centro, escala, R - largoFlecha, anguloTripulante);

  return {
    centro,
    escala,
    radioAro: R * escala,
    radioHub,
    radios,
    ascensor,
    tripulante,
    puntaAc,
    anguloAscensor: -estado.theta,
  };
}

/** Largo "redondo" para la barra de escala (10, 20, 50, 100… m) que mida entre 40 y 120 px. */
export function barraEscala(escala: number): { metros: number; px: number } {
  const candidatos = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const metros = candidatos.find((m) => m * escala >= 60) ?? candidatos[candidatos.length - 1]!;
  return { metros, px: metros * escala };
}
