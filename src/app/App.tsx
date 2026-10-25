// Consola de operación (Avance 1, Figura 1). Organiza las zonas y conecta todo con el bucle.
//
// La configuración vive aquí como estado de React, en SI. El panel de parámetros editable
// la cambia con `setConfig`, y cambiar la configuración reinicia la corrida.
import { useMemo, useState } from 'react';
import { CONFIG_REFERENCIA } from '../fisica/constantes';
import type { ConfigEstacion, Fase } from '../fisica/tipos';
import { PanelCertificacion } from './certificacion/PanelCertificacion';
import { PanelControles } from './controles/PanelControles';
import { PanelGraficas } from './graficas/PanelGraficas';
import { FACTORES_TIEMPO, useSimulacion, type Simulacion } from './simulacion/useSimulacion';
import { aRpm, aToneladas, fijo } from './unidades';
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
  const [config, setConfig] = useState<ConfigEstacion>(CONFIG_REFERENCIA);
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
          <Operaciones sim={sim} />
          <PanelControles
            config={config}
            I={estado.I}
            bloqueado={sim.corriendo}
            onCambiar={setConfig}
            onRestablecer={() => setConfig(CONFIG_REFERENCIA)}
          />
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
          <PanelGraficas serie={sim.serie} version={sim.version} />
        </div>
      </main>
    </div>
  );
}
