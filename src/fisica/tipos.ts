// Tipos que intercambia la librería (Avance 1, secciones 6.3 y 6.4).
// Todo en SI. Los demás módulos y la interfaz importan de aquí; nunca se redefinen.

/** Los 13 parámetros ajustables de la Tabla 5, en SI (la altitud en metros). */
export interface ConfigEstacion {
  readonly R: number; // radio del aro [m]
  readonly M_aro: number; // masa del aro [kg]
  readonly M_hub: number; // masa del hub [kg]
  readonly r_hub: number; // radio del hub [m]
  readonly n: number; // número de radios estructurales [--]
  readonly m_radio: number; // masa de cada radio [kg]
  readonly tau: number; // torque de los propulsores [N·m]
  readonly t_enc: number; // duración del encendido [s]
  readonly m_a: number; // masa transportada por el ascensor [kg]
  readonly m_t: number; // masa del tripulante [kg]
  readonly h_t: number; // altura del tripulante [m]
  readonly u: number; // rapidez de caminata del tripulante [m/s]
  readonly h: number; // altitud de la órbita [m]
}

/** Lo que el operador está haciendo en un instante. */
export interface Entradas {
  readonly tau: number; // torque aplicado [N·m]: + encendido, − frenado, 0 crucero
  readonly r_a_objetivo: number; // radio objetivo del ascensor [m]
  readonly v_a: number; // rapidez del ascensor, siempre positiva [m/s]
  readonly u: number; // rapidez de caminata [m/s], + a favor del giro
}

/** Secuencia de Entradas, cada una vigente desde su t_inicio [s] hasta la siguiente. */
export type Maniobra = ReadonlyArray<{ readonly t_inicio: number; readonly entradas: Entradas }>;

export type Fase = 'encendido' | 'crucero' | 'maniobra' | 'frenado' | 'final';

/** Umbrales de habitabilidad en SI. */
export interface Limites {
  readonly a_min: number; // gravedad aparente mínima [m/s²]
  readonly a_max: number; // gravedad aparente máxima [m/s²]
  readonly omega_max: number; // velocidad de rotación máxima [rad/s]
  readonly gradiente_max: number; // gradiente cabeza-pies máximo [--], fracción de 0 a 1
}

export interface Violacion {
  readonly criterio: 'gravedad' | 'rotacion' | 'gradiente';
  readonly valor: number; // valor alcanzado, en SI
  readonly limite: number; // límite incumplido, en SI
  readonly unidad: string; // unidad SI de valor y limite, p. ej. 'm/s²'
}

export interface Dictamen {
  readonly apto: boolean;
  readonly violaciones: readonly Violacion[];
}

/** Momento de inercia por elemento [kg·m²]. */
export interface DesgloseInercia {
  readonly total: number;
  readonly aro: number;
  readonly hub: number;
  readonly radios: number;
  readonly ascensor: number;
  readonly tripulante: number;
}

/** Estado de solo lectura que entrega el simulador en cada paso (Tabla 10). */
export interface Estado {
  readonly config: ConfigEstacion; // configuración con la que se creó la corrida
  readonly t: number; // tiempo simulado [s]
  readonly theta: number; // ángulo girado por la estación [rad]
  readonly omega: number; // velocidad angular [rad/s]
  readonly alpha: number; // aceleración angular [rad/s²]
  readonly I: number; // momento de inercia instantáneo [kg·m²]
  readonly L: number; // momento angular total [kg·m²/s]
  readonly E_rot: number; // energía cinética rotacional [J]
  readonly r_a: number; // posición radial del ascensor [m]
  readonly v_a: number; // velocidad radial del ascensor [m/s], + hacia el aro
  readonly u: number; // rapidez de caminata del tripulante [m/s]
  readonly a_piso: number; // gravedad aparente en el aro [m/s²]
  readonly gradiente: number; // gradiente cabeza-pies [--]
  readonly peso_t: number; // peso aparente del tripulante [N]
  readonly a_cor: number; // aceleración de Coriolis sobre el tripulante [m/s²]
  readonly fase: Fase;
  readonly dictamen: Dictamen;
}
