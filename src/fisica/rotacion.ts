// Cinemática y dinámica rotacional, conservación de L y energía (Avance 1, secciones 5.2, 5.3 y 5.5).

/** Segunda ley de Newton rotacional: α = τ/I. τ [N·m], I [kg·m²] → α [rad/s²]. */
export function aceleracionAngular(tau: number, I: number): number {
  return tau / I;
}

/** L = I·ω. I [kg·m²], ω [rad/s] → L [kg·m²/s]. */
export function momentoAngular(I: number, omega: number): number {
  return I * omega;
}

/** Sin torque externo L se conserva: ω = L/I. L [kg·m²/s], I [kg·m²] → ω [rad/s]. */
export function omegaPorConservacion(L: number, I: number): number {
  return L / I;
}

/** E_rot = ½·I·ω². I [kg·m²], ω [rad/s] → E_rot [J]. */
export function energiaRotacional(I: number, omega: number): number {
  return 0.5 * I * omega * omega;
}

/** Trabajo de un torque constante: W = τ·Δθ. τ [N·m], Δθ [rad] → W [J]. */
export function trabajoTorque(tau: number, dTheta: number): number {
  return tau * dTheta;
}
