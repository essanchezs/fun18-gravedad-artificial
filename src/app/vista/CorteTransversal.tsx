// Corte transversal de la estación en Canvas 2D (Avance 1, Figura 1, zona "Visualización").
//
// Sirve para entender qué está pasando, no para medir (Tabla 4): dibuja el aro, el hub, los
// radios, el ascensor y el tripulante en las posiciones que da el Estado. La geometría en
// píxeles sale de geometria.ts; aquí solo se pinta. Se ve nítido en pantallas HiDPI, se
// adapta al tamaño del contenedor y toma los colores del tema (claro u oscuro).
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Estado } from '../../fisica/tipos';
import { aG, aRpm, aToneladas, fijo } from '../unidades';
import { barraEscala, calcularEscena, type Punto } from './geometria';

interface Paleta {
  tinta: string;
  suave: string;
  estructura: string;
  ascensor: string;
  tripulante: string;
  flecha: string;
  giro: string;
  fondoHub: string;
  fuente: string;
}

function leerPaleta(el: HTMLElement): Paleta {
  const css = getComputedStyle(el);
  const v = (nombre: string) => css.getPropertyValue(nombre).trim();
  return {
    tinta: v('--tinta'),
    suave: v('--tinta-suave'),
    estructura: v('--estructura'),
    ascensor: v('--color-ascensor'),
    tripulante: v('--color-tripulante'),
    flecha: v('--color-flecha'),
    giro: v('--color-giro'),
    fondoHub: v('--superficie'),
    fuente: v('--fuente-mono') || 'monospace',
  };
}

function flecha(ctx: CanvasRenderingContext2D, desde: Punto, hasta: Punto, color: string, punta = 8): void {
  const ang = Math.atan2(hasta.y - desde.y, hasta.x - desde.x);
  if (Math.hypot(hasta.x - desde.x, hasta.y - desde.y) < 2) return;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(desde.x, desde.y);
  ctx.lineTo(hasta.x, hasta.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hasta.x, hasta.y);
  ctx.lineTo(hasta.x - punta * Math.cos(ang - 0.4), hasta.y - punta * Math.sin(ang - 0.4));
  ctx.lineTo(hasta.x - punta * Math.cos(ang + 0.4), hasta.y - punta * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
}

function dibujar(ctx: CanvasRenderingContext2D, estado: Estado, ancho: number, alto: number, p: Paleta): void {
  const e = calcularEscena(estado, ancho, alto);
  const { centro } = e;
  ctx.clearRect(0, 0, ancho, alto);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Superficie donde camina la tripulación (cara interna del aro), punteada como en la Figura 2.
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = p.suave;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centro.x, centro.y, e.radioAro - 7, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);

  // Radios estructurales.
  ctx.strokeStyle = p.estructura;
  ctx.lineWidth = 2.5;
  for (const r of e.radios) {
    ctx.beginPath();
    ctx.moveTo(r.desde.x, r.desde.y);
    ctx.lineTo(r.hasta.x, r.hasta.y);
    ctx.stroke();
  }

  // Aro.
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centro.x, centro.y, e.radioAro, 0, 2 * Math.PI);
  ctx.stroke();

  // Hub con el eje de rotación saliendo del plano (⊙).
  ctx.fillStyle = p.fondoHub;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centro.x, centro.y, e.radioHub, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.flecha;
  ctx.beginPath();
  ctx.arc(centro.x, centro.y, 2.5, 0, 2 * Math.PI);
  ctx.fill();

  // Sentido de giro: arco con punta, fuera del aro, arriba a la izquierda.
  if (estado.omega > 0) {
    const rArco = e.radioAro + 18;
    const a0 = (-5 * Math.PI) / 8; // ángulos de canvas (y hacia abajo)
    const a1 = (-7 * Math.PI) / 8;
    ctx.strokeStyle = p.giro;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centro.x, centro.y, rArco, a0, a1, true);
    ctx.stroke();
    const fin = { x: centro.x + rArco * Math.cos(a1), y: centro.y + rArco * Math.sin(a1) };
    const antes = { x: centro.x + rArco * Math.cos(a1 + 0.12), y: centro.y + rArco * Math.sin(a1 + 0.12) };
    flecha(ctx, antes, fin, p.giro, 9);
    ctx.font = `600 12px ${p.fuente}`;
    ctx.fillStyle = p.giro;
    ctx.textAlign = 'right';
    ctx.fillText(`ω = ${fijo(aRpm(estado.omega), 2)} rpm`, centro.x - e.radioAro * 0.62, centro.y - e.radioAro - 14);
  }

  // Gravedad aparente sobre el tripulante: flecha hacia el eje.
  flecha(ctx, e.tripulante, e.puntaAc, p.flecha);
  ctx.fillStyle = p.tripulante;
  ctx.beginPath();
  ctx.arc(e.tripulante.x, e.tripulante.y, 6, 0, 2 * Math.PI);
  ctx.fill();

  // Ascensor.
  const lado = 13;
  ctx.save();
  ctx.translate(e.ascensor.x, e.ascensor.y);
  ctx.rotate(e.anguloAscensor);
  ctx.fillStyle = p.ascensor;
  ctx.fillRect(-lado / 2, -lado / 2, lado, lado);
  ctx.restore();

  // Etiquetas. Van hacia el interior del aro para no chocar con él ni salirse del lienzo.
  ctx.font = `12px ${p.fuente}`;
  const etiqueta = (lineas: Array<[string, string]>, ancla: Punto) => {
    const anchoTexto = Math.max(...lineas.map(([t]) => ctx.measureText(t).width));
    const x = Math.min(Math.max(ancla.x, anchoTexto / 2 + 4), ancho - anchoTexto / 2 - 4);
    ctx.textAlign = 'center';
    lineas.forEach(([texto, color], i) => {
      ctx.fillStyle = color;
      ctx.fillText(texto, x, ancla.y + 4 + (i - (lineas.length - 1) / 2) * 15);
    });
  };
  // Punto a `px` píxeles de `desde`, en dirección al eje.
  const haciaEje = (desde: Punto, px: number): Punto => {
    const d = Math.hypot(centro.x - desde.x, centro.y - desde.y) || 1;
    return { x: desde.x + ((centro.x - desde.x) / d) * px, y: desde.y + ((centro.y - desde.y) / d) * px };
  };

  const lineasTripulante: Array<[string, string]> = [['tripulante', p.tripulante]];
  if (estado.a_piso > 0) lineasTripulante.push([`a_c = ${fijo(aG(estado.a_piso), 2)} g`, p.flecha]);
  const largoFlecha = Math.hypot(e.puntaAc.x - e.tripulante.x, e.puntaAc.y - e.tripulante.y);
  etiqueta(lineasTripulante, haciaEje(e.tripulante, largoFlecha + 30));

  // El ascensor se rotula del lado del aro mientras está cerca del hub, y del lado del eje en el resto.
  const distEje = Math.hypot(e.ascensor.x - centro.x, e.ascensor.y - centro.y);
  const sobreRadio = distEje < e.radioAro * 0.35 ? haciaEje(e.ascensor, -46) : haciaEje(e.ascensor, 34);
  // Corrida perpendicular al radio para que el texto no quede encima de la línea.
  const perp = { x: -(e.ascensor.y - centro.y) / (distEje || 1), y: (e.ascensor.x - centro.x) / (distEje || 1) };
  etiqueta(
    [[`ascensor · ${fijo(aToneladas(estado.config.m_a), 0)} t`, p.tinta]],
    { x: sobreRadio.x + perp.x * 16, y: sobreRadio.y + perp.y * 16 },
  );

  // Barra de escala.
  const barra = barraEscala(e.escala);
  const y = alto - 18;
  ctx.strokeStyle = p.suave;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, y);
  ctx.lineTo(16 + barra.px, y);
  ctx.moveTo(16, y - 4);
  ctx.lineTo(16, y + 4);
  ctx.moveTo(16 + barra.px, y - 4);
  ctx.lineTo(16 + barra.px, y + 4);
  ctx.stroke();
  ctx.fillStyle = p.suave;
  ctx.textAlign = 'left';
  ctx.fillText(`${barra.metros} m`, 16, y - 8);
}

export function CorteTransversal({ estado }: { readonly estado: Estado }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const tamano = useRef({ ancho: 0, alto: 0 });
  const ultimo = useRef(estado);
  ultimo.current = estado;

  const pintar = () => {
    const canvas = lienzo.current;
    const div = contenedor.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !div || !ctx || tamano.current.ancho === 0) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujar(ctx, ultimo.current, tamano.current.ancho, tamano.current.alto, leerPaleta(div));
  };

  // Ajusta el lienzo al contenedor (y a la densidad de píxeles) cada vez que cambia de tamaño.
  useEffect(() => {
    const div = contenedor.current;
    const canvas = lienzo.current;
    if (!div || !canvas) return;
    const ajustar = () => {
      const { width, height } = div.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      tamano.current = { ancho: width, alto: height };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      pintar();
    };
    const obs = new ResizeObserver(ajustar);
    obs.observe(div);
    // Repintar si el sistema cambia entre tema claro y oscuro.
    const tema = window.matchMedia('(prefers-color-scheme: dark)');
    tema.addEventListener('change', pintar);
    ajustar();
    return () => {
      obs.disconnect();
      tema.removeEventListener('change', pintar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Antes de que el navegador pinte, para que el dibujo y los números del mismo cuadro coincidan.
  useLayoutEffect(pintar, [estado]);

  return (
    <div ref={contenedor} className="corte">
      <canvas
        ref={lienzo}
        role="img"
        aria-label={`Corte transversal de la estación: ascensor a ${fijo(estado.r_a, 0)} m del eje, gravedad en el aro ${fijo(aG(estado.a_piso), 2)} g`}
      />
    </div>
  );
}
