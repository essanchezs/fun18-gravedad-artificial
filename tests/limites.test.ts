// Casos límite del motor: situaciones de borde donde un simulador mal armado falla.
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA as C, DT_REFERENCIA as DT } from '../src/fisica/constantes';
import { crearEstado, esEstadoFinal, maniobraEncendido, paso, simular } from '../src/fisica/simulador';
import type { Entradas } from '../src/fisica/tipos';

const rel = (valor: number, esperado: number) => Math.abs(valor - esperado) / Math.abs(esperado);
const quieto = (r_a: number): Entradas => ({ tau: 0, r_a_objetivo: r_a, v_a: 0, u: 0 });

describe('casos límite — estado inicial', () => {
  it('arranca detenido, sin gravedad y con el ascensor en el hub', () => {
    const e = crearEstado(C);
    expect(e.t).toBe(0);
    expect(e.omega).toBe(0);
    expect(e.L).toBe(0);
    expect(e.a_piso).toBe(0);
    expect(e.r_a).toBe(C.r_hub);
  });

  it('detenido, el dictamen es NO APTO por gravedad cero', () => {
    const e = crearEstado(C);
    expect(e.dictamen.apto).toBe(false);
    expect(e.dictamen.violaciones[0]!.criterio).toBe('gravedad');
  });

  it('el estado inicial no cuenta como estado final', () => {
    expect(esEstadoFinal(crearEstado(C))).toBe(false);
  });
});

describe('casos límite — torque', () => {
  it('con torque cero nada cambia salvo el tiempo', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    const crucero = serie[serie.length - 1]!;
    const despues = paso(crucero, DT, quieto(crucero.r_a));
    expect(despues.omega).toBe(crucero.omega);
    expect(despues.L).toBe(crucero.L);
    expect(despues.t).toBeCloseTo(crucero.t + DT, 10);
  });

  it('el frenado se detiene en ω = 0 y nunca invierte el giro', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    let e = serie[serie.length - 1]!;
    const frenar: Entradas = { tau: -C.tau, r_a_objetivo: e.r_a, v_a: 0, u: 0 };
    for (let i = 0; i < 40000; i++) {
      e = paso(e, DT, frenar);
      expect(e.omega).toBeGreaterThanOrEqual(0);
    }
    expect(e.omega).toBeCloseTo(0, 10);
    expect(e.a_piso).toBeCloseTo(0, 10);
  });

  it('detenida la rotación, el peso aparente del tripulante es cero', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    let e = serie[serie.length - 1]!;
    const frenar: Entradas = { tau: -C.tau, r_a_objetivo: e.r_a, v_a: 0, u: 0 };
    for (let i = 0; i < 40000; i++) e = paso(e, DT, frenar);
    expect(e.peso_t).toBeCloseTo(0, 6);
  });
});

describe('casos límite — ascensor', () => {
  it('no se pasa del radio objetivo', () => {
    let e = crearEstado(C);
    const subir: Entradas = { tau: 0, r_a_objetivo: 100, v_a: 50, u: 0 };
    for (let i = 0; i < 100; i++) e = paso(e, DT, subir);
    expect(e.r_a).toBeCloseTo(100, 9);
    expect(e.v_a).toBe(0);
  });

  it('nunca sale del rango [r_hub, R] aunque se le pida más', () => {
    let e = crearEstado(C);
    const afuera: Entradas = { tau: 0, r_a_objetivo: 10_000, v_a: 100, u: 0 };
    for (let i = 0; i < 500; i++) e = paso(e, DT, afuera);
    expect(e.r_a).toBeLessThanOrEqual(C.R);

    const adentro: Entradas = { tau: 0, r_a_objetivo: -500, v_a: 100, u: 0 };
    for (let i = 0; i < 500; i++) e = paso(e, DT, adentro);
    expect(e.r_a).toBeGreaterThanOrEqual(C.r_hub);
  });

  it('con el ascensor ya en el objetivo, I y ω no cambian', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    const e = serie[serie.length - 1]!;
    const siguiente = paso(e, DT, { tau: 0, r_a_objetivo: e.r_a, v_a: 2, u: 0 });
    expect(siguiente.I).toBe(e.I);
    expect(siguiente.omega).toBe(e.omega);
  });
});

describe('casos límite — paso de tiempo', () => {
  // Si el resultado dependiera del dt, el integrador estaría mal: con torque constante
  // la solución es exacta para cualquier dt.
  it('el encendido da el mismo resultado con dt = 0,05 s que con dt = 0,5 s', () => {
    const fino = simular(C, maniobraEncendido(C), 0.05);
    const grueso = simular(C, maniobraEncendido(C), 0.5);
    const a = fino.find((e) => e.t >= C.t_enc - 0.025)!;
    const b = grueso.find((e) => e.t >= C.t_enc - 0.25)!;
    expect(rel(b.omega, a.omega)).toBeLessThan(1e-6);
    expect(rel(b.theta, a.theta)).toBeLessThan(1e-6);
  });
});

describe('casos límite — caminata del tripulante', () => {
  it('caminar a favor del giro frena levemente la estación, y al revés la acelera', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    const e = serie[serie.length - 1]!;
    const aFavor = paso(e, DT, { tau: 0, r_a_objetivo: e.r_a, v_a: 0, u: C.u });
    const enContra = paso(e, DT, { tau: 0, r_a_objetivo: e.r_a, v_a: 0, u: -C.u });
    expect(aFavor.omega).toBeLessThan(e.omega);
    expect(enContra.omega).toBeGreaterThan(e.omega);
  });

  it('el momento angular total del sistema no cambia al caminar', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    const e = serie[serie.length - 1]!;
    const caminando = paso(e, DT, { tau: 0, r_a_objetivo: e.r_a, v_a: 0, u: C.u });
    expect(rel(caminando.L, e.L)).toBeLessThan(1e-12);
  });

  it('caminar a favor del giro pesa más que caminar en contra', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    const e = serie[serie.length - 1]!;
    const aFavor = paso(e, DT, { tau: 0, r_a_objetivo: e.r_a, v_a: 0, u: C.u });
    const enContra = paso(e, DT, { tau: 0, r_a_objetivo: e.r_a, v_a: 0, u: -C.u });
    expect(aFavor.peso_t).toBeGreaterThan(enContra.peso_t);
  });
});
