// Núcleo del bucle de la consola: avanza una corrida de a poco, cuadro por cuadro.
//
// `simular()` de la librería corre una maniobra completa de una sola vez (es lo que usa el
// headless). La consola necesita lo mismo pero en pedazos: en cada cuadro de animación hace
// k llamadas a `paso()` (Avance 1, sección 6.1 y Figura 3). Este módulo aplica exactamente
// las mismas reglas que `simular()`: qué entrada rige en cada instante, cuándo termina y
// qué estado lleva la fase 'final'. Así la consola y el headless producen la misma serie,
// estado por estado, y el dictamen que se ve es el mismo que se comprueba sin interfaz
// (tests/app/corrida.test.ts lo verifica).
//
// No usa el DOM ni requestAnimationFrame: eso vive en useSimulacion.ts.
import { DT_REFERENCIA } from '../../fisica/constantes';
import { esEstadoFinal } from '../../fisica/simulador';
import type { ConfigEstacion, Entradas, Estado, Maniobra } from '../../fisica/tipos';
import { motorReal, type Motor } from './motor';

/** Mismo tope que `simular()` [s], para que una corrida siempre termine. */
export const T_MAX_CORRIDA = 1e4;

export interface Corrida {
  readonly config: ConfigEstacion;
  /** Maniobra ordenada por t_inicio. Crece si el operador da una orden en vivo. */
  readonly maniobra: Maniobra;
  /** Paso de tiempo simulado [s]. */
  readonly dt: number;
  /** Tiempo simulado máximo [s]. */
  readonly tMax: number;
  /**
   * Serie completa de estados desde t = 0. Crece en el lugar para no copiar decenas de miles
   * de estados por cuadro; los Estados en sí nunca se modifican.
   */
  readonly serie: readonly Estado[];
  /** Último estado tal como lo devolvió el motor (sin la marca de fase 'final'). */
  readonly estado: Estado;
  /** true cuando se alcanzó el estado final estable o tMax. */
  readonly terminada: boolean;
}

export interface OpcionesCorrida {
  readonly motor?: Motor;
  readonly dt?: number;
  readonly tMax?: number;
}

/** Entradas por defecto cuando todavía no rige ninguna: estación en reposo, igual que simular(). */
function reposo(estado: Estado): Entradas {
  return { tau: 0, r_a_objetivo: estado.r_a, v_a: 0, u: 0 };
}

/** La entrada de la maniobra que rige en t [s], con la tolerancia de medio paso de simular(). */
export function entradasVigentes(maniobra: Maniobra, estado: Estado, dt: number): Entradas {
  const ahora = estado.t + dt / 2;
  const vigente = maniobra.filter((p) => p.t_inicio <= ahora).pop();
  return vigente?.entradas ?? reposo(estado);
}

function ultimoInicio(maniobra: Maniobra): number {
  return maniobra.length > 0 ? maniobra[maniobra.length - 1]!.t_inicio : 0;
}

export function crearCorrida(config: ConfigEstacion, maniobra: Maniobra, opciones: OpcionesCorrida = {}): Corrida {
  const motor = opciones.motor ?? motorReal;
  const estado = motor.crearEstado(config);
  return {
    config,
    maniobra: [...maniobra].sort((a, b) => a.t_inicio - b.t_inicio),
    dt: opciones.dt ?? DT_REFERENCIA,
    tMax: opciones.tMax ?? T_MAX_CORRIDA,
    serie: [estado],
    estado,
    terminada: false,
  };
}

/**
 * Avanza hasta `pasos` llamadas a `paso()`, o menos si la corrida termina antes.
 * Al terminar, el último estado de la serie lleva fase 'final', como en simular().
 */
export function avanzar(corrida: Corrida, pasos: number, motor: Motor = motorReal): Corrida {
  if (corrida.terminada || pasos <= 0) return corrida;
  const serie = corrida.serie as Estado[];
  const { dt, maniobra, tMax } = corrida;
  const inicioUltimo = ultimoInicio(maniobra);
  let estado = corrida.estado;
  let terminada = false;

  for (let i = 0; i < pasos; i++) {
    if (estado.t >= tMax) {
      terminada = true;
      break;
    }
    const ahora = estado.t + dt / 2;
    estado = motor.paso(estado, dt, entradasVigentes(maniobra, estado, dt));
    serie.push(estado);
    if (inicioUltimo <= ahora && esEstadoFinal(estado)) {
      terminada = true;
      break;
    }
  }
  if (estado.t >= tMax) terminada = true;
  if (terminada) serie[serie.length - 1] = { ...estado, fase: 'final' };
  return { ...corrida, serie, estado, terminada };
}

/** El estado que se muestra: el último de la serie (con la fase 'final' si ya terminó). */
export function estadoVisible(corrida: Corrida): Estado {
  return corrida.serie[corrida.serie.length - 1]!;
}

/**
 * true si el operador puede ordenar un traslado del ascensor ahora: ya no queda ninguna
 * entrada programada por empezar y la que rige no aplica torque (el encendido terminó).
 */
export function puedeOrdenarAscensor(corrida: Corrida): boolean {
  const { maniobra, estado, dt } = corrida;
  if (estado.t === 0) return false;
  if (ultimoInicio(maniobra) > estado.t + dt / 2) return false;
  return entradasVigentes(maniobra, estado, dt).tau === 0;
}

/**
 * Orden en vivo del operador: trasladar el ascensor a r_a_objetivo [m] con rapidez v_a [m/s]
 * desde el siguiente paso. Si la corrida ya había terminado, se reanuda y vuelve a terminar
 * sola cuando la estación recupera un giro constante después del traslado.
 */
export function ordenarAscensor(corrida: Corrida, r_a_objetivo: number, v_a: number): Corrida {
  if (!puedeOrdenarAscensor(corrida)) return corrida;
  const entrada = { t_inicio: corrida.estado.t, entradas: { tau: 0, r_a_objetivo, v_a, u: 0 } };
  const serie = corrida.serie as Estado[];
  // Se quita la marca 'final': la corrida sigue.
  if (corrida.terminada) serie[serie.length - 1] = corrida.estado;
  return { ...corrida, maniobra: [...corrida.maniobra, entrada], serie, terminada: false };
}
