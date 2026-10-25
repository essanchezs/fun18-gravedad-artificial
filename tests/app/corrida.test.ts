// Pruebas del núcleo del bucle de la consola (src/app/simulacion/corrida.ts).
//
// La prueba central demuestra que la consola, avanzando de a pedazos como lo hace cada
// cuadro de animación, produce exactamente la misma serie que simular() en el headless.
// Por eso el dictamen que muestra el panel es el mismo que se comprueba sin interfaz.
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA, DT_REFERENCIA, LIMITES } from '../../src/fisica/constantes';
import { maniobraAscensor, maniobraEncendido, simular } from '../../src/fisica/simulador';
import {
  avanzar,
  crearCorrida,
  estadoVisible,
  ordenarAscensor,
  puedeOrdenarAscensor,
  type Corrida,
} from '../../src/app/simulacion/corrida';
import { crearMotorFalso, estadoBase, estadoNoApto } from './motorFalso';

/** Corre hasta terminar con `porCuadro` pasos por llamada, como lo hace el bucle real. */
function correrHastaTerminar(corrida: Corrida, porCuadro: number): Corrida {
  let c = corrida;
  for (let guardia = 0; !c.terminada && guardia < 1e6; guardia++) c = avanzar(c, porCuadro);
  return c;
}

const CONFIG_40T = { ...CONFIG_REFERENCIA, m_a: 4.0e4 };

describe('la consola reproduce exactamente el headless', () => {
  it.each([1, 37, 600])('maniobra de 20 t avanzando de a %i pasos: misma serie que simular()', (porCuadro) => {
    const maniobra = maniobraAscensor(CONFIG_REFERENCIA);
    const esperada = simular(CONFIG_REFERENCIA, maniobra, DT_REFERENCIA);
    const corrida = correrHastaTerminar(crearCorrida(CONFIG_REFERENCIA, maniobra), porCuadro);

    expect(corrida.serie.length).toBe(esperada.length);
    expect(corrida.serie).toEqual(esperada); // igualdad exacta, campo por campo
    expect(estadoVisible(corrida).fase).toBe('final');
    expect(estadoVisible(corrida).dictamen.apto).toBe(true);
  });

  it('maniobra de 40 t: mismo dictamen NO APTO, con la misma violación y el mismo valor', () => {
    const maniobra = maniobraAscensor(CONFIG_40T);
    const esperada = simular(CONFIG_40T, maniobra, DT_REFERENCIA);
    const final = estadoVisible(correrHastaTerminar(crearCorrida(CONFIG_40T, maniobra), 50));

    expect(final).toEqual(esperada[esperada.length - 1]);
    expect(final.dictamen.apto).toBe(false);
    expect(final.dictamen.violaciones.map((v) => v.criterio)).toEqual(['gravedad']);
    expect(final.dictamen.violaciones[0]!.limite).toBe(LIMITES.a_min);
  });
});

describe('ciclo de vida de la corrida', () => {
  it('empieza en t = 0, sin terminar y con un solo estado', () => {
    const c = crearCorrida(CONFIG_REFERENCIA, maniobraEncendido(CONFIG_REFERENCIA));
    expect(c.serie).toHaveLength(1);
    expect(c.estado.t).toBe(0);
    expect(c.terminada).toBe(false);
  });

  it('avanza exactamente los pasos pedidos mientras no termine', () => {
    const c = avanzar(crearCorrida(CONFIG_REFERENCIA, maniobraEncendido(CONFIG_REFERENCIA)), 120);
    expect(c.serie).toHaveLength(121);
    expect(c.estado.t).toBeCloseTo(120 * DT_REFERENCIA, 9);
    expect(c.estado.fase).toBe('encendido');
  });

  it('pedir 0 pasos, o avanzar una corrida terminada, no cambia nada', () => {
    const c = crearCorrida(CONFIG_REFERENCIA, maniobraEncendido(CONFIG_REFERENCIA));
    expect(avanzar(c, 0)).toBe(c);
    const terminada = correrHastaTerminar(c, 1000);
    expect(avanzar(terminada, 10)).toBe(terminada);
  });

  it('solo el encendido termina sola en cuanto el giro queda constante', () => {
    const c = correrHastaTerminar(crearCorrida(CONFIG_REFERENCIA, maniobraEncendido(CONFIG_REFERENCIA)), 500);
    expect(c.terminada).toBe(true);
    expect(c.estado.t).toBeCloseTo(CONFIG_REFERENCIA.t_enc + DT_REFERENCIA, 6);
    expect(estadoVisible(c).fase).toBe('final');
    expect(c.estado.fase).toBe('crucero'); // el estado real no se modifica
  });

  it('respeta el tope de tiempo simulado', () => {
    const c = correrHastaTerminar(crearCorrida(CONFIG_REFERENCIA, maniobraEncendido(CONFIG_REFERENCIA), { tMax: 30 }), 7);
    expect(c.terminada).toBe(true);
    expect(c.estado.t).toBeGreaterThanOrEqual(30);
    expect(c.estado.t).toBeLessThan(30 + DT_REFERENCIA * 1.5);
  });
});

describe('orden en vivo del operador: mover el ascensor', () => {
  it('no se permite antes de iniciar ni durante el encendido', () => {
    const c = crearCorrida(CONFIG_REFERENCIA, maniobraEncendido(CONFIG_REFERENCIA));
    expect(puedeOrdenarAscensor(c)).toBe(false);
    const durante = avanzar(c, 100);
    expect(puedeOrdenarAscensor(durante)).toBe(false);
    expect(ordenarAscensor(durante, CONFIG_REFERENCIA.R, 2)).toBe(durante);
  });

  it('después del encendido reanuda la corrida y da lo mismo que simular() con esa maniobra', () => {
    const encendido = correrHastaTerminar(crearCorrida(CONFIG_REFERENCIA, maniobraEncendido(CONFIG_REFERENCIA)), 500);
    expect(puedeOrdenarAscensor(encendido)).toBe(true);

    const t_orden = encendido.estado.t;
    const conOrden = ordenarAscensor(encendido, CONFIG_REFERENCIA.R, 2);
    expect(conOrden.terminada).toBe(false);
    expect(estadoVisible(conOrden).fase).not.toBe('final');

    const live = correrHastaTerminar(conOrden, 73);
    const esperada = simular(
      CONFIG_REFERENCIA,
      maniobraAscensor(CONFIG_REFERENCIA, { r_a_objetivo: CONFIG_REFERENCIA.R, v_a: 2, t_inicio: t_orden }),
      DT_REFERENCIA,
    );
    expect(live.serie).toEqual(esperada);
    expect(estadoVisible(live).r_a).toBe(CONFIG_REFERENCIA.R);
    expect(estadoVisible(live).a_piso / 9.80665).toBeCloseTo(0.846, 3);
  });
});

describe('con el motor falso', () => {
  it('la corrida usa el motor inyectado y le pasa las entradas vigentes de la maniobra', () => {
    const motor = crearMotorFalso(estadoBase(), [{ fase: 'encendido' }, { fase: 'encendido' }]);
    const maniobra = maniobraEncendido(CONFIG_REFERENCIA);
    const c = avanzar(crearCorrida(CONFIG_REFERENCIA, maniobra, { motor }), 2, motor);
    expect(motor.llamadas).toHaveLength(2);
    expect(motor.llamadas[0]!.tau).toBe(CONFIG_REFERENCIA.tau);
    expect(c.estado.fase).toBe('encendido');
  });

  it('un estado NO APTO del motor llega intacto a la serie que lee el panel', () => {
    const motor = crearMotorFalso(estadoBase(), [{ fase: 'maniobra', v_a: 2 }, estadoNoApto({ alpha: -1e-6 })]);
    const c = avanzar(crearCorrida(CONFIG_REFERENCIA, maniobraEncendido(CONFIG_REFERENCIA), { motor }), 2, motor);
    expect(estadoVisible(c).dictamen.apto).toBe(false);
    expect(estadoVisible(c).dictamen.violaciones[0]!.criterio).toBe('gravedad');
  });
});
