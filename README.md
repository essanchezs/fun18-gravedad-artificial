# Sala de control de gravedad artificial — Grupo C

Proyecto de Simulación, FUN-18 Física I (Universidad CENFOTEC, 2026-C3).

## Comandos

```bash
pnpm install       # instalar dependencias
pnpm test          # correr las pruebas de la librería
pnpm headless      # escenario fijo sin interfaz; escribe salida.csv
```

`pnpm headless otra-corrida.csv` escribe el CSV con otro nombre.

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `src/fisica/` | La librería de física: toda la física del proyecto, en SI y sin dependencias de la interfaz |
| `tests/` | Pruebas unitarias de la librería (Vitest) |
| `scripts/headless.ts` | Ejecución sin interfaz: corre el escenario de referencia y exporta el CSV |

## Librería de física (`src/fisica/`)

Toda la física vive en `src/fisica/`. Recibe y devuelve magnitudes en SI (m, kg, s, rad, N, N·m, J) y no
usa `document`, `window`, `canvas` ni nada de la interfaz. Las conversiones a rpm, g, km, t, MJ y % se
hacen solo en `src/app/`. Todas las funciones son puras: no modifican sus argumentos y, con la misma
entrada y el mismo `dt`, devuelven siempre lo mismo.

`[--]` indica una magnitud adimensional.

### Tipos (`tipos.ts`)

| Tipo | Contenido |
|---|---|
| `ConfigEstacion` | Los 13 parámetros ajustables: `R` [m], `M_aro` [kg], `M_hub` [kg], `r_hub` [m], `n` [--], `m_radio` [kg], `tau` [N·m], `t_enc` [s], `m_a` [kg], `m_t` [kg], `h_t` [m], `u` [m/s], `h` [m] |
| `Entradas` | Lo que hace el operador en un instante: `tau` [N·m] (+ encendido, − frenado, 0 crucero), `r_a_objetivo` [m], `v_a` [m/s], `u` [m/s] (+ a favor del giro) |
| `Maniobra` | Lista de `{ t_inicio [s], entradas }`; cada entrada rige hasta que empieza la siguiente |
| `Limites` | `a_min`, `a_max` [m/s²], `omega_max` [rad/s], `gradiente_max` [--] |
| `Dictamen` | `{ apto: boolean, violaciones: { criterio, valor, limite, unidad }[] }` |
| `DesgloseInercia` | `{ total, aro, hub, radios, ascensor, tripulante }` [kg·m²] |
| `Estado` | Ver la tabla de abajo |

Campos de `Estado` (solo lectura):

| Campo | Significado | Unidad |
|---|---|---|
| `config` | Configuración de la corrida | — |
| `t` | Tiempo simulado | s |
| `theta` | Ángulo girado por la estación | rad |
| `omega`, `alpha` | Velocidad y aceleración angular | rad/s, rad/s² |
| `I` | Momento de inercia instantáneo | kg·m² |
| `L` | Momento angular total | kg·m²/s |
| `E_rot` | Energía cinética rotacional | J |
| `r_a`, `v_a` | Posición y velocidad radial del ascensor (+ hacia el aro) | m, m/s |
| `u` | Rapidez de caminata del tripulante | m/s |
| `a_piso` | Gravedad aparente en el aro | m/s² |
| `gradiente` | Gradiente cabeza-pies | [--] |
| `peso_t`, `a_cor` | Peso aparente y Coriolis sobre el tripulante | N, m/s² |
| `fase` | `'encendido' \| 'crucero' \| 'maniobra' \| 'frenado' \| 'final'` | — |
| `dictamen` | Resultado de `evaluarDictamen` | — |

### `constantes.ts`

| Nombre | Valor |
|---|---|
| `G` | 6,674×10⁻¹¹ N·m²/kg² |
| `M_T` | 5,972×10²⁴ kg |
| `R_T` | 6,371×10⁶ m |
| `g0` | 9,80665 m/s² |
| `DT_REFERENCIA` | 0,05 s |
| `LIMITES` | 0,8·g0 a 1,1·g0 m/s²; 0,2094 rad/s (2,0 rpm); 0,20 |
| `CONFIG_REFERENCIA` | Configuración de validación (R = 240 m, τ = 4,0×10⁶ N·m, t_enc = 970 s, …) |

### `inercia.ts`

| Función | Recibe | Devuelve |
|---|---|---|
| `inerciaAro(M_aro, R)` | M_aro [kg], R [m] | I [kg·m²] = M_aro·R² |
| `inerciaHub(M_hub, r_hub)` | M_hub [kg], r_hub [m] | I [kg·m²] = ½·M_hub·r_hub² |
| `inerciaRadios(n, m_radio, r_hub, R)` | n [--], m_radio [kg], r_hub [m], R [m] | I [kg·m²] de los n radios (varillas de r_hub a R) |
| `inerciaPuntual(m, r)` | m [kg], r [m] | I [kg·m²] = m·r² |
| `inerciaTotal(config, r_a)` | `ConfigEstacion`, r_a [m] | `DesgloseInercia` [kg·m²] |

### `rotacion.ts`

| Función | Recibe | Devuelve |
|---|---|---|
| `aceleracionAngular(tau, I)` | τ [N·m], I [kg·m²] | α [rad/s²] = τ/I |
| `momentoAngular(I, omega)` | I [kg·m²], ω [rad/s] | L [kg·m²/s] = I·ω |
| `omegaPorConservacion(L, I)` | L [kg·m²/s], I [kg·m²] | ω [rad/s] = L/I |
| `energiaRotacional(I, omega)` | I [kg·m²], ω [rad/s] | E_rot [J] = ½·I·ω² |
| `trabajoTorque(tau, dTheta)` | τ [N·m], Δθ [rad] | W [J] = τ·Δθ |

### `habitabilidad.ts`

| Función | Recibe | Devuelve |
|---|---|---|
| `aceleracionCentripeta(omega, r)` | ω [rad/s], r [m] | a_c [m/s²] = ω²·r |
| `gradienteCabezaPies(omega, R, h_t)` | ω [rad/s], R [m], h_t [m] | Δa/a [--] (0 si ω = 0) |
| `evaluarDictamen(estado, limites)` | `Estado` sin `dictamen`, `Limites` | `Dictamen`: `apto` y la lista de violaciones (gravedad fuera de 0,8–1,1 g, \|ω\| sobre 2,0 rpm, gradiente sobre 20 %), cada una con su valor y su límite en SI |

### `orbita.ts`

Contexto orbital de la estación. No depende de la rotación del hábitat, solo de la altitud.

| Función | Recibe | Devuelve |
|---|---|---|
| `gravedadOrbital(h)` | h [m] | g [m/s²] = G·M_T/(R_T + h)² |
| `velocidadOrbital(h)` | h [m] | v [m/s] = √(G·M_T/(R_T + h)) |
| `periodoOrbital(h)` | h [m] | T [s] = 2π(R_T + h)/v |
| `energiaOrbital(m, h)` | m [kg], h [m] | E_mec [J] = −G·M_T·m/(2(R_T + h)) |

### `tripulante.ts`

| Función | Recibe | Devuelve |
|---|---|---|
| `pesoAparente(m_t, omega, R, u)` | m_t [kg], ω [rad/s], R [m], u [m/s] (+ a favor del giro) | N [N] = m_t·(ω·R + u)²/R |
| `aceleracionCoriolis(omega, v_rel)` | ω [rad/s], v_rel [m/s] | a_Cor [m/s²] = 2·ω·\|v_rel\| |

### `simulador.ts`

| Función | Recibe | Devuelve |
|---|---|---|
| `crearEstado(config, limites?)` | `ConfigEstacion`, `Limites` (por defecto `LIMITES`) | `Estado` inicial: t = 0, ω = 0, ascensor en el hub |
| `paso(estado, dt, entradas, limites?)` | `Estado`, dt [s], `Entradas` | `Estado` nuevo (el anterior no se modifica) |
| `simular(config, maniobra, dt, limites?, tMax?)` | `ConfigEstacion`, `Maniobra`, dt [s], `Limites`, tMax [s] (por defecto 10 000) | `Estado[]` hasta el estado final; el último lleva `fase: 'final'` |
| `esEstadoFinal(estado)` | `Estado` | `true` si t > 0, α = 0 y el ascensor está quieto |
| `maniobraEncendido(config)` | `ConfigEstacion` | `Maniobra`: τ durante t_enc y luego crucero |
| `maniobraAscensor(config, { r_a_objetivo?, v_a?, t_inicio? })` | `ConfigEstacion`, r_a_objetivo [m] (por defecto R), v_a [m/s] (por defecto 2), t_inicio [s] (por defecto t_enc + 60) | `Maniobra`: encendido y luego traslado del ascensor |

**Cómo integra `paso`.** La variable de estado es el momento angular: `L += τ·dt`, y la velocidad angular
se despeja con `ω = (L − m_t·R·u) / I(r_a)`. Así, sin torque externo, L se mantiene constante por
construcción aunque el ascensor cambie I. θ se integra con la regla del trapecio, que es exacta
mientras α es constante. Por eso el trabajo τ·Δθ coincide con ΔE_rot durante el encendido. El frenado
(τ < 0) se detiene en ω = 0 y nunca invierte el giro. El ascensor avanza hacia `r_a_objetivo` a rapidez
`v_a` sin pasarse, y siempre queda entre `r_hub` y `R`.

```ts
import { CONFIG_REFERENCIA, DT_REFERENCIA } from './src/fisica/constantes';
import { simular, maniobraAscensor } from './src/fisica/simulador';

const serie = simular(CONFIG_REFERENCIA, maniobraAscensor(CONFIG_REFERENCIA), DT_REFERENCIA);
const final = serie[serie.length - 1];   // final.a_piso ≈ 8,30 m/s² (0,85 g)
```

### Valores de referencia (`CONFIG_REFERENCIA`, dt = 0,05 s)

| Magnitud | Resultado del motor | Avance 1 |
|---|---|---|
| I con el ascensor en el hub | 1,972×10¹⁰ kg·m² | ≈ 1,97×10¹⁰ |
| α en el encendido | 2,029×10⁻⁴ rad/s² | ≈ 2,03×10⁻⁴ |
| ω al terminar el encendido (19 400 pasos) | 0,1968 rad/s (1,879 rpm) | ≈ 0,197 (1,88 rpm) |
| θ al terminar el encendido | 95,44 rad | ≈ 95,5 |
| L | 3,880×10⁹ kg·m²/s | ≈ 3,88×10⁹ |
| E_rot = τ·Δθ | 3,817×10⁸ J | ≈ 3,8×10⁸ |
| Gravedad con 0 t / 20 t / 40 t subidas al aro | 0,948 g / 0,846 g / 0,760 g | 0,95 / 0,85 / 0,76 g |
| Variación de L mientras se mueve el ascensor | 0 (exacta) | horizontal |

## Pruebas (`pnpm test`)

70 pruebas en 6 archivos de `tests/`. Cada una compara el motor contra una fórmula cerrada o contra los
valores calculados a mano en el Avance 1, con la tolerancia declarada en la propia prueba.

| Archivo | Qué valida |
|---|---|
| `simulador.test.ts` | **Validación analítica 1:** encendido con torque constante, ω = α·t y θ = ½·α·t² (0,1968 rad/s y 95,4 rad a los 970 s). **2:** trabajo y energía, τ·Δθ = ΔE_rot. **3:** conservación de L mientras el ascensor se traslada, I₁·ω₁ = I₂·ω₂ |
| `inercia.test.ts` | Fórmulas de aro, hub y masa puntual; inercia de los radios contra integración numérica; total ≈ 1,97×10¹⁰ kg·m² |
| `rotacion.test.ts` | α = τ/I, L = I·ω, E_rot = L²/(2I) y W = τ·Δθ |
| `habitabilidad.test.ts` | 0,95 g en la referencia, gradiente = h_t/R, y el dictamen de 0 t, 20 t (APTO) y 40 t (NO APTO) |
| `orbita.test.ts` | g, v, T y E a 400 km (8,69 m/s², 7 673 m/s, 92,4 min, −1,47×10¹³ J), v²/r = g y tercera ley de Kepler |
| `limites.test.ts` | Casos límite: estación detenida, torque cero, frenado hasta ω = 0, ascensor sin pasarse del objetivo, cambio de dt y caminata del tripulante |

## Ejecución headless (`pnpm headless`)

Corre la configuración de referencia sin interfaz: encendido de 970 s y, 60 s después, traslado de 20 t del
hub al aro, con dt = 0,05 s. Imprime un resumen (I, ω, gravedad, deriva de L y dictamen final) y escribe
`salida.csv` con una fila por segundo simulado y estas columnas:

`t_s`, `fase`, `omega_rad_s`, `omega_rpm`, `alpha_rad_s2`, `I_kg_m2`, `L_kg_m2_s`, `E_rot_J`, `r_a_m`,
`v_a_m_s`, `a_piso_m_s2`, `a_piso_g`, `gradiente_pct`, `peso_t_N`, `a_cor_m_s2`, `apto`, `violaciones`

Para auditar el modelo sin abrir la consola: la columna `L_kg_m2_s` se mantiene constante desde que se
apagan los propulsores, y `a_piso_g` pasa de 0,95 a 0,85 durante el traslado.
