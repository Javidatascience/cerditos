# 03 · Economía

> El modelo matemático del juego, el porqué de cada fórmula y los resultados del simulador (`tools/sim/`).
> **Las constantes de §8 son las validadas.** Si cambias cualquier número de contenido, ejecuta `npm run sim` y actualiza §9-§10.
> Diseño: [01-diseno-juego.md](01-diseno-juego.md) · Arquitectura: [02-arquitectura.md](02-arquitectura.md).

---

## 1. Notación

| Símbolo | Significado |
|---|---|
| `c₀ᵢ`, `pᵢ` | coste base y producción base del cerdito *i* |
| `r` | crecimiento de coste por unidad comprada (1,14-1,55 según mundo y nivel) |
| `nᵢ` | unidades **compradas** del cerdito *i* en la ronda (base del coste) |
| `aᵢ` | unidades **poseídas** (= `nᵢ` salvo en la cadena del Bosque, donde incluye las producidas) |
| `E_vida` | moneda ganada en toda la vida del mundo (todas las rondas) |
| `P` | plumas totales ganadas en el mundo (histórico; gastar no lo reduce) |
| `M` | multiplicador global del mundo |

## 2. Coste de los cerditos

```
coste(n) = c₀ · r_ef^n · m_coste
r_ef     = r − 0,0025 · nivel(Establo ampliado)
m_coste  = 0,93^nivel(Regateo) · Π bonos de coste de la colección
```

- **Compra en bloque de k unidades** teniendo n: `c₀·m_coste·r_ef^n · (r_ef^k − 1)/(r_ef − 1)`.
- **Máximo asequible** con dinero D: `k = floor( log_r( D·(r−1)/(c₀·m_coste·r^n) + 1 ) )`.
- **Por qué exponencial**: es lo que hace que ninguna compra sea "la definitiva" y que siempre convenga diversificar. `r = 1,15` es el estándar del género (Cookie Clicker): cada ~5 compras el precio se duplica. Mundos más difíciles usan `r` mayor (Balneario 1,18) o reglas que multiplican el coste efectivo (Huerta: 8 compras por "fila").
- **Mejoras por cerdito**: al tener `N ∈ {10, 25, 50, 100, 150, 200, 300, 400}` (Valle) aparece una mejora ×2 cuyo coste es `5 × coste(N)` del propio cerdito (sin descuentos de Regateo, con los de Herramientas heredadas: ×0,75^nivel). **Por qué ligado al precio de la unidad N**: así la mejora siempre cuesta "unas pocas compras" en el momento en que aparece, sea cual sea el cerdito, sin tener que escribir 60 precios a mano.
- **Mejoras globales** (×1,5 a todo el mundo): 6-8 por mundo con costes en progresión geométrica; se muestran cuando lo ganado en la ronda llega al 25 % de su coste (para que no aparezcan objetivos absurdamente lejanos).

## 3. Producción

Multiplicador global del mundo (todas las piezas multiplican):

```
M = Π mejoras globales compradas
  × (1 + (0,05 + 0,01·nivel(Raíces)) · P)            ← bono pasivo de plumas
  × 1,10^nivel(Abono)
  × Π_{otros mundos} (1 + 0,10 · nivel(Hermandad en ese mundo))
  × Π bonos de producción de la colección (variedades y sets)
  × M_mecánica                                         ← armonía (Huerta); la calma va aparte
```

### 3.1 Clásica (Valle) y Balneario

```
producción/s = M · Σᵢ aᵢ · pᵢ · 2^(mejoras compradas del cerdito i)
```

### 3.2 Cadena (Bosque) — solución exacta

El nivel 0 (Buscadoras) produce trufas; el nivel k produce unidades del nivel k−1. Con ritmos `ρ₀ = p₀·2^u₀·M` y `ρₖ = pₖ·2^uₖ` (el multiplicador global **solo** afecta al nivel 0; si afectara a todos, M entraría elevado a 5 y la economía explotaría):

```
aⱼ(t+Δ) = Σ_{k≥j} aₖ(t) · (ρⱼ₊₁·…·ρₖ) · Δ^(k−j) / (k−j)!
trufas(Δ) = ρ₀ · Σ_{k≥0} aₖ(t) · (ρ₁·…·ρₖ) · Δ^(k+1) / (k+1)!
```

Es exacta porque el sistema es lineal y nilpotente (la matriz es estrictamente triangular: su exponencial es un polinomio finito). Consecuencias: `advance` en un paso de 8 h da lo mismo que 28.800 pasos de 1 s (comprobado: error relativo 2·10⁻¹⁴), y el offline del Bosque es exacto.

**Por qué costes crecientes por nivel** (1,15 · 1,25 · 1,35 · 1,45 · 1,55): una unidad del nivel 4 aporta ∝ Δ⁵; sin freno, comprar solo el nivel superior domina todo. Con crecimiento mayor arriba, el jugador reparte.

### 3.3 Armonía (Huerta)

```
filas = minᵢ aᵢ   (sobre los 8 cerditos)
M_armonía = (1 + 0,02·filas) · 2^(nº de umbrales alcanzados)   umbrales: 10, 25, 50, 75, 100, 150, 200, 250, 300, 400
```

**Por qué umbrales y no exponencial continua.** La primera versión usaba `1,05^filas` y `1,08^filas`: con coste `1,17^n` el sistema quedaba en un **filo de cuchillo** (0,05 → muro total; 0,08 → explosión a 1e28 en 3 días). Un multiplicador exponencial contra un coste exponencial solo es estable si la proporción está perfectamente ajustada, y cualquier cambio de contenido lo rompe. Con umbrales ×2 el comportamiento es el mismo que el de las mejoras del Valle (probadamente estable) y el +2 % por fila da feedback en cada compra.

### 3.4 Calma (Balneario)

```
calma ∈ [0,1], sube a ritmo 1/1800 s⁻¹ hasta 1. Al comprar: calma ← calma · 0,5 (como mucho una vez cada 60 s).
producción(t) = base · (1 + 3 · calma(t))       → hasta ×4
ganado en Δ   = base · [ Δ + 3 · ∫ calma ]      (integral exacta: rampa lineal y luego tramo plano)
```

Cada ronda empieza con calma = 1 (si empezara en 0, el jugador tendría que esperar 30 min antes de su primera compra: se probó y es frustrante).

## 4. Autocompra

Capataz (cerditos) y Encargada (mejoras) compran, en cada tick y en cada trozo del offline, repetidamente **el candidato de mejor puntuación mientras sea asequible**:

```
puntuación = max(0, coste − dinero)/ingresos + coste/Δvalor      (menor es mejor)
Δvalor     = aumento de producción/s que causa la compra (en la cadena: valor a 30 min vista, §3.2)
```

En la Huerta se evalúa también el "paquete de fila" (una unidad de cada cerdito que está en el mínimo). En el Balneario solo compra con calma ≥ 95 % o dentro de la ventana de 60 s ya penalizada. **Es la misma regla que usa el simulador para el jugador**, así que el juego automático y el simulado coinciden.

## 5. Plumas (ascensión)

```
P_derecho = floor( (E_vida / e0)^k · (1 + 0,15·nivel(Plumas al viento)) )
ganancia al ascender = P_derecho − P
```

| Mundo | e0 | k | Lectura |
|---|---|---|---|
| Valle | 2·10⁵ | 1/3 | 10 plumas ≈ 2·10⁸ bellotas; ×1000 de moneda → ×10 plumas |
| Bosque | 10⁸ | 0,25 | la cadena crece como polinomio de grado 5; exponente bajo para compensarlo |
| Huerta | 10⁶ | 0,30 | |
| Balneario | 10⁶ | 0,28 | |

**Decisiones y motivos:**

1. **Basado en lo ganado en la vida, no en la ronda.** Ascender pronto nunca "desperdicia" nada: lo que no cobras ahora lo cobrarás después. Elimina el miedo a ascender mal.
2. **Raíz (k < 1).** Cada duplicación de plumas exige ×8 de moneda (Valle). Es lo que convierte el prestigio en un crecimiento que se va frenando de forma suave en vez de un muro o una explosión.
3. **Bono pasivo lineal en P y no en plumas sin gastar.** Gastar no reduce el bono → no hay dilema tóxico de "gasto o guardo".
4. **Análisis del bucle de retroalimentación** (la parte que rompe juegos incrementales). En una ronda, lo ganado crece aproximadamente como `M^γ` con γ ≈ 1,1 (más dinero → más unidades → más mejoras). Con Abono infinito (coste ×1,4 por nivel, efecto ×1,1) el jugador tiene `nivel ≈ log₁,₄ P`, que aporta `P^0,28`; junto al bono lineal, `M ∝ P^1,28`. Como `P ∝ E^k`:

   ```
   λ = 1,28 · γ · k      Valle: 1,28 · 1,1 · 1/3 ≈ 0,47
   ```

   - Si λ ≥ 1, cada ascensión da más de lo que costó conseguirla → **explosión** (la primera versión del simulador, con k = 0,5 y Abono ×1,25 con coste ×1,6, llegó a 10¹⁵ plumas en 10 días).
   - Si λ < 1, el progreso **converge**: las plumas crecen como un polinomio del tiempo. Eso es lo sano, y el tamaño del progreso depende de `1/(1−λ)`, que explica por qué `k` es la constante más sensible (§10).
5. **Primera ascensión**: el juego la permite con ≥ 1 pluma; el simulador asciende con ≥ 10 (≈ 2 h de juego casual). Doblar las plumas en cada ascensión es el ritmo natural del principio; más adelante se asciende cuando la ronda se estanca (~1 vez al día).

## 6. Ventajas permanentes

```
coste(nivel L → L+1) = ceil( base · crecimiento^L )   (en plumas del mundo)
```

- **Abono** (∞): base 2, ×1,4 por nivel, efecto ×1,10. Sumidero infinito. Con ×1,4 el efecto marginal cae como `P^0,28`, suficiente para que siempre apetezca y lejos de desestabilizar (§5.4).
- **Capataz / Encargada**: 5 y 20 plumas, **sin escalar**, para que la automatización llegue en la 1ª-2ª ascensión (hito explícito del diseño: quitar tareas pronto).
- **Primera fila** (Buen comienzo, Regateo, Herramientas, Plumas al viento, Hermandad): en Valle y Bosque cuestan ×10 respecto a Huerta y Balneario. **Motivo**: con coste ×1, el simulador compraba el árbol entero del Valle en las primeras 12 horas (decisiones sin peso). Con ×10 se completa entre el día 1 y el día 6. En Huerta/Balneario, que dan menos plumas, ×1 da un ritmo equivalente.
- **Segunda fila** (Establo ampliado ×4 por nivel, Raíces profundas ×3): objetivos de semanas. Coste base 2·10⁵ (Valle, Bosque) y 5·10³ (Huerta, Balneario), proporcional a las plumas típicas de cada mundo hacia el día 15-20.

## 7. Colección

Cada requisito se eligió mirando la **evolución diaria** del simulador (`npm run sim -- --profile casual --timeline`) para repartir las 28 variedades entre el día 1 y el ~50. Días en la simulación casual:

| Día | Variedades | % |
|---|---|---|
| 1 | Lechón manchado, Cerdito con boina | 7 % |
| 5-6 | Buscadora veterana, Rosa de concurso, Cerdita lectora | 18 % |
| 11 | Jabato curioso, Jabalí rosa | 25 % |
| 13-14 | Calabacero, Cerdo espantapájaros | 32 % |
| 18-20 | Cerdita jardinera, Cerdito con toalla, Lechón de spa | 43 % |
| 23 | Duroc pelirrojo, Duroc hortelano | 50 % |
| 26-30 | Cerdita con sombrero de seta, Cerdo en remojo, Cerdita con pepinos | 61 % |
| 34-40 | Madre del bosque, Cerdo filósofo, Gran calabaza, La Gran Madre, Maestro del barro | 79 % |
| 43 | Ibérico de bellota, Trufero ibérico, Cerdo de oro | 89 % |
| 47 | Cerdito astronauta, Cerdo alado, Pancho | 100 % |

**Regla de diseño aprendida**: los requisitos cercanos a una asíntota (p. ej. "tener 10 Espíritus del bosque", "130 del nivel superior") son frágiles: un cambio pequeño de economía los hace imposibles. Preferir requisitos de **plumas totales, ascensiones o moneda de vida**, que siguen creciendo sin techo.

Bonos: +5 % por variedad a su mundo (cruces +3 % y leyendas +5 % a todos); set completo ×1,25 a su mundo (Cruces ×1,10 a todos, Leyendas ×1,25 a todos, Curiosos −5 % de costes). En total la colección completa vale ≈ ×2,6 en cada mundo: se nota, pero es menos que un par de días de progreso de plumas (no es obligatoria para avanzar).

## 8. Constantes finales

> Generado con `node tools/sim/tables.ts`. Desde el hito 2, la fuente de verdad es `src/content/` (mundos, ventajas y colección); `tools/sim/content.ts` es un adaptador que solo traduce esa forma a la que espera el motor del simulador. Los nombres de las mejoras por cerdito viven en `src/content/upgrades.ts` (una plantilla por umbral, no aparecen en esta tabla); los textos (`flavor`) están en cada fichero de contenido.

#### El Valle (Bellotas) — mecánica `classic`
- Crecimiento de coste: 1.15 · moneda inicial 15
- Plumas: e0 = 200000, exponente = 0.3333, bono por pluma = 0.05
- Desbloqueo: desde el inicio
- Mejoras por cerdito: ×2 al tener 10, 25, 50, 100, 150, 200, 300, 400 (coste = 5 × precio de esa unidad)

| # | Cerdito | Coste base | Producción base | Crec. coste | Amortización base |
|---|---|---|---|---|---|
| 0 | Lechón | 10 | 0.5/s | 1.15 | 20 s |
| 1 | Cerdita rosa | 110 | 2.75/s | 1.15 | 40 s |
| 2 | Duroc | 1210 | 15.1/s | 1.15 | 80.13 s |
| 3 | Pietrain | 13300 | 83.2/s | 1.15 | 159.9 s |
| 4 | Berkshire | 146000 | 458/s | 1.15 | 318.8 s |
| 5 | Mangalica | 1.61e6 | 2520/s | 1.15 | 638.9 s |
| 6 | Ibérico | 1.77e7 | 13800/s | 1.15 | 1283 s |
| 7 | Gran Blanco | 1.95e8 | 76100/s | 1.15 | 2562 s |

Mejoras globales (×1.5 a todo; aparecen al ganar en la ronda el 25 % de su coste): Paja fresca (5000), Charca de barro (750000), Rascador de roble (1.13e8), Acordeón del abuelo (1.69e10), Huerto de manzanos (2.53e12), Siesta a la sombra (3.80e14), Fiesta de San Antón (5.70e16), Pocilga con vistas (8.54e18)

#### El Bosque (Trufas) — mecánica `chain`
- Crecimiento de coste: 1.2 (por defecto; ver tabla) · moneda inicial 60
- Plumas: e0 = 1e8, exponente = 0.25, bono por pluma = 0.05
- Desbloqueo: 60000 plumas totales en valle
- Mejoras por cerdito: ×2 al tener 10, 25, 50, 75, 100, 150 (coste = 5 × precio de esa unidad)

| # | Cerdito | Coste base | Producción base | Crec. coste | Amortización base |
|---|---|---|---|---|---|
| 0 | Buscadora | 50 | 1/s | 1.15 | 50 s |
| 1 | Madre trufera | 5000 | 0.01 uds/s | 1.25 | — |
| 2 | Abuela sabia | 500000 | 0.005 uds/s | 1.35 | — |
| 3 | Clan del roble | 5e7 | 0.0025 uds/s | 1.45 | — |
| 4 | Espíritu del bosque | 5e9 | 0.00125 uds/s | 1.55 | — |

Mejoras globales (×1.5 a todo; aparecen al ganar en la ronda el 25 % de su coste): Hocico entrenado (10000), Mapa de robles (1e7), Cesta de mimbre (1e10), Linterna de luciérnagas (1e13), Canción del bosque (1e16), Musgo mullido (1e19)

#### La Huerta (Calabazas) — mecánica `harmony`
- Crecimiento de coste: 1.14 · moneda inicial 100
- Plumas: e0 = 1e6, exponente = 0.3, bono por pluma = 0.05
- Desbloqueo: 300000 plumas totales en bosque
- Armonía: ×(1 + 0.02·filas) × 2^(umbrales alcanzados: 10, 25, 50, 75, 100, 150, 200, 250, 300, 400)

| # | Cerdito | Coste base | Producción base | Crec. coste | Amortización base |
|---|---|---|---|---|---|
| 0 | Hortelana | 100 | 1/s | 1.14 | 100 s |
| 1 | Regador | 350 | 2.9/s | 1.14 | 120.7 s |
| 2 | Escardadora | 1230 | 8.41/s | 1.14 | 146.3 s |
| 3 | Cuidador de tomates | 4290 | 24.4/s | 1.14 | 175.8 s |
| 4 | Pastora de gallinas | 15000 | 70.7/s | 1.14 | 212.2 s |
| 5 | Apicultor | 52500 | 205/s | 1.14 | 256.1 s |
| 6 | Jardinera jefa | 184000 | 595/s | 1.14 | 309.2 s |
| 7 | Abuelo del huerto | 643000 | 1720/s | 1.14 | 373.8 s |

Mejoras globales (×1.5 a todo; aparecen al ganar en la ronda el 25 % de su coste): Semillas antiguas (20000), Compost casero (2e6), Espantapájaros amable (2e8), Riego por goteo (2e10), Invernadero (2e12), Calendario lunar (2e14), Abejas amigas (2e16), Fiesta de la cosecha (2e18)

#### El Balneario (Pompas) — mecánica `calm`
- Crecimiento de coste: 1.18 · moneda inicial 1000
- Plumas: e0 = 1e6, exponente = 0.28, bono por pluma = 0.05
- Desbloqueo: 10000 plumas totales en huerta
- Mejoras por cerdito: ×2 al tener 10, 25, 50, 100, 150, 200 (coste = 5 × precio de esa unidad)
- Calma: bono máximo +300 %, sube en 30 min, comprar la multiplica por 0.5 (como mucho una vez cada 60 s)

| # | Cerdito | Coste base | Producción base | Crec. coste | Amortización base |
|---|---|---|---|---|---|
| 0 | Bañista | 1000 | 5/s | 1.18 | 200 s |
| 1 | Cerdita del barro | 11000 | 27.5/s | 1.18 | 400 s |
| 2 | Masajista | 121000 | 151/s | 1.18 | 801.3 s |
| 3 | Socorrista | 1.33e6 | 832/s | 1.18 | 1599 s |
| 4 | Termalista | 1.46e7 | 4580/s | 1.18 | 3188 s |
| 5 | Maestra de sales | 1.61e8 | 25200/s | 1.18 | 6389 s |
| 6 | Director del spa | 1.77e9 | 138000/s | 1.18 | 1.28e4 s |
| 7 | Cerdo zen | 1.95e10 | 761000/s | 1.18 | 2.56e4 s |

Mejoras globales (×1.5 a todo; aparecen al ganar en la ronda el 25 % de su coste): Toallas calentitas (500000), Barro volcánico (1.50e8), Pepinos en los ojos (4.50e10), Hilo musical (1.35e13), Albornoces bordados (4.05e15), Aromas de lavanda (1.22e18)

#### Ventajas permanentes (coste del nivel L = base × crecimiento^L, en plumas del mundo)
| Ventaja | Mundo | Niveles | Coste base | Crecimiento | Requiere | Efecto |
|---|---|---|---|---|---|---|
| Abono de calidad | valle | ∞ | 2 | 1.4 | — | prodMult 1.1 |
| Capataz | valle | 1 | 5 | 1 | — | autobuyGenerators |
| Buen comienzo | valle | 5 | 30 | 3 | abono | startCurrency 25 |
| Regateo en la feria | valle | 5 | 60 | 2.2 | abono | costMult 0.93 |
| Encargada de mejoras | valle | 1 | 20 | 1 | capataz | autobuyUpgrades |
| Herramientas heredadas | valle | 3 | 120 | 3 | encargada | upgradeCostMult 0.75 |
| Plumas al viento | valle | 5 | 250 | 2.5 | ahorro | plumaMult 0.15 |
| Hermandad de granjas | valle | 5 | 600 | 2.2 | vuelo | crossProd 0.1 |
| Establo ampliado | valle | 4 | 200000 | 4 | puente | costGrowthDelta 0.0025 |
| Raíces profundas | valle | 5 | 400000 | 3 | puente | perPlumaBonus 0.01 |
| Abono de calidad | bosque | ∞ | 2 | 1.4 | — | prodMult 1.1 |
| Capataz | bosque | 1 | 5 | 1 | — | autobuyGenerators |
| Buen comienzo | bosque | 5 | 30 | 3 | abono | startCurrency 25 |
| Regateo en la feria | bosque | 5 | 60 | 2.2 | abono | costMult 0.93 |
| Encargada de mejoras | bosque | 1 | 20 | 1 | capataz | autobuyUpgrades |
| Herramientas heredadas | bosque | 3 | 120 | 3 | encargada | upgradeCostMult 0.75 |
| Plumas al viento | bosque | 5 | 250 | 2.5 | ahorro | plumaMult 0.15 |
| Hermandad de granjas | bosque | 5 | 600 | 2.2 | vuelo | crossProd 0.1 |
| Establo ampliado | bosque | 4 | 200000 | 4 | puente | costGrowthDelta 0.0025 |
| Raíces profundas | bosque | 5 | 400000 | 3 | puente | perPlumaBonus 0.01 |
| Abono de calidad | huerta | ∞ | 2 | 1.4 | — | prodMult 1.1 |
| Capataz | huerta | 1 | 5 | 1 | — | autobuyGenerators |
| Buen comienzo | huerta | 5 | 3 | 3 | abono | startCurrency 25 |
| Regateo en la feria | huerta | 5 | 6 | 2.2 | abono | costMult 0.93 |
| Encargada de mejoras | huerta | 1 | 20 | 1 | capataz | autobuyUpgrades |
| Herramientas heredadas | huerta | 3 | 12 | 3 | encargada | upgradeCostMult 0.75 |
| Plumas al viento | huerta | 5 | 25 | 2.5 | ahorro | plumaMult 0.15 |
| Hermandad de granjas | huerta | 5 | 60 | 2.2 | vuelo | crossProd 0.1 |
| Establo ampliado | huerta | 4 | 5000 | 4 | puente | costGrowthDelta 0.0025 |
| Raíces profundas | huerta | 5 | 10000 | 3 | puente | perPlumaBonus 0.01 |
| Abono de calidad | balneario | ∞ | 2 | 1.4 | — | prodMult 1.1 |
| Capataz | balneario | 1 | 5 | 1 | — | autobuyGenerators |
| Buen comienzo | balneario | 5 | 3 | 3 | abono | startCurrency 25 |
| Regateo en la feria | balneario | 5 | 6 | 2.2 | abono | costMult 0.93 |
| Encargada de mejoras | balneario | 1 | 20 | 1 | capataz | autobuyUpgrades |
| Herramientas heredadas | balneario | 3 | 12 | 3 | encargada | upgradeCostMult 0.75 |
| Plumas al viento | balneario | 5 | 25 | 2.5 | ahorro | plumaMult 0.15 |
| Hermandad de granjas | balneario | 5 | 60 | 2.2 | vuelo | crossProd 0.1 |
| Establo ampliado | balneario | 4 | 5000 | 4 | puente | costGrowthDelta 0.0025 |
| Raíces profundas | balneario | 5 | 10000 | 3 | puente | perPlumaBonus 0.01 |

#### Colección
| Variedad | Set | Requisito | Bono |
|---|---|---|---|
| Lechón manchado | valle | 100 × Lechón (valle) | prod valle ×1.05 |
| Rosa de concurso | valle | 200 × Cerdita rosa (valle) | prod valle ×1.05 |
| Duroc pelirrojo | valle | 250 × Duroc (valle) | prod valle ×1.05 |
| Ibérico de bellota | valle | 245 × Ibérico (valle) | prod valle ×1.05 |
| Buscadora veterana | bosque | 1 ascensiones en bosque | prod bosque ×1.05 |
| Jabato curioso | bosque | 150 × Abuela sabia (bosque) | prod bosque ×1.05 |
| Cerdita con sombrero de seta | bosque | 1e33 ganado en la vida de bosque | prod bosque ×1.05 |
| Madre del bosque | bosque | 5e6 plumas totales en bosque | prod bosque ×1.05 |
| Calabacero | huerta | armonía 25 | prod huerta ×1.05 |
| Cerdo espantapájaros | huerta | armonía 150 | prod huerta ×1.05 |
| Cerdita jardinera | huerta | 10 ascensiones en huerta | prod huerta ×1.05 |
| Gran calabaza (con cerdito dentro) | huerta | armonía 250 | prod huerta ×1.05 |
| Cerdito con toalla | balneario | 1 ascensiones en balneario | prod balneario ×1.05 |
| Cerdo en remojo | balneario | 1e21 ganado en la vida de balneario | prod balneario ×1.05 |
| Cerdita con pepinos | balneario | 140 × Cerdo zen (balneario) | prod balneario ×1.05 |
| Maestro del barro | balneario | 50000 plumas totales en balneario | prod balneario ×1.05 |
| Cerdito con boina | curiosos | 5 ascensiones en valle | prod valle ×1.05 |
| Cerdita lectora | curiosos | 100000 plumas totales en valle | prod valle ×1.05 |
| Cerdo filósofo | curiosos | 30 ascensiones en valle | prod valle ×1.05 |
| Cerdito astronauta | curiosos | 4e6 plumas totales en valle | prod valle ×1.05 |
| Trufero ibérico | cruces | tener: iberico-de-bellota, buscadora-veterana | prod all ×1.03 |
| Jabalí rosa | cruces | tener: rosa-de-concurso, jabato-curioso | prod all ×1.03 |
| Duroc hortelano | cruces | tener: duroc-pelirrojo, calabacero | prod all ×1.03 |
| Lechón de spa | cruces | tener: lechon-manchado, cerdito-toalla | prod all ×1.03 |
| Cerdo alado | leyendas | tener: cerdito-astronauta, maestro-del-barro | prod all ×1.05 |
| La Gran Madre | leyendas | tener: madre-del-bosque, gran-calabaza | prod all ×1.05 |
| Cerdo de oro | leyendas | tener: trufero-iberico, jabali-rosa, duroc-hortelano, lechon-de-spa | prod all ×1.05 |
| Pancho, el primer cerdito | leyendas | tener: cerdo-alado, gran-madre, cerdo-de-oro, cerdo-filosofo, cerdita-seta, cerdita-pepinos, cerdita-jardinera, cerdo-en-remojo | prod all ×1.05 |

| Set | Bono al completarlo |
|---|---|
| Razas del Valle | prod valle ×1.25 |
| Familia del Bosque | prod bosque ×1.25 |
| Amigos de la Huerta | prod huerta ×1.25 |
| Clientes del Balneario | prod balneario ×1.25 |
| Cerditos curiosos | cost all ×0.95 |
| Cruces | prod all ×1.1 |
| Leyendas porcinas | prod all ×1.25 |

## 9. Objetivos de ritmo y resultados

### 9.1 Perfiles de jugador simulados

| Perfil | Descripción |
|---|---|
| **casual** (referencia) | 1ª sesión de 30 min; después visitas de 5 min cada 2 h de 08:00 a 24:00 (9 al día); noche sin jugar |
| **ocasional** | 1ª sesión de 20 min; después 3 visitas de 5 min al día (08:00, 14:00, 22:00) |
| **activo** | conectado de 08:00 a 24:00 todos los días (cota superior) |

Estrategia del jugador simulado (en `tools/sim/strategy.ts`): en cada visita compra ventajas (primero Capataz/Encargada, luego la más barata), asciende si (a) la ascensión al menos duplica sus plumas (la primera con ≥ 10), (b) la ronda está estancada (pendientes +< 5 % en 1 h) y gana ≥ 20 %, (c) la ronda dura > 20 h y gana ≥ 20 %, o (d) la ronda dura > 2 días; y compra con la misma regla que el autocomprador (§4). Fuera de las visitas solo actúan los autocompradores. Offline al 100 % troceado igual que en el juego.

### 9.2 Objetivos (perfil casual salvo indicación)

| Objetivo | Rango aceptable | Resultado | ¿OK? |
|---|---|---|---|
| 1ª ascensión Valle | 30 min – 3.0 h | 2.0 h | sí |
| 2ª ascensión Valle | 1.5 h – 10.0 h | 4.0 h | sí |
| 10ª ascensión Valle | 24.0 h – 4.0 d | 3.0 d | sí |
| Desbloqueo Bosque | 2.0 d – 5.0 d | 4.0 d | sí |
| Desbloqueo Huerta | 7.0 d – 14.0 d | 12.0 d | sí |
| Desbloqueo Balneario | 16.0 d – 30.0 d | 19.0 d | sí |
| Colección 50 % | 10.0 d – 30.0 d | 21.7 d | sí |
| Colección 100 % | 25.0 d – 75.0 d | 29.5 d | sí |
| Desbloqueo Bosque (ocasional) | 3.0 d – 8.0 d | 5.0 d | sí |
| Desbloqueo Balneario (ocasional) | 16.0 d – 40.0 d | 19.0 d | sí |
| Desbloqueo Balneario (activo) | 10.0 d – 25.0 d | 17.0 d | sí |

### 9.3 Hitos de la simulación casual (60 días)

#### Hitos (d = día, t = 0 es el día 1 a las 08:00)
| Hito | Momento | Horas |
|---|---|---|
| asc:valle:1 | d1 10:00 | 2.0 h |
| asc:valle:2 | d1 12:00 | 4.0 h |
| asc:valle:3 | d1 14:00 | 6.0 h |
| asc:valle:5 | d1 18:00 | 10.0 h |
| asc:valle:10 | d4 08:03 | 3.0 d |
| asc:valle:20 | d17 08:00 | 16.0 d |
| asc:valle:50 | — | — |
| asc:valle:100 | — | — |
| unlock:bosque | d5 08:00 | 4.0 d |
| asc:bosque:1 | d5 18:00 | 4.4 d |
| asc:bosque:10 | d10 12:00 | 9.2 d |
| unlock:huerta | d13 08:00 | 12.0 d |
| asc:huerta:1 | d13 14:00 | 12.3 d |
| asc:huerta:10 | d18 08:00 | 17.0 d |
| unlock:balneario | d20 08:00 | 19.0 d |
| asc:balneario:1 | d20 14:00 | 19.3 d |
| asc:balneario:10 | d24 08:00 | 23.0 d |
| collection:25 | d11 07:34 | 10.0 d |
| collection:50 | d23 01:16 | 21.7 d |
| collection:75 | d39 21:47 | 38.6 d |
| collection:100 | d47 08:01 | 46.0 d |

#### Estado final por mundo
| Mundo | Ascensiones | Plumas totales | Ganado (vida) | Nivel Abono | Ronda actual |
|---|---|---|---|---|---|
| El Valle | 41 | 6.05e6 | 9.51e24 | 40 | 48.0 h |
| El Bosque | 39 | 1.09e7 | 1.52e35 | 42 | 24.0 h |
| La Huerta | 34 | 1.73e5 | 5.07e22 | 29 | 34.0 h |
| El Balneario | 29 | 1.13e5 | 1.60e23 | 28 | 24.0 h |

Colección: 28/28

#### Duración de ronda (entre ascensiones)
- El Valle: 41 ascensiones; ronda en el 0/25/50/75/100 % del recorrido: 2.0 h / 23.9 h / 2.0 d / 2.0 d / 2.0 d
- El Bosque: 39 ascensiones; ronda en el 0/25/50/75/100 % del recorrido: 14.0 h / 20.0 h / 38.0 h / 2.0 d / 2.0 d
- La Huerta: 34 ascensiones; ronda en el 0/25/50/75/100 % del recorrido: 2.0 h / 24.0 h / 2.0 d / 2.0 d / 2.0 d
- El Balneario: 29 ascensiones; ronda en el 0/25/50/75/100 % del recorrido: 4.0 h / 18.0 h / 2.0 d / 2.0 d / 2.0 d

#### Huecos más largos sin novedades (después del día 1)
- 4.0 d desde d47 22:01
- 3.6 d desde d30 08:00
- 3.6 d desde d54 08:01
- 2.4 d desde d43 22:00
- 2.0 d desde d35 08:00

#### Comparación de perfiles

| Perfil | 1ª ascensión | Bosque | Huerta | Balneario | Colección 50 % | Colección 100 % |
|---|---|---|---|---|---|---|
| casual | 2.0 h | 4.0 d | 12.0 d | 19.0 d | 21.7 d | 46.0 d |
| ocasional | 6.0 h | 5.0 d | 12.0 d | 19.0 d | 22.7 d | 47.0 d |
| activo | 50 min | 3.1 d | 11.0 d | 17.0 d | 19.8 d | 46.0 d |

## 10. Sensibilidad

Cada fila cambia **una** constante respecto a la configuración final y simula 60 días con el perfil casual (`npm run sim -- --profile casual --set …`). "Fallos" = objetivos de §9.2 fuera de rango.

| Cambio | Bosque | Huerta | Balneario | Colección 100 % | Fallos |
|---|---|---|---|---|---|
| **Base (final)** | 4,0 d | 12,0 d | 19,0 d | 46,0 d | 0 |
| Valle: coste ×1,14 (−0,01) | 3,0 d | 11,0 d | 17,0 d | 36,5 d | 1 |
| Valle: coste ×1,16 (+0,01) | 4,0 d | 12,0 d | 19,0 d | — | 1 |
| Valle: bono por pluma 0,04 | 4,0 d | 12,0 d | 19,0 d | 54,0 d | 0 |
| Valle: bono por pluma 0,06 | 3,2 d | 11,0 d | 18,0 d | 41,3 d | 0 |
| Valle: exponente plumas 0,30 (−10 %) | **29,5 d** | 38,0 d | 45,0 d | — | 6 |
| Valle: exponente plumas 0,367 (+10 %) | **24 h** | 9,0 d | 15,0 d | 31,0 d | 3 |
| Valle: e0 = 1·10⁵ (÷2) | 2,3 d | 10,0 d | 17,0 d | 35,3 d | 1 |
| Valle: e0 = 4·10⁵ (×2) | 5,0 d | 13,0 d | 20,0 d | — | 2 |
| Bosque: exponente 0,225 (−10 %) | 4,0 d | **28,0 d** | 34,0 d | — | 4 |
| Bosque: exponente 0,275 (+10 %) | 4,0 d | 8,4 d | 15,0 d | 45,0 d | 1 |
| Huerta: coste ×1,13 | 4,0 d | 12,0 d | 17,0 d | 45,3 d | 0 |
| Huerta: coste ×1,15 | 4,0 d | 12,0 d | 20,3 d | — | 1 |
| Huerta: exponente 0,27 (−10 %) | 4,0 d | 12,0 d | **no llega** | — | 3 |
| Huerta: exponente 0,33 (+10 %) | 4,0 d | 12,0 d | 14,1 d | 44,0 d | 1 |
| Huerta: +0 % por fila (solo umbrales) | 4,0 d | 12,0 d | 34,3 d | — | 3 |
| Huerta: +4 % por fila | 4,0 d | 12,0 d | 16,0 d | 45,0 d | 0 |
| Balneario: penalización de calma ×0,25 | 4,0 d | 12,0 d | 19,0 d | 48,0 d | 0 |
| Balneario: penalización de calma ×0,75 | 4,0 d | 12,0 d | 19,0 d | 46,0 d | 0 |
| Balneario: bono máximo de calma +200 % | 4,0 d | 12,0 d | 19,0 d | 48,0 d | 0 |
| Balneario: coste ×1,20 | 4,0 d | 12,0 d | 19,0 d | — | 1 |
| Estrategia: asciende con rondas > 8 h y ≥ 50 % | 4,0 d | 12,1 d | 18,1 d | 46,1 d | 0 |
| Estrategia: asciende con rondas > 36 h y ≥ 10 % | 5,0 d | 13,0 d | 20,0 d | 49,0 d | 1 |

**Conclusiones**

1. **El exponente de las plumas es, con diferencia, la constante más peligrosa.** ±10 % en el del Valle mueve la apertura del Bosque del día 1 al día 30. Es la consecuencia directa de §5.4: el progreso escala como `1/(1−λ)`. Regla: **no tocar exponentes de plumas sin simular**, y preferir ajustar `e0` (efecto suave y predecible: ×2 en e0 ≈ +1 día) o los umbrales de desbloqueo.
2. Costes de cerditos, bono por pluma y parámetros de calma son **robustos**: cambios del 5-50 % mueven los hitos 1-2 días como mucho. Son las palancas seguras para ajustar la sensación de juego.
3. La **estrategia de ascensión** del jugador apenas cambia el ritmo (±1 día): no hay una forma "correcta" oculta de jugar que el jugador deba descubrir, coherente con la regla de información visible.
4. La **calma apenas mueve el ritmo global** (el Balneario es el último mundo y sus plumas no desbloquean nada). Es buena noticia: su intensidad se puede ajustar solo por sensación tras las pruebas reales. Si en el futuro hay un mundo 5 que dependa del Balneario, habrá que volver a simular.
5. Los fallos de "Colección 100 %" en varias filas se deben a los requisitos más tardíos (Cerdito astronauta: 4·10⁶ plumas del Valle), que quedan justo después del día 60 cuando la economía se ralentiza un poco. No es un muro (siguen creciendo), pero confirma la regla de §7.

**Huecos sin novedades.** En el perfil casual, el hueco más largo antes del día 30 es de ~2 días; entre el día 30 y el 60 aparecen huecos de 2-4 días (entre compras de Abono, ventajas de segunda fila y las últimas variedades). Es la fase de "granja madura": una ascensión al día por mundo y alguna compra. Aceptable para un idle tranquilo, pero es la señal de que el **contenido de la v1 dura ~50 días**; ver riesgo 2 de 01 §12.

## 11. Cómo reajustar

1. Cambia la constante en `tools/sim/content.ts` (o prueba sin tocarla: `npm run sim -- --profile casual --set valle.prestige.exponent=0.34`).
2. `npm run sim` debe acabar con "Todos los objetivos de ritmo se cumplen".
3. Mira también los "huecos más largos sin novedades" y la "evolución diaria" (`--timeline`): ningún hueco > 2 días antes del día 30.
4. Si ajustas un umbral de colección, usa `--timeline` para ver en qué día se alcanza.
5. Actualiza §8 (`node tools/sim/tables.ts`) y §9-§10 de este documento.
6. Desde el hito 2, el contenido real está en `src/content/` y el simulador lo importa: el paso 1 se hace allí.
