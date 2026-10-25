// Los 13 parámetros ajustables de la Tabla 5 del Avance 1 y cómo se muestran en el panel de controles.
//
// La librería trabaja solo en SI. Lo que se escribe o se arrastra en el panel está en la unidad de lectura
// (t, km, …) y se convierte con src/app/unidades.ts, el único lugar donde existen esas unidades.
// Este módulo no usa el DOM, así que se prueba con Vitest.
import type { ConfigEstacion } from '../../fisica/tipos';
import { aKm, aToneladas, desdeKm, desdeToneladas } from '../unidades';

export type GrupoParametro = 'geometria' | 'encendido' | 'ascensor' | 'tripulante' | 'orbita';

export interface DefParametro {
  readonly clave: keyof ConfigEstacion;
  readonly simbolo: string;
  readonly nombre: string;
  /** Unidad con la que se muestra y se escribe. */
  readonly unidad: string;
  readonly grupo: GrupoParametro;
  /** Límites y paso del control, en la unidad mostrada. */
  readonly min: number;
  readonly max: number;
  readonly paso: number;
  /** SI → unidad mostrada. */
  readonly aMostrado: (valorSI: number) => number;
  /** Unidad mostrada → SI. */
  readonly aSI: (valorMostrado: number) => number;
  readonly entero?: boolean;
  readonly nota?: string;
}

export const GRUPOS: ReadonlyArray<{ readonly id: GrupoParametro; readonly titulo: string }> = [
  { id: 'geometria', titulo: 'Geometría del hábitat' },
  { id: 'encendido', titulo: 'Encendido' },
  { id: 'ascensor', titulo: 'Ascensor' },
  { id: 'tripulante', titulo: 'Tripulante' },
  { id: 'orbita', titulo: 'Órbita' },
];

const identidad = (x: number): number => x;

export const PARAMETROS: readonly DefParametro[] = [
  { clave: 'R', simbolo: 'R', nombre: 'Radio del aro', unidad: 'm', grupo: 'geometria', min: 60, max: 400, paso: 1, aMostrado: identidad, aSI: identidad },
  { clave: 'M_aro', simbolo: 'M_aro', nombre: 'Masa del aro', unidad: 't', grupo: 'geometria', min: 50, max: 1000, paso: 10, aMostrado: aToneladas, aSI: desdeToneladas },
  { clave: 'M_hub', simbolo: 'M_hub', nombre: 'Masa del hub', unidad: 't', grupo: 'geometria', min: 10, max: 300, paso: 1, aMostrado: aToneladas, aSI: desdeToneladas },
  { clave: 'r_hub', simbolo: 'r_hub', nombre: 'Radio del hub', unidad: 'm', grupo: 'geometria', min: 5, max: 40, paso: 0.5, aMostrado: identidad, aSI: identidad },
  { clave: 'n', simbolo: 'n', nombre: 'N.º de radios', unidad: '', grupo: 'geometria', min: 3, max: 8, paso: 1, aMostrado: identidad, aSI: identidad, entero: true },
  { clave: 'm_radio', simbolo: 'm_radio', nombre: 'Masa por radio', unidad: 't', grupo: 'geometria', min: 5, max: 100, paso: 1, aMostrado: aToneladas, aSI: desdeToneladas },
  { clave: 'tau', simbolo: 'τ', nombre: 'Torque de los propulsores', unidad: 'N·m', grupo: 'encendido', min: 5e5, max: 1.2e7, paso: 1e5, aMostrado: identidad, aSI: identidad },
  { clave: 't_enc', simbolo: 't_enc', nombre: 'Duración del encendido', unidad: 's', grupo: 'encendido', min: 100, max: 2000, paso: 10, aMostrado: identidad, aSI: identidad },
  { clave: 'm_a', simbolo: 'm_a', nombre: 'Masa que traslada', unidad: 't', grupo: 'ascensor', min: 0, max: 100, paso: 1, aMostrado: aToneladas, aSI: desdeToneladas },
  { clave: 'm_t', simbolo: 'm_t', nombre: 'Masa del tripulante', unidad: 'kg', grupo: 'tripulante', min: 40, max: 150, paso: 1, aMostrado: identidad, aSI: identidad },
  { clave: 'h_t', simbolo: 'h_t', nombre: 'Altura del tripulante', unidad: 'm', grupo: 'tripulante', min: 1.4, max: 2.1, paso: 0.01, aMostrado: identidad, aSI: identidad },
  {
    clave: 'u',
    simbolo: 'u',
    nombre: 'Rapidez de caminata',
    unidad: 'm/s',
    grupo: 'tripulante',
    min: 0,
    max: 3,
    paso: 0.1,
    aMostrado: identidad,
    aSI: identidad,
    nota: 'La caminata se ejecuta en la Entrega Final: en este avance no cambia la maniobra.',
  },
  { clave: 'h', simbolo: 'h', nombre: 'Altitud de la órbita', unidad: 'km', grupo: 'orbita', min: 200, max: 2000, paso: 10, aMostrado: aKm, aSI: desdeKm },
];

/** Cuántos decimales conviene mostrar para un paso dado. */
export function decimalesDe(paso: number): number {
  return paso >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(paso)));
}

/**
 * Lo escrito o arrastrado (en la unidad mostrada) → valor en SI: se acota al rango, se ajusta al paso
 * y, si el parámetro es entero, se redondea.
 */
export function ajustarASI(def: DefParametro, valorMostrado: number): number {
  const acotado = Math.min(def.max, Math.max(def.min, valorMostrado));
  const alPaso = def.min + Math.round((acotado - def.min) / def.paso) * def.paso;
  const limpio = Number(Math.min(def.max, alPaso).toPrecision(12)); // quita el ruido de punto flotante (0,1 + 0,2)
  return def.aSI(def.entero ? Math.round(limpio) : limpio);
}

/** Configuración nueva con un parámetro cambiado; la anterior no se modifica. */
export function conParametro(config: ConfigEstacion, clave: keyof ConfigEstacion, valorSI: number): ConfigEstacion {
  return { ...config, [clave]: valorSI };
}
