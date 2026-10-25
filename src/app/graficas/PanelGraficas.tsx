// Las tres gráficas en tiempo real del Avance 2 (Tabla 14): 1 (ω y α), 2 (gravedad aparente) y 3 (momento angular).
// Leen sim.serie y se redibujan con sim.version; todas comparten el eje del tiempo simulado.
import { useRef } from 'react';
import { LIMITES } from '../../fisica/constantes';
import type { Estado } from '../../fisica/tipos';
import { aG, cientifico } from '../unidades';
import { GraficaTiempoReal } from './GraficaTiempoReal';
import { actualizarMuestras, crearMuestras, type Muestras } from './muestras';

interface Props {
  readonly serie: readonly Estado[];
  readonly version: number;
}

export function PanelGraficas({ serie, version }: Props) {
  const ref = useRef<Muestras>(crearMuestras());
  actualizarMuestras(ref.current, serie); // idempotente: solo lee los estados nuevos
  const m = ref.current;
  const gMin = aG(LIMITES.a_min);
  const gMax = aG(LIMITES.a_max);

  return (
    <section className="graficas" aria-labelledby="titulo-graficas">
      <h2 id="titulo-graficas" className="sr-only">
        Gráficas en tiempo real
      </h2>

      <GraficaTiempoReal
        id="grafica-1"
        titulo="1 · Velocidad y aceleración angular"
        explicacion="α es constante mientras dura el torque; ω crece de forma lineal hasta el límite de 2 rpm."
        x={m.t}
        version={version}
        series={[
          { etiqueta: 'ω [rad/s]', color: '--acento', escala: 'omega', datos: m.omega },
          { etiqueta: 'α [rad/s²]', color: '--color-ascensor', escala: 'alpha', datos: m.alpha },
        ]}
        ejesY={[
          { escala: 'omega', etiqueta: 'ω [rad/s]', color: '--acento', rango: (_min, max) => [0, Math.max(0.25, max * 1.1)] },
          {
            escala: 'alpha',
            etiqueta: 'α [rad/s²]',
            color: '--color-ascensor',
            lado: 'derecha',
            rango: (min, max) => [Math.min(0, min * 1.3), Math.max(2.5e-4, max * 1.2)],
            formato: (v) => cientifico(v, 1),
          },
        ]}
        umbrales={[{ escala: 'omega', valor: LIMITES.omega_max, etiqueta: 'máx. 2 rpm', color: '--falla-borde' }]}
      />

      <GraficaTiempoReal
        id="grafica-2"
        titulo="2 · Gravedad aparente en el aro"
        explicacion="Criterio principal de habitabilidad: la banda verde es el rango aceptable, de 0,8 a 1,1 g₀."
        x={m.t}
        version={version}
        series={[{ etiqueta: 'a [g₀]', color: '--acento', escala: 'g', datos: m.a_g }]}
        ejesY={[{ escala: 'g', etiqueta: 'a [g₀]', color: '--acento', rango: (_min, max) => [0, Math.max(1.25, max * 1.08)] }]}
        bandas={[{ escala: 'g', desde: gMin, hasta: gMax, color: '--ok-borde' }]}
        umbrales={[
          { escala: 'g', valor: gMax, etiqueta: '1,1 g₀', color: '--ok-tinta' },
          { escala: 'g', valor: gMin, etiqueta: '0,8 g₀', color: '--ok-tinta' },
        ]}
      />

      <GraficaTiempoReal
        id="grafica-3"
        titulo="3 · Momento angular total (autoverificación)"
        explicacion="L crece mientras actúa el torque y debe quedar horizontal desde que se apagan los propulsores, aunque el ascensor se mueva."
        x={m.t}
        version={version}
        series={[{ etiqueta: 'L [kg·m²/s]', color: '--color-tripulante', escala: 'L', datos: m.L }]}
        ejesY={[
          {
            escala: 'L',
            etiqueta: 'L [kg·m²/s]',
            color: '--color-tripulante',
            rango: (_min, max) => [0, Math.max(1, max * 1.1)],
            formato: (v) => cientifico(v, 1),
          },
        ]}
      />
    </section>
  );
}
