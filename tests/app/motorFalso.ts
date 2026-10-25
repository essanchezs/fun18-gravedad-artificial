// Motor falso para probar la consola sin la física real.
//
// Cumple el mismo contrato `Motor` que la librería y usa los mismos tipos de
// src/fisica/tipos.ts, sin redefinirlos. Devuelve una secuencia de estados guionada,
// lo que permite forzar en una prueba situaciones que con el motor real exigirían
// simular más de 1 000 s (por ejemplo, una violación de gravedad a mitad de maniobra).
import { CONFIG_REFERENCIA, LIMITES } from '../../src/fisica/constantes';
import type { Motor } from '../../src/app/simulacion/motor';
import type { Dictamen, Entradas, Estado } from '../../src/fisica/tipos';

export const DICTAMEN_APTO: Dictamen = { apto: true, violaciones: [] };

/** Estado mínimo coherente con la configuración de referencia en crucero (0,95 g). */
export function estadoBase(cambios: Partial<Estado> = {}): Estado {
  return {
    config: CONFIG_REFERENCIA,
    t: 0,
    theta: 0,
    omega: 0.19675,
    alpha: 0,
    I: 1.972e10,
    L: 3.88e9,
    E_rot: 3.817e8,
    r_a: CONFIG_REFERENCIA.r_hub,
    v_a: 0,
    u: 0,
    a_piso: 9.29,
    gradiente: 0.0075,
    peso_t: 743,
    a_cor: 0,
    fase: 'crucero',
    dictamen: DICTAMEN_APTO,
    ...cambios,
  };
}

/** Estado NO APTO por gravedad baja, como el traslado de 40 t (0,76 g). */
export function estadoNoApto(cambios: Partial<Estado> = {}): Estado {
  const a_piso = 7.46;
  return estadoBase({
    a_piso,
    fase: 'maniobra',
    v_a: 2,
    dictamen: {
      apto: false,
      violaciones: [{ criterio: 'gravedad', valor: a_piso, limite: LIMITES.a_min, unidad: 'm/s²' }],
    },
    ...cambios,
  });
}

export interface MotorFalso extends Motor {
  /** Entradas recibidas en cada llamada a paso(), en orden. */
  readonly llamadas: Entradas[];
}

/**
 * Motor que entrega `guion[i]` en la i-ésima llamada a paso() (avanzando t en dt) y repite
 * el último cuando se acaba el guion.
 */
export function crearMotorFalso(inicial: Estado, guion: readonly Partial<Estado>[]): MotorFalso {
  const llamadas: Entradas[] = [];
  return {
    llamadas,
    crearEstado: () => inicial,
    paso: (estado, dt, entradas) => {
      const cambios = guion[Math.min(llamadas.length, guion.length - 1)] ?? {};
      llamadas.push(entradas);
      return { ...estado, ...cambios, t: estado.t + dt };
    },
  };
}
