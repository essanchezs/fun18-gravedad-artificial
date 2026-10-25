# Sala de control de gravedad artificial — Grupo C

Proyecto de Simulación, FUN-18 Física I (Universidad CENFOTEC, 2026-C3).

## Comandos

```bash
pnpm install       # instalar dependencias
pnpm test          # correr las pruebas de la librería y de la interfaz
pnpm lint          # ESLint: estilo de código y la regla que aísla src/fisica de la interfaz
pnpm headless      # escenario fijo sin interfaz; escribe salida.csv
pnpm dev           # consola en modo desarrollo (http://localhost:5173/fun18-gravedad-artificial/)
pnpm build         # revisa tipos y compila el sitio estático en dist/
pnpm typecheck     # tipos de la librería (sin DOM) y de la interfaz por separado
```

`pnpm headless otra-corrida.csv` escribe el CSV con otro nombre.

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `src/fisica/` | La librería de física: toda la física del proyecto, en SI y sin dependencias de la interfaz |
| `tests/` | Pruebas unitarias de la librería (Vitest) |
| `scripts/headless.ts` | Ejecución sin interfaz: corre el escenario de referencia y exporta el CSV |
| `src/app/` | La consola web (React + Canvas 2D). Consume la librería; la librería no la conoce |
| `tests/app/` | Pruebas de la lógica de la consola: unidades, bucle, certificación y geometría del dibujo |
| `.github/workflows/` | Pruebas y despliegue automático: solo se publica si pasan lint, tipos y pruebas |
| `eslint.config.js` | Reglas de ESLint, entre ellas la que impide que `src/fisica/` importe la interfaz o use el navegador |
| `CLAUDE.md` | Reglas del proyecto para quien lo modifique (persona o asistente) |

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

70 pruebas de la librería en 6 archivos de `tests/` (más las de la consola en `tests/app/`, abajo). Cada una compara el motor contra una fórmula cerrada o contra los
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

## Consola (`src/app/`)

La interfaz consume la librería y nunca al revés: `tsconfig.json` revisa `src/fisica/` y `tests/` sin los
tipos del DOM, así que si la librería tocara `document` o `window` no compilaría. La interfaz se revisa
aparte con `tsconfig.app.json`. Las unidades de lectura (rpm, g, km, t, MJ, %) existen solo en
`src/app/unidades.ts`.

| Módulo | Responsabilidad |
|---|---|
| `unidades.ts` | Conversión SI ⇄ unidades de lectura y formato con coma decimal |
| `simulacion/motor.ts` | Contrato `Motor` (`crearEstado`, `paso`); en producción es la librería real |
| `simulacion/corrida.ts` | Avanza una corrida de a k pasos con las mismas reglas de `simular()`; órdenes en vivo del ascensor |
| `simulacion/useSimulacion.ts` | Bucle `requestAnimationFrame`: k = factor de tiempo × Δt real / dt, con dt fijo de 0,05 s |
| `vista/geometria.ts`, `vista/CorteTransversal.tsx` | Corte transversal en Canvas 2D a partir de θ, r_a y a_piso del Estado |
| `certificacion/` | Panel de certificación: muestra `estado.dictamen` (no lo recalcula) e historial de violaciones |
| `controles/parametros.ts`, `controles/PanelControles.tsx` | Los 13 parámetros de la Tabla 5 como controles editables (casilla numérica y deslizador), con rango, paso y unidad de lectura |
| `graficas/muestras.ts` | Submuestreo de `sim.serie`: un punto cada 0,5 s simulados para dibujar; los datos completos se conservan en la serie |
| `graficas/GraficaTiempoReal.tsx`, `graficas/PanelGraficas.tsx` | Gráficas 1 (ω y α), 2 (gravedad aparente con la banda 0,8–1,1 g₀) y 3 (momento angular) con uPlot |

**La consola y el headless dan lo mismo.** `tests/app/corrida.test.ts` corre la maniobra de referencia
avanzando de a 1, 37 y 600 pasos, como lo hacen los cuadros de animación, y comprueba que la serie es
idéntica, estado por estado, a la de `simular()`. Por eso el dictamen que se ve en el panel es el mismo que
se audita en `salida.csv`. `tests/app/motorFalso.ts` es un motor guionado con el mismo contrato, para
forzar estados (por ejemplo NO APTO) sin simular 1 000 s.

**Uso.** *Iniciar* corre el encendido (τ durante t_enc) y la simulación se detiene sola al alcanzar un giro
constante. Entonces se habilita *Mover al aro / Mover al hub*: la corrida se reanuda, el panel certifica
todo el trayecto del ascensor y vuelve a detenerse en el estado final estable. El factor de tiempo (1× a
200×) solo cambia cuántos pasos se ejecutan por cuadro, nunca dt.

### Parámetros ajustables

El panel *Configuración* permite cambiar los 13 parámetros de la Tabla 5 del Avance 1 (geometría, encendido,
ascensor, tripulante y órbita), con casilla numérica y deslizador. Lo que se escribe se acota al rango, se ajusta
al paso y se convierte a SI con `unidades.ts` (masas en t, altitud en km). Cambiar un parámetro crea una configuración
nueva y `useSimulacion` reinicia la corrida, porque un resultado mezclado no sería válido. Mientras la simulación corre
los campos están bloqueados; basta con pausar para editarlos. El botón *Valores de referencia* restablece la
configuración de validación. `I calculado` se muestra como resultado, no como entrada.

### Gráficas en tiempo real

Las tres gráficas leen `sim.serie` y se redibujan con `sim.version`, con el tiempo simulado como eje común:

| Gráfica | Magnitudes | Qué evidencia |
|---|---|---|
| 1 | ω [rad/s] y α [rad/s²] contra t, con el límite de 2 rpm | α constante mientras dura el torque; ω lineal hasta la velocidad de diseño |
| 2 | a [g₀] contra t, con la banda aceptable de 0,8 a 1,1 g₀ | El criterio principal de habitabilidad, legible de un vistazo |
| 3 | L [kg·m²/s] contra t | L crece con el torque y queda horizontal al apagar los propulsores, aunque el ascensor se mueva |

Los colores salen de las variables CSS de la consola, así que siguen el tema claro y el oscuro.

## Calidad y despliegue

`pnpm lint` corre ESLint con una regla específica para `src/fisica/`: no puede importar nada de `src/app/`, ni React,
ni uPlot, no puede usar `document`, `window` ni `requestAnimationFrame`, y tampoco `Math.random()` ni `Date.now()`.
La separación entre física y renderizado queda así verificada por el analizador de código (Avance 1, sección 6.1), además
de por `tsconfig.json`, que revisa la librería sin los tipos del DOM.

`typescript-eslint` todavía no funciona con TypeScript 7, así que `package.json` instala TypeScript 6 con el nombre
`typescript` (lo que usa ESLint) y TypeScript 7 como `@typescript/native` (el que ejecuta `tsc`). Los dos conviven sin
conflicto; ver la guía de migración de TypeScript 7.

`.github/workflows/desplegar.yml` ejecuta en cada push y en cada pull request: `pnpm lint`, `pnpm typecheck` y
`pnpm test`. Solo si los tres pasan y el cambio está en `main`, compila con `pnpm build` y publica `dist/` en GitHub Pages.
Si una prueba falla, el despliegue se detiene y la versión publicada sigue siendo la última correcta. Para activarlo:
*Settings → Pages → Build and deployment → Source: GitHub Actions*.
