// Submuestreo para las gráficas: lee de sim.serie solo lo nuevo, sin perder ni repetir puntos.
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA, g0 } from '../../src/fisica/constantes';
import { maniobraEncendido } from '../../src/fisica/simulador';
import { INTERVALO_MUESTRA, actualizarMuestras, crearMuestras } from '../../src/app/graficas/muestras';
import { avanzar, crearCorrida, ordenarAscensor, type Corrida } from '../../src/app/simulacion/corrida';

const C = CONFIG_REFERENCIA;

function correrHastaTerminar(corrida: Corrida, bloque = 500): Corrida {
  let c = corrida;
  while (!c.terminada) c = avanzar(c, bloque);
  return c;
}

describe('muestras para las gráficas', () => {
  it('guarda un punto cada INTERVALO_MUESTRA s, empieza en t = 0 y termina en el estado final', () => {
    const c = correrHastaTerminar(crearCorrida(C, maniobraEncendido(C)));
    const m = crearMuestras();
    actualizarMuestras(m, c.serie);

    expect(m.t[0]).toBe(0);
    expect(m.t[m.t.length - 1]).toBeCloseTo(c.estado.t, 6);
    for (let i = 1; i < m.t.length - 1; i++) {
      expect(m.t[i]! - m.t[i - 1]!).toBeCloseTo(INTERVALO_MUESTRA, 6);
    }
    // ~970 s / 0,5 s ≈ 1 940 puntos, no los 19 400 pasos
    expect(m.t.length).toBeLessThan(c.serie.length / 5);
    expect(new Set([m.t.length, m.omega.length, m.alpha.length, m.a_g.length, m.L.length]).size).toBe(1);
  });

  it('las magnitudes salen del Estado: ω final 0,1968 rad/s, 0,95 g y α constante en el encendido', () => {
    const c = correrHastaTerminar(crearCorrida(C, maniobraEncendido(C)));
    const m = crearMuestras();
    actualizarMuestras(m, c.serie);
    const ult = m.t.length - 1;

    expect(m.omega[ult]).toBeCloseTo(c.estado.omega, 12);
    expect(m.omega[ult]).toBeCloseTo(0.1968, 4);
    expect(m.a_g[ult]).toBeCloseTo(c.estado.a_piso / g0, 12);
    expect(m.a_g[ult]).toBeCloseTo(0.95, 2);
    const medio = m.t.findIndex((x) => x >= 400);
    expect(m.alpha[medio]).toBeCloseTo(2.029e-4, 7);
  });

  it('leer de a bloques, como hacen los cuadros de animación, da lo mismo que leer todo de una vez', () => {
    const completa = correrHastaTerminar(crearCorrida(C, maniobraEncendido(C)));
    const unaVez = crearMuestras();
    actualizarMuestras(unaVez, completa.serie);

    const porBloques = crearMuestras();
    let c = crearCorrida(C, maniobraEncendido(C));
    while (!c.terminada) {
      c = avanzar(c, 137);
      actualizarMuestras(porBloques, c.serie);
      actualizarMuestras(porBloques, c.serie); // llamarla dos veces seguidas no duplica puntos
    }
    expect(porBloques.t).toEqual(unaVez.t);
    expect(porBloques.omega).toEqual(unaVez.omega);
    expect(porBloques.L).toEqual(unaVez.L);
  });

  it('si empieza otra corrida (reiniciar o cambiar un parámetro), las muestras empiezan de nuevo', () => {
    const m = crearMuestras();
    let c = crearCorrida(C, maniobraEncendido(C));
    c = avanzar(c, 4000);
    actualizarMuestras(m, c.serie);
    expect(m.t.length).toBeGreaterThan(50);

    const otra = crearCorrida({ ...C, tau: 6e6 }, maniobraEncendido({ ...C, tau: 6e6 }));
    actualizarMuestras(m, otra.serie);
    expect(m.t).toEqual([0]);
    expect(m.omega).toEqual([0]);
  });

  it('con el traslado del ascensor en vivo, L queda horizontal en las muestras', () => {
    let c = correrHastaTerminar(crearCorrida(C, maniobraEncendido(C)));
    c = ordenarAscensor(c, C.R, 2);
    c = correrHastaTerminar(c);
    const m = crearMuestras();
    actualizarMuestras(m, c.serie);

    const tiempoEncendido = m.t.findIndex((x) => x >= C.t_enc + 1);
    const L0 = m.L[tiempoEncendido]!;
    const deriva = Math.max(...m.L.slice(tiempoEncendido).map((x) => Math.abs(x - L0))) / L0;
    expect(deriva).toBeLessThan(1e-9);
    expect(m.a_g[m.a_g.length - 1]).toBeCloseTo(0.85, 2); // la gravedad baja de 0,95 a 0,85 g
  });
});
