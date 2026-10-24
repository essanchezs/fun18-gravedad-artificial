// Gravedad aparente, gradiente cabeza-pies y dictamen de habitabilidad
// (Avance 1, secciones 3.2 y 5.4; Tabla 3).
//
// Todo en SI. La conversión a g0, rpm y porcentaje ocurre en src/app/, nunca aquí.
import type { Dictamen, Estado, Limites, Violacion } from './tipos';

/**
 * Aceleración centrípeta a distancia r del eje: a_c = ω²·r.
 * Es la gravedad aparente que percibe quien está a ese radio.
 * ω [rad/s], r [m] → a_c [m/s²].
 */
export function aceleracionCentripeta(omega: number, r: number): number {
  return omega * omega * r;
}

/**
 * Gradiente de gravedad entre los pies y la cabeza de un tripulante de altura h_t
 * parado sobre la cara interna del aro:
 *
 *   Δa/a = (a_c(R) − a_c(R − h_t)) / a_c(R)
 *
 * Al desarrollarlo ω se cancela y queda exactamente h_t/R, es decir que el gradiente
 * depende solo de la geometría. Con la estación detenida el cociente es 0/0 y se
 * devuelve 0: sin rotación no hay gravedad y por lo tanto tampoco diferencia entre
 * cabeza y pies. El criterio de gravedad aparente es el que marca esa situación.
 *
 * ω [rad/s], R [m], h_t [m] → Δa/a [--], fracción de 0 a 1 (0,0075 = 0,75 %).
 */
export function gradienteCabezaPies(omega: number, R: number, h_t: number): number {
  const pies = aceleracionCentripeta(omega, R);
  if (pies === 0) return 0;
  return (pies - aceleracionCentripeta(omega, R - h_t)) / pies;
}

/**
 * Emite el dictamen de habitabilidad a partir del estado actual, evaluando los tres
 * criterios médicos del anexo del Proyecto 3 (Tabla 3 del Avance 1):
 *
 *   1. gravedad aparente en el aro entre 0,8 g0 y 1,1 g0
 *   2. velocidad de rotación no mayor a 2,0 rpm (umbral de mareo por Coriolis)
 *   3. gradiente cabeza-pies menor al 20 %
 *
 * La comparación se hace íntegramente en SI y los valores devueltos también van en SI.
 * El sentido de giro no influye: se compara |ω|.
 */
export function evaluarDictamen(estado: Omit<Estado, 'dictamen'>, limites: Limites): Dictamen {
  const violaciones: Violacion[] = [];

  if (estado.a_piso < limites.a_min) {
    violaciones.push({ criterio: 'gravedad', valor: estado.a_piso, limite: limites.a_min, unidad: 'm/s²' });
  } else if (estado.a_piso > limites.a_max) {
    violaciones.push({ criterio: 'gravedad', valor: estado.a_piso, limite: limites.a_max, unidad: 'm/s²' });
  }

  const giro = Math.abs(estado.omega);
  if (giro > limites.omega_max) {
    violaciones.push({ criterio: 'rotacion', valor: giro, limite: limites.omega_max, unidad: 'rad/s' });
  }

  if (estado.gradiente > limites.gradiente_max) {
    violaciones.push({ criterio: 'gradiente', valor: estado.gradiente, limite: limites.gradiente_max, unidad: '--' });
  }

  return { apto: violaciones.length === 0, violaciones };
}
