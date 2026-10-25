// Gráfica de series contra el tiempo simulado, dibujada con uPlot y redibujada en cada cuadro de la simulación.
// Los ejes llevan la magnitud y su unidad entre corchetes, y los umbrales se dibujan sobre el área de trazado
// (Avance 1, sección 8.1). Los colores salen de las variables CSS de la consola, así que siguen el tema claro y el oscuro.
import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface EjeY {
  readonly escala: string;
  readonly etiqueta: string; // nombre de la magnitud y su unidad entre corchetes
  readonly color: string; // nombre de una variable CSS, p. ej. '--acento'
  readonly lado?: 'izquierda' | 'derecha';
  /** Rango del eje a partir del mínimo y el máximo de los datos. */
  readonly rango: (min: number, max: number) => [number, number];
  readonly formato?: (valor: number) => string;
}

export interface SerieY {
  readonly etiqueta: string;
  readonly color: string; // variable CSS
  readonly escala: string;
  readonly datos: number[];
}

export interface Banda {
  readonly escala: string;
  readonly desde: number;
  readonly hasta: number;
  readonly color: string; // variable CSS
}

export interface Umbral {
  readonly escala: string;
  readonly valor: number;
  readonly etiqueta: string;
  readonly color: string; // variable CSS
}

interface Props {
  readonly id: string;
  readonly titulo: string;
  readonly explicacion: string;
  readonly x: number[];
  readonly series: readonly SerieY[];
  readonly ejesY: readonly EjeY[];
  readonly bandas?: readonly Banda[];
  readonly umbrales?: readonly Umbral[];
  /** Cambia con cada cuadro con datos nuevos; los arreglos se modifican en su lugar. */
  readonly version: number;
  readonly alto?: number;
}

const css = (variable: string): string => getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#888';

function dibujarBandas(u: uPlot, bandas: readonly Banda[]) {
  const { ctx, bbox } = u;
  ctx.save();
  ctx.beginPath();
  ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height);
  ctx.clip();
  ctx.globalAlpha = 0.16;
  for (const b of bandas) {
    const arriba = u.valToPos(b.hasta, b.escala, true);
    const abajo = u.valToPos(b.desde, b.escala, true);
    ctx.fillStyle = css(b.color);
    ctx.fillRect(bbox.left, arriba, bbox.width, abajo - arriba);
  }
  ctx.restore();
}

function dibujarUmbrales(u: uPlot, umbrales: readonly Umbral[]) {
  const { ctx, bbox } = u;
  const px = devicePixelRatio || 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height);
  ctx.clip();
  ctx.setLineDash([6 * px, 4 * px]);
  ctx.lineWidth = 1.2 * px;
  ctx.font = `${11 * px}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  for (const um of umbrales) {
    const y = u.valToPos(um.valor, um.escala, true);
    const color = css(um.color);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(bbox.left, y);
    ctx.lineTo(bbox.left + bbox.width, y);
    ctx.stroke();
    ctx.fillText(um.etiqueta, bbox.left + bbox.width - 6 * px, y - 4 * px);
  }
  ctx.restore();
}

export function GraficaTiempoReal({ id, titulo, explicacion, x, series, ejesY, bandas = [], umbrales = [], version, alto = 230 }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const grafica = useRef<uPlot | null>(null);
  const decoraciones = useRef({ bandas, umbrales });
  const datos = useRef({ x, series });
  decoraciones.current = { bandas, umbrales };
  datos.current = { x, series };
  // Al cambiar entre tema claro y oscuro se vuelve a crear la gráfica para que lea los colores nuevos.
  const [tema, setTema] = useState(0);

  useEffect(() => {
    const consulta = matchMedia('(prefers-color-scheme: dark)');
    const alCambiar = () => setTema((t) => t + 1);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return undefined;

    const texto = css('--tinta-suave');
    const rejilla = css('--borde');
    const escalas: uPlot.Scales = { x: { time: false, range: (_u, _min, max) => [0, Math.max(max, 10)] } };
    for (const eje of ejesY) escalas[eje.escala] = { range: (_u, min, max) => eje.rango(min, max) };

    const opciones: uPlot.Options = {
      width: Math.max(240, el.clientWidth),
      height: alto,
      scales: escalas,
      cursor: { drag: { x: false, y: false } },
      axes: [
        {
          label: 'Tiempo simulado [s]',
          stroke: texto,
          grid: { stroke: rejilla, width: 1 },
          ticks: { stroke: rejilla },
          font: '11px system-ui, sans-serif',
          labelFont: '12px system-ui, sans-serif',
          values: (_u, valores) => valores.map((v) => String(v)),
        },
        ...ejesY.map(
          (eje, i): uPlot.Axis => ({
            scale: eje.escala,
            label: eje.etiqueta,
            side: eje.lado === 'derecha' ? 1 : 3,
            stroke: css(eje.color),
            grid: { show: i === 0, stroke: rejilla, width: 1 },
            ticks: { stroke: rejilla },
            size: eje.formato ? 76 : 52,
            font: '11px system-ui, sans-serif',
            labelFont: '12px system-ui, sans-serif',
            values: eje.formato ? (_u, valores) => valores.map((v) => eje.formato!(v)) : undefined,
          }),
        ),
      ],
      series: [{ label: 't [s]' }, ...series.map((s): uPlot.Series => ({ label: s.etiqueta, stroke: css(s.color), width: 2, scale: s.escala }))],
      hooks: {
        drawClear: [(u) => dibujarBandas(u, decoraciones.current.bandas)],
        draw: [(u) => dibujarUmbrales(u, decoraciones.current.umbrales)],
      },
    };

    const plot = new uPlot(opciones, [datos.current.x, ...datos.current.series.map((s) => s.datos)], el);
    grafica.current = plot;
    const observador = new ResizeObserver(() => plot.setSize({ width: Math.max(240, el.clientWidth), height: alto }));
    observador.observe(el);

    return () => {
      observador.disconnect();
      plot.destroy();
      grafica.current = null;
    };
    // La definición de ejes y series es fija: la gráfica se crea una vez por tema.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tema]);

  useEffect(() => {
    grafica.current?.setData([x, ...series.map((s) => s.datos)]);
  }, [version, x, series, tema]);

  return (
    <figure className="grafica" id={id}>
      <figcaption>
        <strong>{titulo}</strong>
        <span>{explicacion}</span>
      </figcaption>
      <div ref={contenedor} className="grafica-lienzo" role="img" aria-label={`${titulo}. ${explicacion}`} />
    </figure>
  );
}
