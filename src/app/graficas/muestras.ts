// Series submuestreadas para las gráficas en tiempo real.
//
// sim.serie guarda cada paso de la corrida (dt = 0,05 s: unos 22 000 estados con el ascensor). Dibujar todos en
// cada cuadro sería un desperdicio, así que aquí se toma un punto cada INTERVALO_MUESTRA s simulados. Los datos
// completos siguen en sim.serie (de ahí sale también el CSV); el submuestreo es solo para el dibujo
// (Avance 1, sección 8.1). El módulo no usa el DOM, así que se prueba con Vitest.
import type { Estado } from '../../fisica/tipos';
import { aG } from '../unidades';

/** Cada cuántos segundos simulados se guarda un punto para dibujar. */
export const INTERVALO_MUESTRA = 0.5;

export interface Muestras {
  readonly t: number[]; // tiempo simulado [s]
  readonly omega: number[]; // velocidad angular [rad/s]
  readonly alpha: number[]; // aceleración angular [rad/s²]
  readonly a_g: number[]; // gravedad aparente en el aro [g₀]
  readonly L: number[]; // momento angular total [kg·m²/s]
  /** Primer estado de la corrida que se está leyendo: si cambia, empezó otra corrida. */
  primero: Estado | null;
  /** Cuántos estados de la serie ya se leyeron. */
  leidos: number;
  proximo: number;
}

export function crearMuestras(): Muestras {
  return { t: [], omega: [], alpha: [], a_g: [], L: [], primero: null, leidos: 0, proximo: 0 };
}

function vaciar(m: Muestras): void {
  m.t.length = 0;
  m.omega.length = 0;
  m.alpha.length = 0;
  m.a_g.length = 0;
  m.L.length = 0;
  m.primero = null;
  m.leidos = 0;
  m.proximo = 0;
}

function agregar(m: Muestras, e: Estado): void {
  m.t.push(e.t);
  m.omega.push(e.omega);
  m.alpha.push(e.alpha);
  m.a_g.push(aG(e.a_piso));
  m.L.push(e.L);
}

/**
 * Lee de la serie solo los estados nuevos y guarda un punto cada INTERVALO_MUESTRA s (más el primero y el estado
 * final). Si la serie es de otra corrida, empieza de nuevo. Se puede llamar en cada cuadro: es idempotente.
 */
export function actualizarMuestras(m: Muestras, serie: readonly Estado[]): void {
  if (serie.length === 0) {
    vaciar(m);
    return;
  }
  if (m.primero !== serie[0] || serie.length < m.leidos) vaciar(m);
  m.primero = serie[0]!;

  for (let i = m.leidos; i < serie.length; i++) {
    const e = serie[i]!;
    const esUltimo = i === serie.length - 1;
    if (i === 0 || e.t >= m.proximo - 1e-9 || (esUltimo && e.fase === 'final' && e.t > (m.t[m.t.length - 1] ?? -1))) {
      agregar(m, e);
      while (m.proximo <= e.t + 1e-9) m.proximo += INTERVALO_MUESTRA;
    }
  }
  m.leidos = serie.length;
}
