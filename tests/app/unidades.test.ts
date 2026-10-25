// Pruebas de la conversión de unidades de la consola (src/app/unidades.ts).
import { describe, expect, it } from 'vitest';
import { LIMITES, g0 } from '../../src/fisica/constantes';
import * as u from '../../src/app/unidades';

describe('conversiones contra los valores del Avance 1', () => {
  it('0,1968 rad/s al final del encendido son 1,879 rpm', () => {
    expect(u.aRpm(0.19675)).toBeCloseTo(1.879, 3);
  });

  it('el límite de 2,0 rpm guardado en SI vuelve a ser 2,0 rpm', () => {
    expect(u.desdeRpm(2)).toBeCloseTo(0.20944, 5);
    expect(u.aRpm(LIMITES.omega_max)).toBeCloseTo(2, 12);
  });

  it('la banda de gravedad en SI se lee como 0,8 g y 1,1 g', () => {
    expect(u.aG(LIMITES.a_min)).toBeCloseTo(0.8, 12);
    expect(u.aG(LIMITES.a_max)).toBeCloseTo(1.1, 12);
    expect(u.aG(9.30)).toBeCloseTo(0.948, 3);
  });

  it('gradiente, altitud, masas, energía y tiempo', () => {
    expect(u.aPorcentaje(1.8 / 240)).toBeCloseTo(0.75, 12);
    expect(u.aKm(400e3)).toBe(400);
    expect(u.aToneladas(2.0e4)).toBe(20);
    expect(u.aMJ(3.817e8)).toBeCloseTo(381.7, 9);
    expect(u.aMinutos(5544)).toBeCloseTo(92.4, 9);
  });
});

describe('ida y vuelta: lo que escribe el operador llega en SI sin pérdida', () => {
  const casos: Array<[string, (x: number) => number, (x: number) => number, number]> = [
    ['rpm', u.aRpm, u.desdeRpm, 0.2094],
    ['g', u.aG, u.desdeG, 9.3],
    ['km', u.aKm, u.desdeKm, 400e3],
    ['t', u.aToneladas, u.desdeToneladas, 2.0e4],
    ['MJ', u.aMJ, u.desdeMJ, 3.8e8],
    ['%', u.aPorcentaje, u.desdePorcentaje, 0.0075],
  ];
  it.each(casos)('%s', (_, a, desde, si) => {
    expect(desde(a(si))).toBeCloseTo(si, 9);
  });

  it('desdeG usa la gravedad estándar g0 = 9,80665 m/s²', () => {
    expect(u.desdeG(1)).toBe(g0);
  });
});

describe('formato para mostrar', () => {
  it('usa coma decimal y los decimales pedidos', () => {
    expect(u.fijo(0.948, 2)).toBe('0,95');
    expect(u.fijo(1.879, 3)).toBe('1,879');
  });

  it('valores no finitos se muestran como raya en lugar de NaN', () => {
    expect(u.fijo(Number.NaN)).toBe('—');
    expect(u.cientifico(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('notación científica con superíndices, también para exponentes negativos', () => {
    expect(u.cientifico(1.972e10)).toBe('1,97×10¹⁰');
    expect(u.cientifico(2.029e-4)).toBe('2,03×10⁻⁴');
    expect(u.cientifico(-1.47e13)).toBe('-1,47×10¹³');
  });

  it('corrige la mantisa que al redondear llegaría a 10', () => {
    expect(u.cientifico(9.996e9)).toBe('1,00×10¹⁰');
  });

  it('une valor y unidad con un espacio no separable', () => {
    expect(u.conUnidad('0,95', 'g')).toBe('0,95 g');
  });
});
