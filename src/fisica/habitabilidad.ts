// PROVISIONAL (Persona 1): solo para que el simulador compile y corra.
// Este módulo es de Aza (Persona 2), que lo reemplaza con la versión completa
// sin cambiar las firmas (Avance 1, Tabla 9).
import type { Dictamen, Estado, Limites } from './tipos';

/** a_c = ω²·r. ω [rad/s], r [m] → a_c [m/s²]. */
export function aceleracionCentripeta(omega: number, r: number): number {
  return omega * omega * r;
}

/** (a_c(R) − a_c(R − h_t)) / a_c(R) = h_t/R. ω [rad/s], R [m], h_t [m] → [--]. Con ω = 0 devuelve 0. */
export function gradienteCabezaPies(omega: number, R: number, h_t: number): number {
  const pies = aceleracionCentripeta(omega, R);
  if (pies === 0) return 0;
  return (pies - aceleracionCentripeta(omega, R - h_t)) / pies;
}

/** Stub: siempre APTO hasta que Aza suba evaluarDictamen. */
export function evaluarDictamen(_estado: Omit<Estado, 'dictamen'>, _limites: Limites): Dictamen {
  return { apto: true, violaciones: [] };
}
