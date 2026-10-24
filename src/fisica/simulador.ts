// Estado inicial, avance de un paso, corrida completa y estado final (Avance 1, secciones 6.4 y 6.5).
//
// La variable de estado es el momento angular L, no ω. Cada paso hace L += τ·dt y despeja
// ω = (L − m_t·R·u) / I(r_a). Sin torque L no cambia, así que se conserva por construcción
// aunque el ascensor se mueva; θ se integra con la regla del trapecio.
import { LIMITES } from './constantes';
import { aceleracionCentripeta, evaluarDictamen, gradienteCabezaPies } from './habitabilidad';
import { inerciaTotal } from './inercia';
import { energiaRotacional } from './rotacion';
import type { ConfigEstacion, Entradas, Estado, Fase, Limites, Maniobra } from './tipos';
import { aceleracionCoriolis, pesoAparente } from './tripulante';

/** Tiempo simulado máximo de una corrida [s], para que simular() siempre termine. */
const T_MAX_POR_DEFECTO = 1e4;

interface Cinematica {
  readonly t: number;
  readonly theta: number;
  readonly L: number;
  readonly r_a: number;
  readonly v_a: number;
  readonly u: number;
  readonly alpha: number;
  readonly fase: Fase;
}

/** Momento angular propio del tripulante al caminar con rapidez u sobre el aro [kg·m²/s]. */
function momentoCaminata(config: ConfigEstacion, u: number): number {
  return config.m_t * config.R * u;
}

function omegaDe(config: ConfigEstacion, L: number, r_a: number, u: number): number {
  return (L - momentoCaminata(config, u)) / inerciaTotal(config, r_a).total;
}

/** Calcula todas las magnitudes derivadas y el dictamen a partir de la cinemática. */
function construirEstado(config: ConfigEstacion, c: Cinematica, limites: Limites): Estado {
  const I = inerciaTotal(config, c.r_a).total;
  const omega = omegaDe(config, c.L, c.r_a, c.u);
  const sinDictamen = {
    config,
    t: c.t,
    theta: c.theta,
    omega,
    alpha: c.alpha,
    I,
    L: c.L,
    E_rot: energiaRotacional(I, omega),
    r_a: c.r_a,
    v_a: c.v_a,
    u: c.u,
    a_piso: aceleracionCentripeta(omega, config.R),
    gradiente: gradienteCabezaPies(omega, config.R, config.h_t),
    peso_t: pesoAparente(config.m_t, omega, config.R, c.u),
    a_cor: aceleracionCoriolis(omega, c.u),
    fase: c.fase,
  };
  return { ...sinDictamen, dictamen: evaluarDictamen(sinDictamen, limites) };
}

/** Estado inicial: t = 0, estación quieta (ω = 0), ascensor en el hub, tripulante sin caminar. */
export function crearEstado(config: ConfigEstacion, limites: Limites = LIMITES): Estado {
  return construirEstado(
    config,
    { t: 0, theta: 0, L: 0, r_a: config.r_hub, v_a: 0, u: 0, alpha: 0, fase: 'crucero' },
    limites,
  );
}

/** Avanza dt [s] con las entradas dadas. Devuelve un Estado nuevo; el anterior no se modifica. */
export function paso(estado: Estado, dt: number, entradas: Entradas, limites: Limites = LIMITES): Estado {
  const config = estado.config;
  const u = entradas.u;

  // Torque: L cambia solo por τ externo. El frenado se detiene en ω = 0, nunca invierte el giro.
  let L = estado.L + entradas.tau * dt;
  if (entradas.tau < 0) L = Math.max(L, momentoCaminata(config, u));

  // Ascensor: avanza hacia el objetivo a rapidez v_a sin pasarse ni salir de [r_hub, R].
  const objetivo = Math.min(Math.max(entradas.r_a_objetivo, config.r_hub), config.R);
  const distancia = objetivo - estado.r_a;
  const avance = Math.sign(distancia) * Math.min(Math.abs(distancia), Math.abs(entradas.v_a) * dt);
  const r_a = avance === 0 ? estado.r_a : estado.r_a + avance;
  const v_a = avance / dt;

  const omega = omegaDe(config, L, r_a, u);
  const theta = estado.theta + 0.5 * (estado.omega + omega) * dt;
  const alpha = (omega - estado.omega) / dt;

  let fase: Fase = 'crucero';
  if (entradas.tau > 0) fase = 'encendido';
  else if (entradas.tau < 0) fase = 'frenado';
  else if (v_a !== 0) fase = 'maniobra';

  return construirEstado(config, { t: estado.t + dt, theta, L, r_a, v_a, u, alpha, fase }, limites);
}

/** Estado final estable: ya empezó la simulación, sin aceleración angular y con el ascensor quieto. */
export function esEstadoFinal(estado: Estado): boolean {
  return estado.t > 0 && estado.alpha === 0 && estado.v_a === 0;
}

/**
 * Corre la maniobra completa desde crearEstado(config) con paso dt [s].
 * Cada entrada rige desde su t_inicio hasta la siguiente. Termina en el primer estado final
 * después de que empezó la última entrada, o al llegar a tMax [s]. El último estado lleva fase 'final'.
 */
export function simular(
  config: ConfigEstacion,
  maniobra: Maniobra,
  dt: number,
  limites: Limites = LIMITES,
  tMax: number = T_MAX_POR_DEFECTO,
): Estado[] {
  const pasos = [...maniobra].sort((a, b) => a.t_inicio - b.t_inicio);
  const ultimoInicio = pasos.length > 0 ? pasos[pasos.length - 1]!.t_inicio : 0;
  let estado = crearEstado(config, limites);
  const serie: Estado[] = [estado];

  while (estado.t < tMax) {
    // Tolerancia de medio paso: con dt = 0,05 s el encendido de 970 s dura exactamente 19 400 pasos.
    const ahora = estado.t + dt / 2;
    const vigente = pasos.filter((p) => p.t_inicio <= ahora).pop();
    const entradas: Entradas = vigente?.entradas ?? { tau: 0, r_a_objetivo: estado.r_a, v_a: 0, u: 0 };

    estado = paso(estado, dt, entradas, limites);
    serie.push(estado);
    if (ultimoInicio <= ahora && esEstadoFinal(estado)) break;
  }

  serie[serie.length - 1] = { ...estado, fase: 'final' };
  return serie;
}

/** Solo el encendido de la configuración: τ durante t_enc y luego crucero. */
export function maniobraEncendido(config: ConfigEstacion): Maniobra {
  const reposo = { r_a_objetivo: config.r_hub, v_a: 0, u: 0 };
  return [
    { t_inicio: 0, entradas: { tau: config.tau, ...reposo } },
    { t_inicio: config.t_enc, entradas: { tau: 0, ...reposo } },
  ];
}

/**
 * Encendido y luego traslado del ascensor (por defecto del hub al aro a 2 m/s, 60 s después del encendido).
 * r_a_objetivo [m], v_a [m/s], t_inicio [s].
 */
export function maniobraAscensor(
  config: ConfigEstacion,
  { r_a_objetivo = config.R, v_a = 2, t_inicio = config.t_enc + 60 }: Partial<Pick<Entradas, 'r_a_objetivo' | 'v_a'>> & {
    t_inicio?: number;
  } = {},
): Maniobra {
  return [...maniobraEncendido(config), { t_inicio, entradas: { tau: 0, r_a_objetivo, v_a, u: 0 } }];
}
