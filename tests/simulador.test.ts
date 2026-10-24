// Pruebas de validación analítica del simulador (Avance 1, secciones 5.2, 5.3 y 5.5).
//
// Son los escenarios con solución exacta conocida que exige la consigna: se compara
// lo que produce el motor contra la fórmula cerrada, dentro de la tolerancia declarada
// en cada prueba.
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA as C, DT_REFERENCIA as DT, g0 } from '../src/fisica/constantes';
import { inerciaTotal } from '../src/fisica/inercia';
import { maniobraAscensor, maniobraEncendido, paso, crearEstado, simular } from '../src/fisica/simulador';
import type { Estado } from '../src/fisica/tipos';

const rel = (valor: number, esperado: number) => Math.abs(valor - esperado) / Math.abs(esperado);

/** Corrida del encendido solo, y el estado justo al cumplirse t_enc. */
function alTerminarEncendido(): Estado {
  const serie = simular(C, maniobraEncendido(C), DT);
  return serie.find((e) => e.t >= C.t_enc - DT / 2)!;
}

describe('simulador — validación analítica 1: encendido con torque constante', () => {
  // Durante el encendido el ascensor no se mueve, así que I es constante y
  // α = τ/I también. El movimiento debe seguir exactamente las ecuaciones de
  // cinemática rotacional con aceleración constante. Tolerancia: 0,1 %.
  const I = inerciaTotal(C, C.r_hub).total;
  const alpha = C.tau / I;

  it('ω(t) = α·t: tras 970 s da 0,1968 rad/s (1,88 rpm)', () => {
    const e = alTerminarEncendido();
    expect(rel(e.omega, alpha * C.t_enc)).toBeLessThan(1e-3);
    expect(rel(e.omega, 0.1968)).toBeLessThan(1e-3);
    expect(rel((e.omega * 60) / (2 * Math.PI), 1.88)).toBeLessThan(5e-3);
  });

  it('θ(t) = ½·α·t²: tras 970 s da 95,4 rad, poco más de 15 vueltas', () => {
    const e = alTerminarEncendido();
    expect(rel(e.theta, 0.5 * alpha * C.t_enc ** 2)).toBeLessThan(1e-3);
    expect(rel(e.theta, 95.44)).toBeLessThan(1e-3);
    expect(rel(e.theta / (2 * Math.PI), 15.19)).toBeLessThan(5e-3);
  });

  it('la aceleración angular se mantiene constante mientras hay torque', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    const durante = serie.filter((e) => e.fase === 'encendido' && e.t > 1);
    for (const e of durante) expect(rel(e.alpha, alpha)).toBeLessThan(1e-6);
  });
});

describe('simulador — validación analítica 2: trabajo y energía', () => {
  // Sin fricción, el trabajo del torque se convierte íntegramente en energía
  // cinética rotacional: W = τ·Δθ = ΔE_rot. Tolerancia declarada: 0,1 %.
  it('τ·Δθ coincide con ΔE_rot al terminar el encendido (≈3,8×10⁸ J)', () => {
    const e = alTerminarEncendido();
    const W = C.tau * e.theta;
    expect(rel(W, e.E_rot)).toBeLessThan(1e-3);
    expect(rel(e.E_rot, 3.82e8)).toBeLessThan(5e-3);
  });
});

describe('simulador — validación analítica 3: conservación del momento angular', () => {
  // Apagados los propulsores no hay torque externo, así que L = I·ω se mantiene
  // constante aunque el ascensor cambie I. Esta es la autoverificación del modelo
  // y la que sostiene la gráfica 3. Tolerancia: 1e-9 relativo.
  it('L no deriva mientras el ascensor se traslada del hub al aro', () => {
    const serie = simular(C, maniobraAscensor(C), DT);
    const despues = serie.filter((e) => e.t > C.t_enc + DT);
    const Ls = despues.map((e) => e.L);
    const deriva = (Math.max(...Ls) - Math.min(...Ls)) / Math.abs(Ls[0]!);
    expect(deriva).toBeLessThan(1e-9);
  });

  it('se cumple I₁·ω₁ = I₂·ω₂ entre el inicio y el final del traslado', () => {
    const serie = simular(C, maniobraAscensor(C), DT);
    const antes = serie.find((e) => e.t > C.t_enc + DT)!;
    const final = serie[serie.length - 1]!;
    expect(rel(final.I * final.omega, antes.I * antes.omega)).toBeLessThan(1e-9);
  });

  it('la energía rotacional SÍ baja al subir carga: E = L²/(2I) con I mayor', () => {
    const serie = simular(C, maniobraAscensor(C), DT);
    const antes = serie.find((e) => e.t > C.t_enc + DT)!;
    const final = serie[serie.length - 1]!;
    expect(final.E_rot).toBeLessThan(antes.E_rot);
    expect(rel(final.E_rot, (final.L * final.L) / (2 * final.I))).toBeLessThan(1e-9);
  });
});

describe('simulador — validación analítica 4: los tres escenarios de gravedad', () => {
  // Son los valores citados en la sección 2.4 del Avance 1, que justifican por qué
  // el problema no se puede resolver sin física. Tolerancia: 1 %.
  const gravedadTrasSubir = (m_a: number) => {
    const cfg = { ...C, m_a };
    const serie = simular(cfg, maniobraAscensor(cfg), DT);
    return serie[serie.length - 1]!.a_piso / g0;
  };

  it('sin mover carga la gravedad es 0,95 g', () => {
    const serie = simular(C, maniobraEncendido(C), DT);
    expect(rel(serie[serie.length - 1]!.a_piso / g0, 0.95)).toBeLessThan(0.01);
  });

  it('subir 20 t la baja a 0,85 g, todavía dentro de la banda segura', () => {
    expect(rel(gravedadTrasSubir(2.0e4), 0.85)).toBeLessThan(0.01);
  });

  it('subir 40 t la baja a 0,76 g y viola el límite inferior', () => {
    const g = gravedadTrasSubir(4.0e4);
    expect(rel(g, 0.76)).toBeLessThan(0.01);
    expect(g).toBeLessThan(0.8);
  });
});

describe('simulador — validación analítica 5: conservación de energía en crucero', () => {
  // Es el escenario que pone la consigna como ejemplo ("sistema sin disipación: la
  // energía mecánica total se mantiene dentro del 1 % después de 10 s simulados").
  // Acá aplica en crucero: propulsores apagados y ascensor quieto.
  it('E_rot y L se mantienen dentro del 1 % tras 10 s sin torque', () => {
    // El último estado de la corrida del encendido ya está en crucero: los
    // propulsores están apagados y el ascensor quieto.
    const serie = simular(C, maniobraEncendido(C), DT);
    const inicio = serie[serie.length - 1]!;
    let e = inicio;
    const quieto = { tau: 0, r_a_objetivo: e.r_a, v_a: 0, u: 0 };
    for (let i = 0; i < 10 / DT; i++) e = paso(e, DT, quieto);
    expect(rel(e.E_rot, inicio.E_rot)).toBeLessThan(0.01);
    expect(rel(e.L, inicio.L)).toBeLessThan(0.01);
  });
});

describe('simulador — pureza y determinismo', () => {
  it('paso() no modifica el estado que recibe', () => {
    const inicial = crearEstado(C);
    const copia = JSON.stringify(inicial);
    paso(inicial, DT, { tau: C.tau, r_a_objetivo: C.r_hub, v_a: 0, u: 0 });
    expect(JSON.stringify(inicial)).toBe(copia);
  });

  it('la misma entrada produce siempre la misma serie', () => {
    const a = simular(C, maniobraEncendido(C), DT);
    const b = simular(C, maniobraEncendido(C), DT);
    expect(a.length).toBe(b.length);
    expect(a[a.length - 1]!.omega).toBe(b[b.length - 1]!.omega);
    expect(a[a.length - 1]!.theta).toBe(b[b.length - 1]!.theta);
  });

  it('la simulación termina sola en un estado estable', () => {
    const serie = simular(C, maniobraAscensor(C), DT);
    const final = serie[serie.length - 1]!;
    expect(final.fase).toBe('final');
    expect(final.v_a).toBe(0);
  });
});
