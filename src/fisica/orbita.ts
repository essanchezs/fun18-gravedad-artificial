// Contexto orbital de la estación para una altitud dada (Avance 1, sección 5.6).
//
// Nada de esto depende de la rotación del hábitat: son propiedades de su órbita
// alrededor de la Tierra. La altitud entra siempre en metros; la consola la
// muestra en kilómetros, pero esa conversión ocurre en src/app/.
import { G, M_T, R_T } from './constantes';

/** Distancia al centro de la Tierra. h [m] → r [m]. */
function radioOrbital(h: number): number {
  return R_T + h;
}

/**
 * Gravedad terrestre local: g(h) = G·M_T/(R_T + h)².
 * A 400 km vale ≈8,69 m/s², el 89 % de su valor en la superficie: es el número que
 * demuestra que la ingravidez orbital no es ausencia de gravedad sino caída libre.
 * h [m] → g [m/s²].
 */
export function gravedadOrbital(h: number): number {
  const r = radioOrbital(h);
  return (G * M_T) / (r * r);
}

/** Rapidez de una órbita circular: v = √(G·M_T/(R_T + h)). h [m] → v [m/s]. */
export function velocidadOrbital(h: number): number {
  return Math.sqrt((G * M_T) / radioOrbital(h));
}

/** Período de la órbita circular: T = 2π(R_T + h)/v. h [m] → T [s]. */
export function periodoOrbital(h: number): number {
  return (2 * Math.PI * radioOrbital(h)) / velocidadOrbital(h);
}

/**
 * Energía mecánica total en órbita circular: E = −G·M_T·m/(2(R_T + h)).
 * Es negativa porque el cuerpo está ligado gravitatoriamente.
 * m [kg], h [m] → E_mec [J].
 */
export function energiaOrbital(m: number, h: number): number {
  return -(G * M_T * m) / (2 * radioOrbital(h));
}
