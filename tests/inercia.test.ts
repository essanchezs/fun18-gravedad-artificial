// Validación analítica del momento de inercia (Avance 1, sección 5.1).
// Tolerancias: 1e-9 relativo para identidades algebraicas, 0,1 % para los valores
// del documento y 0,01 % para la comparación contra integración numérica.
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA as C } from '../src/fisica/constantes';
import { inerciaAro, inerciaHub, inerciaPuntual, inerciaRadios, inerciaTotal } from '../src/fisica/inercia';

const rel = (valor: number, esperado: number) => Math.abs(valor - esperado) / Math.abs(esperado);

describe('inercia — fórmulas cerradas', () => {
  it('el aro es un anillo delgado: I = M·R²', () => {
    expect(rel(inerciaAro(C.M_aro, C.R), C.M_aro * C.R ** 2)).toBeLessThan(1e-12);
    expect(rel(inerciaAro(C.M_aro, C.R), 1.728e10)).toBeLessThan(1e-3);
  });

  it('el hub es un disco macizo: I = ½·M·r²', () => {
    expect(rel(inerciaHub(C.M_hub, C.r_hub), 0.5 * C.M_hub * C.r_hub ** 2)).toBeLessThan(1e-12);
    expect(rel(inerciaHub(C.M_hub, C.r_hub), 5.76e6)).toBeLessThan(1e-3);
  });

  it('una masa puntual cumple I = m·r²', () => {
    expect(rel(inerciaPuntual(C.m_a, C.R), C.m_a * C.R ** 2)).toBeLessThan(1e-12);
  });
});

describe('inercia — validación analítica de los radios contra integración numérica', () => {
  // La varilla se integra como I = ∫ r²·λ dr entre r_hub y R, con λ = m_radio/(R − r_hub).
  // Comparamos la fórmula cerrada del módulo contra una suma de Riemann fina: si la
  // integral está mal resuelta, los dos resultados no coinciden.
  it('reproduce la integral de r²·λ·dr entre r_hub y R', () => {
    const pasos = 2_000_000;
    const dr = (C.R - C.r_hub) / pasos;
    const lambda = C.m_radio / (C.R - C.r_hub);
    let suma = 0;
    for (let i = 0; i < pasos; i++) {
      const r = C.r_hub + (i + 0.5) * dr; // punto medio
      suma += r * r * lambda * dr;
    }
    expect(rel(inerciaRadios(1, C.m_radio, C.r_hub, C.R), suma)).toBeLessThan(1e-4);
  });

  it('n radios iguales valen n veces uno solo', () => {
    const uno = inerciaRadios(1, C.m_radio, C.r_hub, C.R);
    expect(rel(inerciaRadios(4, C.m_radio, C.r_hub, C.R), 4 * uno)).toBeLessThan(1e-12);
  });

  it('cada radio aporta ≈6,06×10⁸ kg·m² (Avance 1, sección 5.1)', () => {
    expect(rel(inerciaRadios(1, C.m_radio, C.r_hub, C.R), 6.06e8)).toBeLessThan(2e-3);
  });
});

describe('inercia — conjunto', () => {
  it('con el ascensor en el hub el total es ≈1,97×10¹⁰ kg·m²', () => {
    expect(rel(inerciaTotal(C, C.r_hub).total, 1.97e10)).toBeLessThan(2e-3);
  });

  it('el desglose suma exactamente el total', () => {
    const d = inerciaTotal(C, C.r_hub);
    const suma = d.aro + d.hub + d.radios + d.ascensor + d.tripulante;
    expect(rel(d.total, suma)).toBeLessThan(1e-12);
  });

  it('el aporte del ascensor crece con el cuadrado de su radio', () => {
    const cerca = inerciaTotal(C, 60).ascensor;
    const lejos = inerciaTotal(C, 120).ascensor;
    expect(rel(lejos / cerca, 4)).toBeLessThan(1e-12);
  });

  it('mover el ascensor al aro sube el total en m_a·(R² − r_hub²)', () => {
    const subida = inerciaTotal(C, C.R).total - inerciaTotal(C, C.r_hub).total;
    expect(rel(subida, C.m_a * (C.R ** 2 - C.r_hub ** 2))).toBeLessThan(1e-9);
  });
});
