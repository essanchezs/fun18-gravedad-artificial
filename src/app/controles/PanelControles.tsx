// Panel de configuración: los 13 parámetros ajustables de la Tabla 5, agrupados, con casilla numérica y deslizador.
// Cambiar un parámetro crea una configuración nueva; useSimulacion la recibe y reinicia la corrida.
import { useState } from 'react';
import { gravedadOrbital, periodoOrbital } from '../../fisica/orbita';
import type { ConfigEstacion } from '../../fisica/tipos';
import { aMinutos, cientifico, fijo } from '../unidades';
import { GRUPOS, PARAMETROS, ajustarASI, conParametro, decimalesDe, type DefParametro } from './parametros';

interface PropsCampo {
  readonly def: DefParametro;
  readonly valorSI: number;
  readonly bloqueado: boolean;
  readonly onCambiar: (clave: keyof ConfigEstacion, valorSI: number) => void;
}

function Campo({ def, valorSI, bloqueado, onCambiar }: PropsCampo) {
  const id = `param-${def.clave}`;
  const mostrado = def.aMostrado(valorSI);
  // Mientras se escribe se conserva el texto tal cual; al salir del campo se ajusta al rango y al paso.
  const [borrador, setBorrador] = useState<string | null>(null);

  const confirmar = () => {
    if (borrador === null) return;
    const valor = Number(borrador.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
    if (Number.isFinite(valor)) onCambiar(def.clave, ajustarASI(def, valor));
    setBorrador(null);
  };

  return (
    <div className="param">
      <label htmlFor={id} className="param-etiqueta">
        <span className="param-simbolo">{def.simbolo}</span>
        <span>{def.nombre}</span>
      </label>
      <div className="param-fila">
        <input
          id={id}
          className="param-numero"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={bloqueado}
          value={borrador ?? fijo(mostrado, decimalesDe(def.paso))}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setBorrador(null);
          }}
        />
        <span className="param-unidad">{def.unidad}</span>
      </div>
      <input
        className="param-deslizador"
        type="range"
        aria-label={`${def.nombre}, deslizador`}
        min={def.min}
        max={def.max}
        step={def.paso}
        value={mostrado}
        disabled={bloqueado}
        onChange={(e) => onCambiar(def.clave, ajustarASI(def, Number(e.target.value)))}
      />
      {def.nota && <p className="param-nota">{def.nota}</p>}
    </div>
  );
}

interface Props {
  readonly config: ConfigEstacion;
  /** Momento de inercia instantáneo de la estación [kg·m²]: es un resultado, no un dato de entrada. */
  readonly I: number;
  readonly bloqueado: boolean;
  readonly onCambiar: (nueva: ConfigEstacion) => void;
  readonly onRestablecer: () => void;
}

export function PanelControles({ config, I, bloqueado, onCambiar, onRestablecer }: Props) {
  const cambiar = (clave: keyof ConfigEstacion, valorSI: number) => onCambiar(conParametro(config, clave, valorSI));

  return (
    <section className="panel" aria-labelledby="titulo-config">
      <div className="panel-cabecera">
        <h2 id="titulo-config">Configuración</h2>
        <button type="button" className="enlace" onClick={onRestablecer} disabled={bloqueado}>
          Valores de referencia
        </button>
      </div>
      <p className="ayuda">
        {bloqueado ? 'Pausa la simulación para editar los parámetros.' : 'Cambiar un parámetro reinicia la corrida.'}
      </p>

      {GRUPOS.map((grupo) => (
        <fieldset key={grupo.id} className="grupo-param" disabled={bloqueado}>
          <legend>{grupo.titulo}</legend>
          {PARAMETROS.filter((p) => p.grupo === grupo.id).map((def) => (
            <Campo key={def.clave} def={def} valorSI={config[def.clave]} bloqueado={bloqueado} onCambiar={cambiar} />
          ))}
          {grupo.id === 'orbita' && (
            <p className="param-nota">
              A esa altitud: g(h) = {fijo(gravedadOrbital(config.h), 2)} m/s² · período {fijo(aMinutos(periodoOrbital(config.h)), 1)} min
            </p>
          )}
        </fieldset>
      ))}

      <p className="calculado">
        I calculado = <strong>{cientifico(I, 2)} kg·m²</strong>
        <small> Es un resultado de la geometría, no un dato de entrada.</small>
      </p>
    </section>
  );
}
