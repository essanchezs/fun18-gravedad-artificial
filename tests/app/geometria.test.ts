// Pruebas de la geometría del corte transversal (src/app/vista/geometria.ts).
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA } from '../../src/fisica/constantes';
import { barraEscala, calcularEscena, polarAPantalla } from '../../src/app/vista/geometria';
import { estadoBase } from './motorFalso';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('corte transversal', () => {
  it('el aro ocupa el 80 % del lado menor y queda centrado', () => {
    const e = calcularEscena(estadoBase(), 600, 400);
    expect(e.centro).toEqual({ x: 300, y: 200 });
    expect(e.radioAro).toBeCloseTo(160, 9);
  });

  it('dibuja tantos radios como diga la configuración y terminan sobre el aro', () => {
    for (const n of [3, 4, 6]) {
      const e = calcularEscena(estadoBase({ config: { ...CONFIG_REFERENCIA, n } }), 500, 500);
      expect(e.radios).toHaveLength(n);
      for (const r of e.radios) expect(dist(r.hasta, e.centro)).toBeCloseTo(e.radioAro, 9);
    }
  });

  it('el ascensor va del hub (r_a = r_hub) al aro (r_a = R)', () => {
    const enHub = calcularEscena(estadoBase({ r_a: CONFIG_REFERENCIA.r_hub }), 500, 500);
    const enAro = calcularEscena(estadoBase({ r_a: CONFIG_REFERENCIA.R }), 500, 500);
    expect(dist(enHub.ascensor, enHub.centro)).toBeCloseTo(enHub.radioHub, 9);
    expect(dist(enAro.ascensor, enAro.centro)).toBeCloseTo(enAro.radioAro, 9);
  });

  it('gira con θ en sentido antihorario: θ = π/2 lleva el radio 0 hacia arriba', () => {
    const e = calcularEscena(estadoBase({ theta: Math.PI / 2, r_a: CONFIG_REFERENCIA.R }), 500, 500);
    expect(e.ascensor.x).toBeCloseTo(250, 9);
    expect(e.ascensor.y).toBeLessThan(250);
  });

  it('la flecha de a_c apunta del tripulante hacia el eje y crece con la gravedad', () => {
    const e1 = calcularEscena(estadoBase({ a_piso: 4.9 }), 500, 500);
    const e2 = calcularEscena(estadoBase({ a_piso: 9.3 }), 500, 500);
    expect(dist(e1.tripulante, e1.centro)).toBeCloseTo(e1.radioAro, 9);
    expect(dist(e1.puntaAc, e1.centro)).toBeLessThan(e1.radioAro);
    expect(dist(e2.puntaAc, e2.tripulante)).toBeGreaterThan(dist(e1.puntaAc, e1.tripulante));
  });

  it('sin gravedad no hay flecha', () => {
    const e = calcularEscena(estadoBase({ a_piso: 0 }), 500, 500);
    expect(dist(e.puntaAc, e.tripulante)).toBeCloseTo(0, 9);
  });

  it('polarAPantalla invierte el eje y de la pantalla', () => {
    expect(polarAPantalla({ x: 0, y: 0 }, 1, 10, Math.PI / 2).y).toBeCloseTo(-10, 9);
  });
});

describe('barra de escala', () => {
  it('elige un largo redondo de al menos 60 px', () => {
    expect(barraEscala(160 / 240)).toEqual({ metros: 100, px: 100 * (160 / 240) });
    expect(barraEscala(2).metros).toBe(50);
  });
});
