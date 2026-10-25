// Consola de operación (Avance 1, Figura 1). Organiza las zonas y conecta todo con el bucle.
//
// La configuración vive aquí como estado de React, en SI. El panel de parámetros editable
// la cambia con `setConfig`, y cambiar la configuración reinicia la corrida.
import { useMemo, useState } from 'react';
import { CONFIG_REFERENCIA } from '../fisica/constantes';
import type { ConfigEstacion, Fase } from '../fisica/tipos';
import { PanelCertificacion } from './certificacion/PanelCertificacion';
import { FACTORES_TIEMPO, useSimulacion, type Simulacion } from './simulacion/useSimulacion';
import { aKm, aRpm, aToneladas, cientifico, fijo } from './unidades';
import { CorteTransversal } from './vista/CorteTransversal';

const NOMBRE_FASE: Record<Fase, string> = {
  encendido: 'Encendido',
  crucero: 'Crucero',
  maniobra: 'Maniobra de ascensor',
  frenado: 'Frenado',
  final: 'Estado final estable',
};

function BarraControl({ sim }: { readonly sim: Simulacion }) {
  return (
    <div className="controles" role="group" aria-label="Control de la simulación">
      <button type="button" className="primario" onClick={sim.iniciar} disabled={sim.corriendo || sim.terminada}>
        {sim.corriendo ? 'En marcha' : sim.estado.t > 0 && !sim.terminada ? 'Continuar' : 'Iniciar'}
      </button>
      <button type="button" onClick={sim.pausar} disabled={!sim.corriendo}>
        Pausa
      </button>
      <button type="button" onClick={sim.reiniciar} disabled={sim.estado.t === 0}>
        Reiniciar
      </button>
      <label className="factor">
        <span>Tiempo</span>
        <select value={sim.factorTiempo} onChange={(e) => sim.setFactorTiempo(Number(e.target.value))}>
          {FACTORES_TIEMPO.map((f) => (
            <option key={f} value={f}>
              {f}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Configuracion({ config, I }: { readonly config: ConfigEstacion; readonly I: number }) {
  const filas: Array<[string, string]> = [
    ['Radio del aro', `${fijo(config.R, 0)} m`],
    ['Masa del aro', `${cientifico(config.M_aro, 1)} kg`],
    ['Masa del hub', `${cientifico(config.M_hub, 1)} kg`],
    ['Radio del hub', `${fijo(config.r_hub, 0)} m`],
    ['N.º de radios', `${config.n}`],
    ['Masa por radio', `${cientifico(config.m_radio, 1)} kg`],
    ['Torque τ', `${cientifico(config.tau, 1)} N·m`],
    ['Duración del encendido', `${fijo(config.t_enc, 0)} s`],
    ['Altitud', `${fijo(aKm(config.h), 0)} km`],
  ];
  return (
    <section className="panel" aria-labelledby="titulo-config">
      <h2 id="titulo-config">Configuración</h2>
      <dl className="datos">
        {filas.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="calculado">
        I calculado = <strong>{cientifico(I, 2)} kg·m²</strong>
      </p>
    </section>
  );
}

function Operaciones({ sim }: { readonly sim: Simulacion }) {
  const { config } = sim.estado;
  const enAro = sim.estado.r_a >= config.R;
  const enHub = sim.estado.r_a <= config.r_hub;
  const ayuda = sim.puedeMoverAscensor
    ? 'Elegí el destino: la simulación sigue y el panel certifica todo el trayecto.'
    : sim.estado.fase === 'maniobra'
      ? 'El ascensor está en movimiento.'
      : 'Disponible cuando termine el encendido.';
  return (
    <section className="panel" aria-labelledby="titulo-op">
      <h2 id="titulo-op">Operaciones</h2>
      <h3>Ascensor</h3>
      <p className="dato-linea">
        Masa a mover <strong>{fijo(aToneladas(config.m_a), 0)} t</strong> · posición{' '}
        <strong>{fijo(sim.estado.r_a, 0)} m</strong> del eje
      </p>
      <div className="botones-op">
        <button type="button" onClick={() => sim.moverAscensor('aro')} disabled={!sim.puedeMoverAscensor || enAro}>
          Mover al aro
        </button>
        <button type="button" onClick={() => sim.moverAscensor('hub')} disabled={!sim.puedeMoverAscensor || enHub}>
          Mover al hub
        </button>
      </div>
      <p className="ayuda">{ayuda}</p>
    </section>
  );
}

export function App() {
  const [config] = useState<ConfigEstacion>(CONFIG_REFERENCIA);
  const sim = useSimulacion(config);
  const { estado } = sim;
  const resumen = useMemo(
    () => `${NOMBRE_FASE[estado.fase]} · t = ${fijo(estado.t, 1)} s · ω = ${fijo(aRpm(estado.omega), 3)} rpm`,
    [estado],
  );

  return (
    <div className="consola">
      <header className="encabezado">
        <h1>Sala de control de gravedad artificial</h1>
        <BarraControl sim={sim} />
      </header>

      <main className="zonas">
        <div className="columna izquierda">
          <Configuracion config={config} I={estado.I} />
          <Operaciones sim={sim} />
        </div>

        <section className="panel visualizacion" aria-labelledby="titulo-vis">
          <div className="cabeza-vis">
            <h2 id="titulo-vis">Visualización</h2>
            <p className="fase" aria-live="off">
              {resumen}
            </p>
          </div>
          <CorteTransversal estado={estado} />
          <p className="pie">Corte transversal en tiempo real</p>
        </section>

        <div className="columna derecha">
          <PanelCertificacion estado={estado} historial={sim.historial} />
          {/* Gráficas en tiempo real: leen sim.serie y se redibujan con sim.version. */}
        </div>
      </main>
    </div>
  );
}
