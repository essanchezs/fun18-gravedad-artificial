// Lo que muestra el panel de certificación, calculado a partir del Estado (Avance 1, 3.1–3.5).
//
// El veredicto NO se recalcula aquí: APTO / NO APTO y qué criterio falla salen de
// `estado.dictamen`, que emite evaluarDictamen() en la librería. Así la consola muestra el
// mismo dictamen que comprueban las pruebas y el headless. Este módulo solo lo traduce a
// unidades de lectura humana (g, rpm, %) y lleva el historial de violaciones de la sesión.
// No usa el DOM.
import { LIMITES } from '../../fisica/constantes';
import type { Estado, Limites, Violacion } from '../../fisica/tipos';
import { aG, aPorcentaje, aRpm, fijo } from '../unidades';

export type Criterio = Violacion['criterio'];

export interface FilaCriterio {
  readonly criterio: Criterio;
  readonly nombre: string;
  /** Valor actual en unidades de lectura humana, p. ej. '0,95 g'. */
  readonly valor: string;
  /** Rango aceptable en unidades de lectura humana, p. ej. '0,8 – 1,1 g'. */
  readonly banda: string;
  /** true si el dictamen de la librería no reporta violación para este criterio. */
  readonly ok: boolean;
}

/** Valor SI → texto con la unidad de lectura del criterio. */
export function textoCriterio(criterio: Criterio, valorSI: number): string {
  switch (criterio) {
    case 'gravedad':
      return `${fijo(aG(valorSI), 2)} g`;
    case 'rotacion':
      return `${fijo(aRpm(valorSI), 2)} rpm`;
    case 'gradiente':
      return `${fijo(aPorcentaje(valorSI), 2)} %`;
  }
}

export function filasCertificacion(estado: Estado, limites: Limites = LIMITES): readonly FilaCriterio[] {
  const fallan = new Set(estado.dictamen.violaciones.map((v) => v.criterio));
  return [
    {
      criterio: 'gravedad',
      nombre: 'Gravedad aparente',
      valor: textoCriterio('gravedad', estado.a_piso),
      banda: `${fijo(aG(limites.a_min), 1)} – ${fijo(aG(limites.a_max), 1)} g`,
      ok: !fallan.has('gravedad'),
    },
    {
      criterio: 'rotacion',
      nombre: 'Rotación',
      valor: textoCriterio('rotacion', Math.abs(estado.omega)),
      banda: `máx. ${fijo(aRpm(limites.omega_max), 1)} rpm`,
      ok: !fallan.has('rotacion'),
    },
    {
      criterio: 'gradiente',
      nombre: 'Gradiente cabeza-pies',
      valor: textoCriterio('gradiente', estado.gradiente),
      banda: `máx. ${fijo(aPorcentaje(limites.gradiente_max), 0)} %`,
      ok: !fallan.has('gradiente'),
    },
  ];
}

// ── Historial de violaciones de la sesión ─────────────────────────────────────────────

/** Un tramo continuo en que un criterio estuvo violado. */
export interface Episodio {
  readonly criterio: Criterio;
  readonly t_inicio: number; // [s]
  /** [s]; null mientras la violación sigue activa. */
  readonly t_fin: number | null;
  /** Valor más alejado del límite durante el tramo, en SI. */
  readonly peor: number;
  /** Límite incumplido, en SI. */
  readonly limite: number;
}

/**
 * Agrega un estado al historial y devuelve el historial nuevo (no modifica el anterior).
 * Abre un episodio cuando un criterio empieza a fallar, guarda el peor valor mientras
 * dura y lo cierra cuando el dictamen deja de reportarlo.
 */
export function registrarEstado(historial: readonly Episodio[], estado: Estado): readonly Episodio[] {
  const activas = new Map(estado.dictamen.violaciones.map((v) => [v.criterio, v]));
  let cambio = false;

  const siguiente = historial.map((ep) => {
    if (ep.t_fin !== null) return ep;
    const v = activas.get(ep.criterio);
    activas.delete(ep.criterio);
    if (!v) {
      cambio = true;
      return { ...ep, t_fin: estado.t };
    }
    if (Math.abs(v.valor - v.limite) > Math.abs(ep.peor - ep.limite) || v.limite !== ep.limite) {
      cambio = true;
      return { ...ep, peor: v.valor, limite: v.limite };
    }
    return ep;
  });

  for (const v of activas.values()) {
    cambio = true;
    siguiente.push({ criterio: v.criterio, t_inicio: estado.t, t_fin: null, peor: v.valor, limite: v.limite });
  }
  return cambio ? siguiente : historial;
}
