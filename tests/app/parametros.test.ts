import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA } from '../../src/fisica/constantes';
import type { ConfigEstacion } from '../../src/fisica/tipos';
import { PARAMETROS, ajustarASI, conParametro, decimalesDe } from '../../src/app/controles/parametros';

const def = (clave: keyof ConfigEstacion) => PARAMETROS.find((p) => p.clave === clave)!;

describe('panel de parámetros (Tabla 5 del Avance 1)', () => {
  it('cubre exactamente los 13 parámetros de ConfigEstacion, sin repetir', () => {
    const claves = PARAMETROS.map((p) => p.clave).sort();
    expect(claves).toEqual(Object.keys(CONFIG_REFERENCIA).sort());
    expect(new Set(claves).size).toBe(13);
  });

  it('cada valor de referencia está dentro de su rango y cae exacto en el paso (ida y vuelta SI → mostrado → SI)', () => {
    for (const p of PARAMETROS) {
      const mostrado = p.aMostrado(CONFIG_REFERENCIA[p.clave]);
      expect(mostrado, `${p.clave} mínimo`).toBeGreaterThanOrEqual(p.min);
      expect(mostrado, `${p.clave} máximo`).toBeLessThanOrEqual(p.max);
      expect(ajustarASI(p, mostrado), p.clave).toBeCloseTo(CONFIG_REFERENCIA[p.clave], 9);
    }
  });

  it('la altitud se muestra en km, las masas grandes en toneladas y todo se guarda en SI', () => {
    expect(def('h').aMostrado(400e3)).toBe(400);
    expect(ajustarASI(def('h'), 550)).toBe(550e3);
    expect(def('M_aro').aMostrado(3.0e5)).toBe(300);
    expect(ajustarASI(def('M_aro'), 450)).toBe(4.5e5);
    expect(ajustarASI(def('m_a'), 40)).toBe(4e4);
  });

  it('lo escrito se acota al rango, se ajusta al paso y n queda entero', () => {
    expect(ajustarASI(def('R'), 10)).toBe(def('R').min);
    expect(ajustarASI(def('R'), 9999)).toBe(def('R').max);
    expect(ajustarASI(def('R'), 240.4)).toBe(240);
    expect(ajustarASI(def('n'), 4.6)).toBe(5);
    expect(Number.isInteger(ajustarASI(def('n'), 6.2))).toBe(true);
    // sin ruido de punto flotante en pasos decimales
    expect(ajustarASI(def('h_t'), 1.83)).toBe(1.83);
    expect(ajustarASI(def('u'), 0.3)).toBe(0.3);
  });

  it('r_hub nunca puede alcanzar a R aunque se lleven los dos a sus extremos', () => {
    expect(def('r_hub').max).toBeLessThan(def('R').min);
  });

  it('con cualquier parámetro en sus extremos la librería sigue dando un estado finito', async () => {
    const { crearEstado, paso } = await import('../../src/fisica/simulador');
    for (const p of PARAMETROS) {
      for (const extremo of [p.min, p.max]) {
        const config = conParametro(CONFIG_REFERENCIA, p.clave, ajustarASI(p, extremo));
        let e = crearEstado(config);
        e = paso(e, 0.05, { tau: config.tau, r_a_objetivo: config.R, v_a: 2, u: 0 });
        expect(Number.isFinite(e.omega), `${p.clave}=${extremo}`).toBe(true);
        expect(Number.isFinite(e.I), `${p.clave}=${extremo}`).toBe(true);
      }
    }
  });

  it('conParametro devuelve una configuración nueva y no modifica la anterior', () => {
    const nueva = conParametro(CONFIG_REFERENCIA, 'tau', 5e6);
    expect(nueva.tau).toBe(5e6);
    expect(CONFIG_REFERENCIA.tau).toBe(4e6);
    expect(nueva).not.toBe(CONFIG_REFERENCIA);
  });

  it('decimalesDe da los decimales que pide cada paso', () => {
    expect(decimalesDe(1)).toBe(0);
    expect(decimalesDe(10)).toBe(0);
    expect(decimalesDe(0.5)).toBe(1);
    expect(decimalesDe(0.01)).toBe(2);
  });
});
