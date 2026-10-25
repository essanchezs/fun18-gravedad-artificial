// Bucle de animación de la consola: conecta la interfaz con el motor (Avance 1, Figura 3).
//
// En cada cuadro de requestAnimationFrame hace k llamadas a paso() con dt fijo de 0,05 s.
// k sale del factor de tiempo: con 100×, cada segundo real avanza 100 s simulados, así el
// encendido de 970 s se ve en unos 10 s sin alterar la física, porque dt no cambia
// (Avance 1, sección 6.1). La corrida vive en una ref y React solo se entera una vez por
// cuadro. Toda la lógica de qué entrada rige y cuándo termina está en corrida.ts.
import { useCallback, useEffect, useRef, useState } from 'react';
import { maniobraEncendido } from '../../fisica/simulador';
import type { ConfigEstacion, Estado } from '../../fisica/tipos';
import { registrarEstado, type Episodio } from '../certificacion/certificacion';
import {
  avanzar,
  crearCorrida,
  estadoVisible,
  ordenarAscensor,
  puedeOrdenarAscensor,
  type Corrida,
} from './corrida';
import { motorReal, type Motor } from './motor';

/** Factores de tiempo que ofrece la consola [s simulados por s real]. */
export const FACTORES_TIEMPO = [1, 10, 50, 100, 200] as const;
export const FACTOR_POR_DEFECTO = 100;
/** Rapidez del ascensor en las órdenes de la consola [m/s], la misma del headless. */
export const RAPIDEZ_ASCENSOR = 2;
/** Tope de pasos por cuadro, para que un cuadro lento no congele la pestaña. */
const MAX_PASOS_POR_CUADRO = 5000;
/** Si la pestaña estuvo oculta, no se intenta recuperar más de 0,1 s reales de golpe. */
const MAX_DELTA_REAL = 0.1;

export interface Simulacion {
  /** Estado que se muestra (el último de la serie). */
  readonly estado: Estado;
  /** Serie completa desde t = 0, sin submuestrear (para gráficas y exportación). */
  readonly serie: readonly Estado[];
  /** Historial de violaciones desde que se inició la corrida. */
  readonly historial: readonly Episodio[];
  readonly corriendo: boolean;
  readonly terminada: boolean;
  readonly factorTiempo: number;
  readonly puedeMoverAscensor: boolean;
  /** Cambia en cada cuadro; sirve de dependencia para redibujar gráficas. */
  readonly version: number;
  iniciar(): void;
  pausar(): void;
  /** Vuelve a t = 0 con la configuración actual. */
  reiniciar(): void;
  setFactorTiempo(factor: number): void;
  /** Orden en vivo: trasladar el ascensor al aro o al hub. */
  moverAscensor(destino: 'aro' | 'hub'): void;
}

export function useSimulacion(config: ConfigEstacion, motor: Motor = motorReal): Simulacion {
  const nueva = useCallback(() => crearCorrida(config, maniobraEncendido(config), { motor }), [config, motor]);
  const corridaRef = useRef<Corrida>(nueva());
  // El historial cuenta desde que el operador inicia: el estado en reposo de t = 0 no se registra.
  const historialRef = useRef<readonly Episodio[]>([]);
  const [corriendo, setCorriendo] = useState(false);
  const [factorTiempo, setFactorTiempo] = useState<number>(FACTOR_POR_DEFECTO);
  const [version, setVersion] = useState(0);
  const pendiente = useRef(0); // fracción de paso acumulada entre cuadros

  const reiniciar = useCallback(() => {
    setCorriendo(false);
    corridaRef.current = nueva();
    historialRef.current = [];
    pendiente.current = 0;
    setVersion((v) => v + 1);
  }, [nueva]);

  // Cambiar la configuración reinicia la corrida: un resultado mezclado no sería válido.
  useEffect(() => {
    reiniciar();
  }, [reiniciar]);

  useEffect(() => {
    if (!corriendo) return;
    let id = 0;
    let anterior: number | null = null;

    const cuadro = (ahora: number) => {
      const deltaReal = anterior === null ? 0 : Math.min((ahora - anterior) / 1000, MAX_DELTA_REAL);
      anterior = ahora;
      const c = corridaRef.current;
      pendiente.current += (factorTiempo * deltaReal) / c.dt;
      const pasos = Math.min(Math.floor(pendiente.current), MAX_PASOS_POR_CUADRO);
      pendiente.current -= pasos;

      if (pasos > 0) {
        const largoAntes = c.serie.length;
        const siguiente = avanzar(c, pasos, motor);
        let h = historialRef.current;
        for (let i = largoAntes; i < siguiente.serie.length; i++) h = registrarEstado(h, siguiente.serie[i]!);
        corridaRef.current = siguiente;
        historialRef.current = h;
        setVersion((v) => v + 1);
        if (siguiente.terminada) {
          setCorriendo(false);
          return;
        }
      }
      id = requestAnimationFrame(cuadro);
    };

    id = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(id);
  }, [corriendo, factorTiempo, motor]);

  const iniciar = useCallback(() => {
    if (!corridaRef.current.terminada) setCorriendo(true);
  }, []);
  const pausar = useCallback(() => setCorriendo(false), []);

  const moverAscensor = useCallback(
    (destino: 'aro' | 'hub') => {
      const c = corridaRef.current;
      const objetivo = destino === 'aro' ? c.config.R : c.config.r_hub;
      const siguiente = ordenarAscensor(c, objetivo, RAPIDEZ_ASCENSOR);
      if (siguiente === c) return;
      corridaRef.current = siguiente;
      setVersion((v) => v + 1);
      setCorriendo(true);
    },
    [],
  );

  const c = corridaRef.current;
  return {
    estado: estadoVisible(c),
    serie: c.serie,
    historial: historialRef.current,
    corriendo,
    terminada: c.terminada,
    factorTiempo,
    puedeMoverAscensor: puedeOrdenarAscensor(c),
    version,
    iniciar,
    pausar,
    reiniciar,
    setFactorTiempo,
    moverAscensor,
  };
}
