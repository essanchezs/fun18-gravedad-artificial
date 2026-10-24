// Peso aparente y Coriolis sobre el tripulante (Avance 1, sección 5.7).

/**
 * Normal que el piso ejerce sobre el tripulante: N = m_t·(ω·R + u)²/R.
 * m_t [kg], ω [rad/s], R [m], u [m/s] (+ a favor del giro) → N [N].
 */
export function pesoAparente(m_t: number, omega: number, R: number, u: number): number {
  const v = omega * R + u;
  return (m_t * v * v) / R;
}

/** Magnitud de Coriolis: a_Cor = 2·ω·v_rel. ω [rad/s], v_rel [m/s] → a_Cor [m/s²]. */
export function aceleracionCoriolis(omega: number, v_rel: number): number {
  return 2 * omega * Math.abs(v_rel);
}
