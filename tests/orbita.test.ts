// Validación analítica del contexto orbital (Avance 1, sección 5.6).
// Tolerancias: 0,5 % contra los valores del documento y 1e-9 relativo para las
// identidades algebraicas, que deben cumplirse salvo redondeo de punto flotante.
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA as C, G, M_T, R_T, g0 } from '../src/fisica/constantes';
import { energiaOrbital, gravedadOrbital, periodoOrbital, velocidadOrbital } from '../src/fisica/orbita';

const rel = (valor: number, esperado: number) => Math.abs(valor - esperado) / Math.abs(esperado);

/** Masa estructural de la estación: M_aro + M_hub + n·m_radio = 5,0×10⁵ kg. */
const M_ESTACION = C.M_aro + C.M_hub + C.n * C.m_radio;

describe('orbita — validación analítica a 400 km', () => {
  it('la gravedad local vale 8,69 m/s², el 89 % de la de superficie', () => {
    expect(rel(gravedadOrbital(C.h), 8.69)).toBeLessThan(5e-3);
    expect(rel(gravedadOrbital(C.h) / g0, 0.886)).toBeLessThan(0.01);
  });

  it('la rapidez orbital vale 7 673 m/s', () => {
    expect(rel(velocidadOrbital(C.h), 7673)).toBeLessThan(5e-3);
  });

  it('el período vale 92,4 minutos', () => {
    expect(rel(periodoOrbital(C.h) / 60, 92.4)).toBeLessThan(5e-3);
  });

  it('la energía mecánica total vale −1,47×10¹³ J', () => {
    expect(rel(energiaOrbital(M_ESTACION, C.h), -1.47e13)).toBeLessThan(5e-3);
  });
});

describe('orbita — verificaciones cruzadas', () => {
  // No dependen de ningún número escrito a mano: validan las funciones entre sí.
  it('cumple la condición de órbita circular: v²/r = g(h)', () => {
    const r = R_T + C.h;
    const v = velocidadOrbital(C.h);
    expect(rel((v * v) / r, gravedadOrbital(C.h))).toBeLessThan(1e-9);
  });

  it('cumple la tercera ley de Kepler: T² = 4π²r³/(G·M_T)', () => {
    const r = R_T + C.h;
    const T = periodoOrbital(C.h);
    expect(rel(T * T, (4 * Math.PI ** 2 * r ** 3) / (G * M_T))).toBeLessThan(1e-9);
  });

  it('en la superficie (h = 0) reproduce la gravedad estándar', () => {
    expect(rel(gravedadOrbital(0), g0)).toBeLessThan(2e-3);
  });
});

describe('orbita — casos límite', () => {
  it('la gravedad decrece al subir la órbita', () => {
    expect(gravedadOrbital(800e3)).toBeLessThan(gravedadOrbital(400e3));
  });

  it('un cuerpo ligado tiene energía mecánica negativa', () => {
    expect(energiaOrbital(M_ESTACION, C.h)).toBeLessThan(0);
  });

  it('la energía mecánica es proporcional a la masa', () => {
    expect(rel(energiaOrbital(2000, C.h) / energiaOrbital(1000, C.h), 2)).toBeLessThan(1e-12);
  });

  it('a altitud cero las fórmulas siguen dando valores finitos', () => {
    expect(Number.isFinite(velocidadOrbital(0))).toBe(true);
    expect(Number.isFinite(periodoOrbital(0))).toBe(true);
  });
});
