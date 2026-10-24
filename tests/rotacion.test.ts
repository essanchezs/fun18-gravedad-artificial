// Validación de cinemática y dinámica rotacional (Avance 1, secciones 5.2, 5.3 y 5.5).
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA as C } from '../src/fisica/constantes';
import { inerciaTotal } from '../src/fisica/inercia';
import {
  aceleracionAngular,
  energiaRotacional,
  momentoAngular,
  omegaPorConservacion,
  trabajoTorque,
} from '../src/fisica/rotacion';

const rel = (valor: number, esperado: number) => Math.abs(valor - esperado) / Math.abs(esperado);
const I_REF = inerciaTotal(C, C.r_hub).total;

describe('rotacion', () => {
  it('segunda ley de Newton angular: α = τ/I ≈ 2,03×10⁻⁴ rad/s²', () => {
    expect(rel(aceleracionAngular(C.tau, I_REF), 2.03e-4)).toBeLessThan(5e-3);
  });

  it('momentoAngular y omegaPorConservacion son inversas', () => {
    const omega = 0.1968;
    const L = momentoAngular(I_REF, omega);
    expect(rel(omegaPorConservacion(L, I_REF), omega)).toBeLessThan(1e-12);
  });

  it('cumple la identidad E_rot = L²/(2I)', () => {
    const omega = 0.1968;
    const L = momentoAngular(I_REF, omega);
    expect(rel(energiaRotacional(I_REF, omega), (L * L) / (2 * I_REF))).toBeLessThan(1e-12);
  });

  it('a L constante, subir I baja la energía rotacional', () => {
    const L = momentoAngular(I_REF, 0.1968);
    const I2 = inerciaTotal(C, C.R).total;
    const e1 = energiaRotacional(I_REF, omegaPorConservacion(L, I_REF));
    const e2 = energiaRotacional(I2, omegaPorConservacion(L, I2));
    expect(e2).toBeLessThan(e1);
  });

  it('el trabajo de un torque constante es W = τ·Δθ', () => {
    expect(rel(trabajoTorque(C.tau, 95.44), C.tau * 95.44)).toBeLessThan(1e-12);
  });
});
