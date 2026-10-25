// Conversión de unidades en la frontera con el usuario (Avance 1, sección 6.1).
//
// La librería trabaja solo en SI. Este es el único lugar del proyecto donde existen rpm,
// múltiplos de g0, kilómetros, toneladas, megajoules, minutos y porcentajes. Va en los dos
// sentidos: de SI a lectura humana para mostrar, y de lectura humana a SI para los
// parámetros que escribe el operador. No usa el DOM, así que se prueba con Vitest.
import { g0 } from '../fisica/constantes';

const RPM_POR_RAD_S = 60 / (2 * Math.PI);

/** ω [rad/s] → [rpm]. */
export const aRpm = (omega: number): number => omega * RPM_POR_RAD_S;
/** [rpm] → ω [rad/s]. */
export const desdeRpm = (rpm: number): number => rpm / RPM_POR_RAD_S;

/** a [m/s²] → múltiplos de g0 [g]. */
export const aG = (a: number): number => a / g0;
/** [g] → a [m/s²]. */
export const desdeG = (g: number): number => g * g0;

/** [m] → [km]. */
export const aKm = (m: number): number => m / 1e3;
/** [km] → [m]. */
export const desdeKm = (km: number): number => km * 1e3;

/** [kg] → [t]. */
export const aToneladas = (kg: number): number => kg / 1e3;
/** [t] → [kg]. */
export const desdeToneladas = (t: number): number => t * 1e3;

/** [J] → [MJ]. */
export const aMJ = (J: number): number => J / 1e6;
/** [MJ] → [J]. */
export const desdeMJ = (MJ: number): number => MJ * 1e6;

/** [s] → [min]. */
export const aMinutos = (s: number): number => s / 60;

/** Fracción de 0 a 1 → [%]. */
export const aPorcentaje = (fraccion: number): number => fraccion * 100;
/** [%] → fracción de 0 a 1. */
export const desdePorcentaje = (pct: number): number => pct / 100;

// ── Formato para mostrar ──────────────────────────────────────────────────────────────
// Coma decimal y espacio fino como separador de miles, como en los documentos del grupo.

const LOCALE = 'es-CR';

/** Número con d decimales fijos, coma decimal. Devuelve '—' si el valor no es finito. */
export function fijo(x: number, d = 2): string {
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Notación científica legible: 1,97×10¹⁰. */
export function cientifico(x: number, d = 2): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return fijo(0, d);
  let exp = Math.floor(Math.log10(Math.abs(x)));
  let mantisa = x / 10 ** exp;
  // Al redondear, 9,996 pasaría a 10,00: se corrige subiendo el exponente.
  if (Math.abs(Number(mantisa.toFixed(d))) >= 10) {
    exp += 1;
    mantisa /= 10;
  }
  return `${fijo(mantisa, d)}×10${superindice(exp)}`;
}

const SUPER: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

function superindice(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUPER[c] ?? c)
    .join('');
}

/** Valor con su unidad, separado por un espacio no separable. */
export const conUnidad = (texto: string, unidad: string): string => `${texto} ${unidad}`;
