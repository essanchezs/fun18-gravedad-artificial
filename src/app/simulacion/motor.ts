// Contrato entre la interfaz y la librería de física.
//
// La consola no llama a src/fisica/ desde los componentes: todo pasa por un Motor. El de
// producción es la librería real; las pruebas inyectan un motor falso con el mismo
// contrato para forzar estados (por ejemplo, un NO APTO) sin correr 1 000 s simulados.
import { crearEstado, paso } from '../../fisica/simulador';
import type { ConfigEstacion, Entradas, Estado } from '../../fisica/tipos';

export interface Motor {
  /** Estado inicial de una corrida. */
  crearEstado(config: ConfigEstacion): Estado;
  /** Avanza dt [s] con las entradas dadas y devuelve un Estado nuevo. */
  paso(estado: Estado, dt: number, entradas: Entradas): Estado;
}

/** La librería de física del grupo. Es el único motor que usa la consola desplegada. */
export const motorReal: Motor = {
  crearEstado: (config) => crearEstado(config),
  paso: (estado, dt, entradas) => paso(estado, dt, entradas),
};
