# Simulador de economía

Juega partidas completas de Cerditos (sin UI, sin azar) con una estrategia razonable y comprueba que los tiempos encajan con los objetivos de ritmo de [docs/03-economia.md](../../docs/03-economia.md) §9.

Requiere Node ≥ 22.18 (ejecuta TypeScript directamente quitando los tipos; no hay paso de compilación).

## Comandos

```bash
npm run sim                     # 3 perfiles × 60 días; código de salida 0 si todos los objetivos se cumplen
npm run sim -- --profile casual --days 30
npm run sim:log                 # registro de eventos (ascensiones, ventajas, colección…)
npm run sim:timeline            # estadísticas de cada mundo al final de cada día (para fijar requisitos)
npm run sim:tables              # tablas de constantes en Markdown (para docs/03 §8)
npm run sim:typecheck           # comprobación de tipos del simulador
```

Análisis de sensibilidad sin tocar el contenido:

```bash
npm run sim -- --profile casual --set valle.prestige.exponent=0.34 --set huerta.costGrowth=1.15
```

Variables de entorno de la estrategia: `SIM_LONG_ROUND_HOURS` (20) y `SIM_LONG_ROUND_MIN_GAIN` (0.2): asciende si la ronda dura más de esas horas y gana al menos esa fracción de plumas.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `content.ts` | Contenido y constantes. **Fuente de verdad hasta el hito 2**; después será un adaptador sobre `src/content/`. |
| `engine.ts` | Fórmulas y avance del tiempo (mismas que el juego: cadena exacta, integral de calma, armonía). Usa `number`. |
| `strategy.ts` | Jugador simulado: compras por puntuación (= autocomprador del juego), ventajas, regla de ascensión. |
| `main.ts` | Perfiles de jugador (casual, ocasional, activo), bucle de simulación, informe y objetivos. |
| `tables.ts` | Vuelca las constantes a Markdown. |

## Modelo de tiempo

- Conectado: pasos de 1-10 s (más finos al principio de cada ronda); el jugador actúa en cada paso.
- Desconectado: pasos de 60 s; solo actúan los autocompradores (como el offline troceado del juego).
- `t = 0` es el día 1 a las 08:00.

## Limitaciones conocidas

- Usa `number` (doble precisión). Lanza error si algo pasa de 1e300; en 60 días el máximo es ~1e35.
- La estrategia no es óptima a propósito. Variantes razonables de la regla de ascensión cambian los hitos ±1 día (03 §10).
- No simula el botón de "rascar" (irrelevante tras el primer minuto).
