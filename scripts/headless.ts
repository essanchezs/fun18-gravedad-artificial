/**
 * Ejecución headless: corre un escenario fijo sin interfaz gráfica y escribe la
 * evolución temporal de las magnitudes principales en un CSV.
 *
 *   pnpm headless                    → escribe salida.csv
 *   pnpm headless mi-corrida.csv     → escribe el archivo indicado
 *
 * El escenario es la configuración de referencia del Avance 1: encendido completo
 * (τ = 4,0×10⁶ N·m durante 970 s) y, 60 s después, traslado del ascensor del hub al
 * aro. Permite auditar el modelo sin abrir la consola: la columna L debe mantenerse
 * constante desde que se apagan los propulsores, y a_piso_g debe pasar de 0,95 a 0,85.
 *
 * No importa nada de la interfaz: usa solo la librería de física.
 */
// @ts-nocheck — script de ejecución, no forma parte de la librería: corre con tsx y queda
// fuera de `tsconfig.json` a propósito, para no meterle los tipos de Node a src/fisica/.
import { writeFileSync } from "node:fs";
import { CONFIG_REFERENCIA, DT_REFERENCIA, g0 } from '../src/fisica/constantes';
import { maniobraAscensor, simular } from '../src/fisica/simulador';
import type { Estado } from '../src/fisica/tipos';

/** Una fila por segundo simulado, para que el CSV sea legible sin perder la forma. */
const SEGUNDOS_POR_FILA = 1;

const COLUMNAS = [
  't_s',
  'fase',
  'omega_rad_s',
  'omega_rpm',
  'alpha_rad_s2',
  'I_kg_m2',
  'L_kg_m2_s',
  'E_rot_J',
  'r_a_m',
  'v_a_m_s',
  'a_piso_m_s2',
  'a_piso_g',
  'gradiente_pct',
  'peso_t_N',
  'a_cor_m_s2',
  'apto',
  'violaciones',
] as const;

function fila(e: Estado): string {
  const num = (x: number, d = 6) => x.toFixed(d);
  return [
    num(e.t, 2),
    e.fase,
    num(e.omega),
    num((e.omega * 60) / (2 * Math.PI), 4),
    num(e.alpha, 9),
    e.I.toExponential(6),
    e.L.toExponential(6),
    e.E_rot.toExponential(6),
    num(e.r_a, 3),
    num(e.v_a, 3),
    num(e.a_piso, 4),
    num(e.a_piso / g0, 4),
    num(e.gradiente * 100, 4),
    num(e.peso_t, 2),
    num(e.a_cor, 6),
    e.dictamen.apto ? 'si' : 'no',
    e.dictamen.violaciones.map((v) => v.criterio).join(' ') || '-',
  ].join(',');
}

function main(): void {
  const destino = process.argv[2] ?? 'salida.csv';
  const config = CONFIG_REFERENCIA;

  console.log('Escenario: configuración de referencia del Avance 1');
  console.log(`  R = ${config.R} m, tau = ${config.tau.toExponential(1)} N·m, t_enc = ${config.t_enc} s`);
  console.log(`  ascensor: ${config.m_a / 1000} t del hub al aro, dt = ${DT_REFERENCIA} s`);

  const serie = simular(config, maniobraAscensor(config), DT_REFERENCIA);

  const cadaCuantos = Math.max(1, Math.round(SEGUNDOS_POR_FILA / DT_REFERENCIA));
  const filas = serie.filter((_, i) => i % cadaCuantos === 0);
  const ultimo = serie[serie.length - 1]!;
  if (filas[filas.length - 1] !== ultimo) filas.push(ultimo);

  writeFileSync(destino, [COLUMNAS.join(','), ...filas.map(fila)].join('\n') + '\n', 'utf8');

  const primero = serie[0]!;
  const Ls = serie.filter((e) => e.t > config.t_enc + DT_REFERENCIA).map((e) => e.L);
  const deriva = (Math.max(...Ls) - Math.min(...Ls)) / Math.abs(Ls[0]!);

  console.log('');
  console.log(`Pasos simulados: ${serie.length - 1}   tiempo final: ${ultimo.t.toFixed(2)} s`);
  console.log(`I inicial: ${primero.I.toExponential(4)} kg·m²  →  final: ${ultimo.I.toExponential(4)} kg·m²`);
  console.log(`omega final: ${ultimo.omega.toFixed(6)} rad/s (${((ultimo.omega * 60) / (2 * Math.PI)).toFixed(3)} rpm)`);
  console.log(`gravedad en el aro: ${(ultimo.a_piso / g0).toFixed(4)} g`);
  console.log(`deriva de L tras el encendido: ${deriva.toExponential(2)} (debe ser ~0)`);
  console.log(`dictamen final: ${ultimo.dictamen.apto ? 'APTO' : 'NO APTO'}`);
  console.log('');
  console.log(`CSV escrito en ${destino} (${filas.length} filas, ${COLUMNAS.length} columnas)`);
}

main();
