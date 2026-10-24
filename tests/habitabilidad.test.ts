// Pruebas del módulo habitabilidad: gravedad aparente, gradiente y dictamen.
// El dictamen es el artefacto de salida del proyecto, así que se prueba criterio por criterio.
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA as C, DT_REFERENCIA as DT, LIMITES, g0 } from '../src/fisica/constantes';
import { aceleracionCentripeta, evaluarDictamen, gradienteCabezaPies } from '../src/fisica/habitabilidad';
import { maniobraAscensor, maniobraEncendido, simular } from '../src/fisica/simulador';
import type { Estado } from '../src/fisica/tipos';

const rel = (valor: number, esperado: number) => Math.abs(valor - esperado) / Math.abs(esperado);
const OMEGA_REF = 0.1968;

/** Estado de referencia real, tomado del motor, con los campos que se quieran forzar. */
function estadoCon(parcial: Partial<Omit<Estado, 'dictamen'>>): Omit<Estado, 'dictamen'> {
  const serie = simular(C, maniobraEncendido(C), DT);
  const { dictamen: _d, ...base } = serie[serie.length - 1]!;
  return { ...base, ...parcial };
}

describe('habitabilidad — gravedad aparente', () => {
  it('la configuración de referencia da ≈9,30 m/s², es decir 0,95 g', () => {
    const a = aceleracionCentripeta(OMEGA_REF, C.R);
    expect(rel(a, 9.3)).toBeLessThan(5e-3);
    expect(rel(a / g0, 0.95)).toBeLessThan(5e-3);
  });

  it('crece con el cuadrado de la velocidad angular', () => {
    expect(rel(aceleracionCentripeta(0.2, C.R) / aceleracionCentripeta(0.1, C.R), 4)).toBeLessThan(1e-12);
  });

  it('con la estación detenida vale exactamente cero', () => {
    expect(aceleracionCentripeta(0, C.R)).toBe(0);
  });
});

describe('habitabilidad — gradiente cabeza-pies', () => {
  it('vale exactamente h_t/R, o sea 0,75 % en la configuración de referencia', () => {
    const g = gradienteCabezaPies(OMEGA_REF, C.R, C.h_t);
    expect(Math.abs(g - C.h_t / C.R)).toBeLessThan(1e-12);
    expect(rel(g, 0.0075)).toBeLessThan(1e-9);
  });

  it('no depende de la velocidad angular: ω se cancela', () => {
    const lento = gradienteCabezaPies(0.05, C.R, C.h_t);
    const rapido = gradienteCabezaPies(0.5, C.R, C.h_t);
    expect(Math.abs(lento - rapido)).toBeLessThan(1e-12);
  });

  it('queda muy por debajo del 20 %: nunca es el criterio restrictivo', () => {
    expect(gradienteCabezaPies(OMEGA_REF, C.R, C.h_t)).toBeLessThan(LIMITES.gradiente_max);
  });

  it('en un aro pequeño sí viola el límite (R = 6 m → 30 %)', () => {
    expect(gradienteCabezaPies(OMEGA_REF, 6, C.h_t)).toBeGreaterThan(LIMITES.gradiente_max);
  });

  it('con la estación detenida devuelve 0 y no NaN', () => {
    const g = gradienteCabezaPies(0, C.R, C.h_t);
    expect(Number.isNaN(g)).toBe(false);
    expect(g).toBe(0);
  });
});

describe('habitabilidad — dictamen', () => {
  it('la configuración de referencia es APTO, sin violaciones', () => {
    const d = evaluarDictamen(estadoCon({}), LIMITES);
    expect(d.apto).toBe(true);
    expect(d.violaciones).toHaveLength(0);
  });

  it('subir 20 t sigue siendo APTO (0,85 g, dentro de la banda)', () => {
    const cfg = { ...C, m_a: 2.0e4 };
    const serie = simular(cfg, maniobraAscensor(cfg), DT);
    expect(serie[serie.length - 1]!.dictamen.apto).toBe(true);
  });

  it('subir 40 t es NO APTO por gravedad baja, con el límite correcto', () => {
    const cfg = { ...C, m_a: 4.0e4 };
    const serie = simular(cfg, maniobraAscensor(cfg), DT);
    const d = serie[serie.length - 1]!.dictamen;
    expect(d.apto).toBe(false);
    expect(d.violaciones).toHaveLength(1);
    expect(d.violaciones[0]!.criterio).toBe('gravedad');
    expect(d.violaciones[0]!.limite).toBe(LIMITES.a_min);
    expect(d.violaciones[0]!.unidad).toBe('m/s²');
    expect(rel(d.violaciones[0]!.valor / g0, 0.76)).toBeLessThan(0.01);
  });

  it('gravedad por encima de 1,1 g también es NO APTO', () => {
    const d = evaluarDictamen(estadoCon({ a_piso: 1.2 * g0 }), LIMITES);
    expect(d.apto).toBe(false);
    expect(d.violaciones[0]!.criterio).toBe('gravedad');
    expect(d.violaciones[0]!.limite).toBe(LIMITES.a_max);
  });

  it('girar a 2,5 rpm es NO APTO por mareo', () => {
    const omega = (2.5 * 2 * Math.PI) / 60;
    const d = evaluarDictamen(estadoCon({ omega, a_piso: g0 }), LIMITES);
    expect(d.apto).toBe(false);
    expect(d.violaciones.map((v) => v.criterio)).toContain('rotacion');
  });

  it('justo en el límite de 2,0 rpm todavía es APTO', () => {
    const d = evaluarDictamen(estadoCon({ omega: LIMITES.omega_max, a_piso: g0 }), LIMITES);
    expect(d.violaciones.map((v) => v.criterio)).not.toContain('rotacion');
  });

  it('el sentido de giro no cambia el dictamen', () => {
    const d = evaluarDictamen(estadoCon({ omega: -OMEGA_REF }), LIMITES);
    expect(d.apto).toBe(true);
  });

  it('detener la rotación es NO APTO: la tripulación queda en caída libre', () => {
    const d = evaluarDictamen(estadoCon({ omega: 0, a_piso: 0, gradiente: 0 }), LIMITES);
    expect(d.apto).toBe(false);
    expect(d.violaciones[0]!.criterio).toBe('gravedad');
    expect(d.violaciones[0]!.valor).toBe(0);
  });

  it('reporta las tres violaciones a la vez cuando se incumplen todas', () => {
    const d = evaluarDictamen(
      estadoCon({ omega: (2.5 * 2 * Math.PI) / 60, a_piso: 0.5 * g0, gradiente: 0.3 }),
      LIMITES,
    );
    expect(d.apto).toBe(false);
    expect(d.violaciones).toHaveLength(3);
    expect(d.violaciones.map((v) => v.criterio).sort()).toEqual(['gradiente', 'gravedad', 'rotacion']);
  });
});
