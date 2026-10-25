// Panel de certificación médica (Avance 1, sección 3.5 y Figura 1).
//
// Es el producto de la consola: muestra el dictamen que emite la librería, los tres criterios
// con su valor, su banda y si cumplen, y el historial de violaciones de la sesión. Ocupa una
// posición fija y cambia de color completo cuando aparece una violación, para que el
// operador no tenga que interpretar las gráficas para saber si la maniobra es segura.
import type { Estado } from '../../fisica/tipos';
import { fijo } from '../unidades';
import { filasCertificacion, textoCriterio, type Criterio, type Episodio } from './certificacion';

const NOMBRE: Record<Criterio, string> = {
  gravedad: 'Gravedad',
  rotacion: 'Rotación',
  gradiente: 'Gradiente',
};

interface Props {
  readonly estado: Estado;
  readonly historial: readonly Episodio[];
}

export function PanelCertificacion({ estado, historial }: Props) {
  const apto = estado.dictamen.apto;
  const filas = filasCertificacion(estado);
  const recientes = [...historial].reverse().slice(0, 4);

  return (
    <section className={`panel certificacion ${apto ? 'es-apto' : 'no-apto'}`} aria-labelledby="titulo-cert">
      <h2 id="titulo-cert">Certificación médica</h2>
      <p className="veredicto" role="status" aria-live="polite">
        {apto ? 'APTO PARA TRIPULACIÓN' : 'NO APTO'}
      </p>

      <table className="criterios">
        <caption className="sr-only">Criterios de habitabilidad evaluados por la librería de física</caption>
        <thead>
          <tr>
            <th scope="col">Estado</th>
            <th scope="col">Criterio</th>
            <th scope="col" className="num">
              Valor
            </th>
            <th scope="col" className="num">
              Aceptable
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.criterio} className={f.ok ? 'ok' : 'falla'}>
              <td>
                <span className="insignia">{f.ok ? 'OK' : 'FALLA'}</span>
              </td>
              <td>{f.nombre}</td>
              <td className="num valor">{f.valor}</td>
              <td className="num banda">{f.banda}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="historial">
        <h3>Violaciones registradas en esta sesión</h3>
        {historial.length === 0 ? (
          <p className="vacio">Ninguna.</p>
        ) : (
          <ul>
            {recientes.map((ep) => (
              <li key={`${ep.criterio}-${ep.t_inicio}`} className={ep.t_fin === null ? 'activa' : ''}>
                <span className="crit">{NOMBRE[ep.criterio]}</span>
                <span>
                  t = {fijo(ep.t_inicio, 0)}–{ep.t_fin === null ? 'ahora' : `${fijo(ep.t_fin, 0)}`} s
                </span>
                <span>
                  peor {textoCriterio(ep.criterio, ep.peor)} · límite {textoCriterio(ep.criterio, ep.limite)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {historial.length > recientes.length && (
          <p className="vacio">y {historial.length - recientes.length} anteriores.</p>
        )}
      </div>
    </section>
  );
}
