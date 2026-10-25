// Pruebas del panel de certificación (src/app/certificacion/certificacion.ts).
import { describe, expect, it } from 'vitest';
import { CONFIG_REFERENCIA, DT_REFERENCIA, LIMITES } from '../../src/fisica/constantes';
import { maniobraAscensor, simular } from '../../src/fisica/simulador';
import { filasCertificacion, registrarEstado, type Episodio } from '../../src/app/certificacion/certificacion';
import { estadoBase, estadoNoApto } from './motorFalso';

describe('filas del panel', () => {
  it('la configuración de referencia se lee 0,95 g, 1,88 rpm y 0,75 %, todo OK', () => {
    const serie = simular(CONFIG_REFERENCIA, maniobraAscensor(CONFIG_REFERENCIA, { t_inicio: 2e3 }), DT_REFERENCIA, LIMITES, 1000);
    const filas = filasCertificacion(serie[serie.length - 1]!);
    expect(filas.map((f) => f.valor)).toEqual(['0,95 g', '1,88 rpm', '0,75 %']);
    expect(filas.every((f) => f.ok)).toBe(true);
  });

  it('las bandas muestran los límites de la Tabla 3 en unidades de lectura', () => {
    expect(filasCertificacion(estadoBase()).map((f) => f.banda)).toEqual([
      '0,8 – 1,1 g',
      'máx. 2,0 rpm',
      'máx. 20 %',
    ]);
  });

  it('el veredicto de cada fila sale del dictamen de la librería, no se recalcula', () => {
    // a_piso dentro de la banda, pero el dictamen reporta violación: manda el dictamen.
    const forzado = estadoNoApto({ a_piso: 9.3 });
    const gravedad = filasCertificacion(forzado).find((f) => f.criterio === 'gravedad')!;
    expect(gravedad.ok).toBe(false);
    // Y al revés: valor fuera de banda sin violación en el dictamen se muestra OK.
    const sinViolacion = estadoBase({ a_piso: 5 });
    expect(filasCertificacion(sinViolacion).find((f) => f.criterio === 'gravedad')!.ok).toBe(true);
  });

  it('la rotación se muestra en valor absoluto', () => {
    expect(filasCertificacion(estadoBase({ omega: -0.19675 }))[1]!.valor).toBe('1,88 rpm');
  });
});

describe('historial de violaciones de la sesión', () => {
  it('sin violaciones el historial no cambia (misma referencia)', () => {
    const h: readonly Episodio[] = [];
    expect(registrarEstado(h, estadoBase({ t: 5 }))).toBe(h);
  });

  it('abre un episodio, guarda el peor valor y lo cierra al recuperarse', () => {
    let h = registrarEstado([], estadoNoApto({ t: 10, a_piso: 7.7, dictamen: viol(7.7) }));
    h = registrarEstado(h, estadoNoApto({ t: 11, a_piso: 7.4, dictamen: viol(7.4) }));
    h = registrarEstado(h, estadoNoApto({ t: 12, a_piso: 7.6, dictamen: viol(7.6) }));
    expect(h).toEqual([{ criterio: 'gravedad', t_inicio: 10, t_fin: null, peor: 7.4, limite: LIMITES.a_min }]);

    h = registrarEstado(h, estadoBase({ t: 13 }));
    expect(h[0]!.t_fin).toBe(13);

    // Una nueva violación abre otro episodio; el cerrado queda intacto.
    h = registrarEstado(h, estadoNoApto({ t: 20, dictamen: viol(7.5) }));
    expect(h).toHaveLength(2);
    expect(h[0]!.t_fin).toBe(13);
    expect(h[1]!.t_fin).toBeNull();
  });

  it('la maniobra de 40 t deja exactamente un episodio de gravedad baja, abierto al final', () => {
    const config = { ...CONFIG_REFERENCIA, m_a: 4.0e4 };
    const serie = simular(config, maniobraAscensor(config), DT_REFERENCIA);
    const h = serie.reduce<readonly Episodio[]>(registrarEstado, []);
    // Durante el encendido la gravedad también está bajo 0,8 g: primer episodio, cerrado.
    const gravedad = h.filter((e) => e.criterio === 'gravedad');
    expect(gravedad.length).toBe(2);
    expect(gravedad[0]!.t_fin).not.toBeNull();
    expect(gravedad[1]!.t_fin).toBeNull();
    expect(gravedad[1]!.peor).toBeCloseTo(serie[serie.length - 1]!.a_piso, 9);
  });
});

function viol(valor: number) {
  return { apto: false, violaciones: [{ criterio: 'gravedad' as const, valor, limite: LIMITES.a_min, unidad: 'm/s²' }] };
}
