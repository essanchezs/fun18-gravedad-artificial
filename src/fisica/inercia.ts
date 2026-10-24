// Momento de inercia de cada elemento y del conjunto (Avance 1, sección 5.1).
import type { ConfigEstacion, DesgloseInercia } from './tipos';

/** Anillo delgado de masa M_aro [kg] y radio R [m]: I = M_aro·R² [kg·m²]. */
export function inerciaAro(M_aro: number, R: number): number {
  return M_aro * R * R;
}

/** Disco macizo de masa M_hub [kg] y radio r_hub [m]: I = ½·M_hub·r_hub² [kg·m²]. */
export function inerciaHub(M_hub: number, r_hub: number): number {
  return 0.5 * M_hub * r_hub * r_hub;
}

/**
 * n varillas delgadas de masa m_radio [kg] que van de r_hub a R [m].
 * Por varilla: λ·(R³ − r_hub³)/3 con λ = m_radio/(R − r_hub). Devuelve el total [kg·m²].
 */
export function inerciaRadios(n: number, m_radio: number, r_hub: number, R: number): number {
  const lambda = m_radio / (R - r_hub);
  return (n * lambda * (R ** 3 - r_hub ** 3)) / 3;
}

/** Masa puntual m [kg] a distancia r [m] del eje: I = m·r² [kg·m²]. */
export function inerciaPuntual(m: number, r: number): number {
  return m * r * r;
}

/** Inercia del conjunto con el ascensor en r_a [m] y el tripulante sobre el aro. */
export function inerciaTotal(config: ConfigEstacion, r_a: number): DesgloseInercia {
  const aro = inerciaAro(config.M_aro, config.R);
  const hub = inerciaHub(config.M_hub, config.r_hub);
  const radios = inerciaRadios(config.n, config.m_radio, config.r_hub, config.R);
  const ascensor = inerciaPuntual(config.m_a, r_a);
  const tripulante = inerciaPuntual(config.m_t, config.R);
  return { total: aro + hub + radios + ascensor + tripulante, aro, hub, radios, ascensor, tripulante };
}
