// Constantes físicas y umbrales fijos (Avance 1, Tabla 6), ya en SI.
import type { ConfigEstacion, Limites } from './tipos';

/** Constante de gravitación universal [N·m²/kg²]. */
export const G = 6.674e-11;
/** Masa de la Tierra [kg]. */
export const M_T = 5.972e24;
/** Radio medio de la Tierra [m]. */
export const R_T = 6.371e6;
/** Gravedad estándar de referencia [m/s²]. */
export const g0 = 9.80665;

/** Paso de tiempo de referencia [s] (Avance 1, sección 6.5). */
export const DT_REFERENCIA = 0.05;

/** Umbrales de habitabilidad (Tabla 3): 0,8 g a 1,1 g; 2,0 rpm; 20 %. */
export const LIMITES: Limites = {
  a_min: 0.8 * g0,
  a_max: 1.1 * g0,
  omega_max: (2.0 * 2 * Math.PI) / 60, // 2,0 rpm ≈ 0,2094 rad/s
  gradiente_max: 0.2,
};

/** Configuración de referencia con la que se validó el modelo (Tabla 5). */
export const CONFIG_REFERENCIA: ConfigEstacion = {
  R: 240,
  M_aro: 3.0e5,
  M_hub: 8.0e4,
  r_hub: 12,
  n: 4,
  m_radio: 3.0e4,
  tau: 4.0e6,
  t_enc: 970,
  m_a: 2.0e4,
  m_t: 80,
  h_t: 1.8,
  u: 1.4,
  h: 400e3,
};
