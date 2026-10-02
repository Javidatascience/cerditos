# 01 · Diseño del juego

> Título de trabajo: **Cerditos** (nombre provisional; alternativas: *Pocilga Serena*, *Cuando los cerdos vuelen*).
> Este documento dice **qué** es el juego. Los números están en [03-economia.md](03-economia.md), el **cómo** técnico en [02-arquitectura.md](02-arquitectura.md) y el orden de trabajo en [04-plan-implementacion.md](04-plan-implementacion.md).

---

## 1. Visión

Un juego incremental tranquilo sobre una familia de granjas de cerditos. Compras cerditos que producen, mejoras la granja, y de vez en cuando dejas que tus cerdos **echen a volar** (la ascensión) para volver a empezar con ventajas permanentes. Con el tiempo se abren granjas nuevas en otros lugares (el Bosque, la Huerta, el Balneario), cada una con sus propias reglas, y vas completando un **álbum de variedades de cerdito** que sabes exactamente cómo conseguir.

Es un juego para abrir dos minutos con el café, mirar cómo va la granja, decidir un par de cosas y cerrarlo sin culpa. **Jugar 3 visitas de 5 minutos al día debe rendir prácticamente igual que tenerlo abierto todo el día** (el simulador lo verifica: ver 03-economia §10).

## 2. Pilares

1. **Calma.** Nada reclama tu atención. No hay parpadeos, ni sonidos, ni cuentas atrás, ni cosas que se pierden si no entras.
2. **Claridad.** Siempre se ve qué hace cada cosa, cuánto cuesta, cuánto falta y qué desbloquea. Cero azar: el mismo estado produce siempre el mismo resultado.
3. **Decisiones pequeñas con sentido.** Qué comprar, cuándo ascender, qué ventaja permanente elegir, en qué mundo centrarse. Nunca decisiones de reflejos.
4. **Progreso que se nota.** Cada visita trae algo: una mejora nueva, una variedad para el álbum, una ventaja, un mundo. El simulador mide los huecos sin novedades.
5. **Humor suave.** Nombres y descripciones con cariño y algún chiste tonto. Nada de sarcasmo ni de ironía cínica.

## 3. Tono y estilo

- Paleta cálida y apagada (rosas empolvados, verdes salvia, marrones de madera, crema). Tipografía redondeada y legible.
- Textos cortos, en segunda persona, con humor amable. Ejemplos:
  - *Lechón:* "Pequeño, redondo y convencido de que todo es comida."
  - *Duroc:* "Pelirrojo y orgulloso de serlo."
  - *Cerdo filósofo:* "Se pregunta si el barro le mancha a él o él mancha al barro."
  - Ascensión: "Tus cerdos han decidido que hoy sí, hoy vuelan. Dejan tras de sí unas cuantas plumas."
  - Vuelta tras ausencia: "Mientras no estabas, la granja siguió a lo suyo: +1,2 M bellotas."
- Iconos simples (SVG planos o emoji estilizados en la primera versión). Animaciones: como mucho transiciones de opacidad de 150 ms y una barra de progreso que avanza. Nada que rebote, gire o brille.
- Sin sonido en la v1. Si algún día se añade: ambiente opcional, apagado por defecto.

## 4. Bucle principal

```
producir moneda ──► comprar cerditos (generadores) ──► producir más
        │                     │
        │                     └─► al tener N de un tipo se habilita una mejora ×2
        │
        └─► cuando la ronda se frena ──► ASCENDER: se reinicia el mundo, ganas Plumas
                                                  │
                                                  └─► Plumas: bono pasivo + árbol de ventajas permanentes
```

- **Generadores**: razas de cerdito (8 por mundo, 5 en el Bosque). Cada compra encarece la siguiente (coste exponencial).
- **Mejoras**: se habilitan al tener 10, 25, 50, 100… unidades de un cerdito y lo duplican. Más unas pocas mejoras globales (×1,5 a todo) que aparecen al acumular moneda en la ronda.
- **Toque**: el botón "Rascar la barriga" da +1 de moneda. Solo sirve para arrancar los primeros segundos; no escala y no hay mejoras de toque (decisión anti-clic compulsivo).
- **Sin autocompra** (decisión del usuario, 2026-10-02): se quitaron las ventajas Capataz y Encargada por ser demasiado potentes. Todas las compras las hace el jugador; mientras no está, la granja solo produce.

## 5. Ascensión ("Echar a volar")

- **Por mundo.** Cada mundo asciende por separado y da **Plumas de ese mundo** (Plumas del Valle, del Bosque…). Motivo: cada mundo es una economía cerrada y equilibrable por separado; si hubiera una sola moneda de prestigio, el jugador granjearía el mundo más fácil y los demás sobrarían.
- **Qué se reinicia**: moneda, cerditos, mejoras y estadísticas de la ronda de ese mundo.
- **Qué se conserva**: plumas, ventajas compradas, colección, estadísticas históricas, y todo lo de los demás mundos.
- **Fórmula** (detalle en 03 §5): las plumas dependen de lo **ganado en toda la vida** del mundo, con raíz (cúbica en el Valle). Ascender da la diferencia entre lo que "te corresponde" ahora y lo que ya cobraste. Nunca se puede perder plumas por ascender "mal".
- **Bono pasivo**: cada pluma ganada (histórico, no las gastadas) da +5 % de producción en su mundo. Gastar plumas **no** reduce el bono → gastar nunca duele. Esto elimina la típica duda tóxica de "¿gasto o guardo?".
- **Cuándo ascender**: decisión del jugador. La interfaz muestra, sin presionar: plumas que ganarías ahora, cuánto multiplicaría eso tu producción y a qué ritmo crecen las plumas pendientes ("+3 % en la última hora"). No hay botón que parpadee.
- **Primera ascensión** disponible con ≥ 1 pluma; la interfaz sugiere esperar a ~10 (≈ 1-2 h de juego) con un texto neutro.

## 6. Árbol de ventajas permanentes

Un árbol por mundo, pagado con las plumas de ese mundo. Misma forma en los cuatro mundos (más fácil de aprender y de implementar); cambian nombres, textos y costes de la segunda fila.

```
                 Abono de calidad (∞) ─┬─ Buen comienzo (5)
                                       └─ Regateo en la feria (5) ── Plumas al viento (5) ── Hermandad de granjas (5) ─┬─ Establo ampliado (4)
 Herramientas heredadas (3, bajo Abono)                                               └─ Raíces profundas (5)
```

| Ventaja | Niveles | Efecto por nivel | Para qué existe |
|---|---|---|---|
| Abono de calidad | ∞ | producción ×1,10 | Sumidero infinito de plumas; siempre hay algo que comprar |
| Buen comienzo | 5 | moneda inicial ×25 | Que el arranque de cada ronda sea ágil |
| Regateo en la feria | 5 | coste de cerditos ×0,93 | Palanca de coste, no solo de producción |
| Herramientas heredadas | 3 | coste de mejoras ×0,75 | Ídem para mejoras |
| Plumas al viento | 5 | +15 % plumas al ascender | Acelera el propio prestigio |
| Hermandad de granjas | 5 | **+10 % producción en los otros mundos** | Puente entre mundos (bono suave) |
| Establo ampliado | 4 | crecimiento de coste −0,0025 | Objetivo de largo plazo; rompe muros tardíos |
| Raíces profundas | 5 | bono por pluma +1 % (de 5 % a 6 %…) | Objetivo de largo plazo |

Costes y fórmulas en 03 §6.

## 7. Mundos

Todos los mundos desbloqueados **producen a la vez**, también offline. La pantalla muestra uno cada vez; se cambia con pestañas. Motivo: mirar un mundo no debe castigar a los otros, y el modelo mental es "tengo varias granjas".

Cada mundo se desbloquea al alcanzar cierto número de **plumas totales en el mundo anterior** (umbral visible desde el principio: "El Bosque abrirá cuando el Valle haya dado 60.000 plumas").

| # | Mundo | Moneda | Mecánica diferenciadora | Cómo se siente | Dificultad | Desbloqueo |
|---|---|---|---|---|---|---|
| 1 | **El Valle** | Bellotas | Clásica: generadores + mejoras ×2 por cantidad | Aprender el juego. Progreso rápido el primer día | Base (coste ×1,15; plumas con raíz cúbica) | Desde el inicio |
| 2 | **El Bosque** | Trufas | **Cadena**: solo las Buscadoras producen trufas; cada nivel superior *produce cerditos del nivel inferior* (Madres → Buscadoras, Abuelas → Madres…). Las unidades producidas no encarecen las compras | Arranque lento, crecimiento explosivo. Premia la paciencia y comprar "arriba" | Costes crecientes por nivel (×1,15 a ×1,55); plumas con exponente 0,25 | 60.000 plumas del Valle |
| 3 | **La Huerta** | Calabazas | **Armonía**: no hay mejoras por cerdito. La producción de todo se multiplica según el **mínimo** de unidades entre los 8 tipos ("filas completas"): ×2 al llegar a 10, 25, 50, 75, 100, 150… filas, más +2 % por fila | Obliga a crecer en equilibrio en vez de apilar el mejor cerdito | Coste ×1,14 pero cada "fila" cuesta 8 compras; plumas con exponente 0,30 | 300.000 plumas del Bosque |
| 4 | **El Balneario** | Pompas | **Calma**: los cerditos rinden hasta ×4 cuando nadie los molesta. La calma sube de 0 a 100 % en 30 min; **comprar la reduce a la mitad** (una vez por minuto como mucho: comprar varias cosas seguidas cuenta como una sola molestia). Cada ronda empieza con la calma llena | Premia visitas espaciadas y compras en lote. Es el mundo que mejor encarna el espíritu del juego | Coste ×1,18; plumas con exponente 0,28 | 10.000 plumas de la Huerta |

**Por qué estas mecánicas**: cada una cambia *qué es una buena decisión*, no solo el tamaño de los números. En el Valle se compra lo que mejor rinde; en el Bosque se invierte en niveles altos que tardan en pagar; en la Huerta se reparte; en el Balneario se espera y se compra en lote. Y todas se pueden calcular offline con el mismo tick (02 §5).

**Ideas para mundos futuros** (no en la v1, anotadas para cuando el contenido se agote):
- *La Montaña (Quesos)*: los costes son compartidos: cada compra encarece todos los cerditos.
- *El Puerto (Conchas)*: dos monedas que se convierten una en otra a un ratio fijo que el jugador mejora.
- *La Feria (Cintas)*: los cerditos suben de nivel en vez de comprarse más unidades (pocas unidades, mucha profundidad).

## 8. Colección: el álbum de variedades

28 variedades de cerdito agrupadas en 7 sets. **Todas son deterministas**: cada ficha muestra desde el principio su requisito exacto y el progreso actual ("Ibérico de bellota: ten 245 Ibéricos a la vez en el Valle — llevas 212").

- Al cumplir el requisito la variedad entra en el álbum automáticamente y queda una línea discreta en el **Diario de la granja** ("Ha llegado una Cerdita lectora. Trae sus propias gafas."). Sin ventana emergente.
- La colección **nunca se pierde** (sobrevive a ascensiones).
- Cada variedad da un bono pequeño (+5 % a su mundo, o +3/+5 % a todos). Cada **set completo** da un bono mayor.
- Tipos de requisito: tener N de un cerdito en una ronda, N ascensiones, N plumas totales, N moneda ganada en la vida del mundo, nivel de armonía, y **cruces** (tener dos variedades concretas de mundos distintos).

| Set | Variedades | Bono de set |
|---|---|---|
| Razas del Valle | Lechón manchado, Rosa de concurso, Duroc pelirrojo, Ibérico de bellota | Valle ×1,25 |
| Familia del Bosque | Buscadora veterana, Jabato curioso, Cerdita con sombrero de seta, Madre del bosque | Bosque ×1,25 |
| Amigos de la Huerta | Calabacero, Cerdo espantapájaros, Cerdita jardinera, Gran calabaza (con cerdito dentro) | Huerta ×1,25 |
| Clientes del Balneario | Cerdito con toalla, Cerdo en remojo, Cerdita con pepinos, Maestro del barro | Balneario ×1,25 |
| Cerditos curiosos | Cerdito con boina, Cerdita lectora, Cerdo filósofo, Cerdito astronauta | Costes −5 % en todos los mundos |
| Cruces | Trufero ibérico, Jabalí rosa, Duroc hortelano, Lechón de spa | Todos ×1,10 |
| Leyendas porcinas | Cerdo alado, La Gran Madre, Cerdo de oro, Pancho (el primer cerdito) | Todos ×1,25 |

Requisitos exactos y días en que se consiguen en la simulación: 03 §7. Ritmo objetivo: ~50 % el día 20, 100 % hacia el día 50-55.

## 9. Cómo se cruzan los mundos

Bonos **suaves y acotados** para que ningún mundo haga trivial a otro:

1. **Hermandad de granjas** (ventaja, 5 niveles): cada mundo puede dar hasta **+50 %** de producción a todos los demás. Con 4 mundos, como mucho ×1,5³ ≈ ×3,4 recibido por cada mundo: se nota, pero no sustituye al progreso propio.
2. **Colección**: sets de un mundo que requieren haber jugado otro (cruces) y bonos "a todos".
3. **Desbloqueo en cadena**: el progreso de un mundo abre el siguiente.

Lo que **no** hacemos: convertir una moneda en otra, ni que las plumas de un mundo compren cosas de otro. Motivo: mantener cada economía equilibrable por separado (el simulador falla en cuanto hay transferencias sin límite).

## 10. Progreso offline

- Al volver, se calcula lo ocurrido durante la ausencia **con el mismo tick del juego**, troceado (02 §5) (sin compras: no hay autocompra). Rendimiento offline = **100 %**, sin tope práctico (tope técnico: 30 días, para protegerse de relojes erróneos).
- Se muestra un resumen sobrio al abrir: tiempo fuera, moneda ganada por mundo, variedades nuevas, compras automáticas. Un botón "Vale".
- Motivo del 100 %: un rendimiento offline menor castiga no estar, que es justo lo que queremos evitar.

## 11. Lo que NO haremos (reglas anti-dopamina)

Estas reglas son **requisitos**, no preferencias. Cualquier tarea que las contradiga está mal planteada.

1. **Nada aleatorio** que afecte al progreso: ni cajas, ni gacha, ni botín, ni "críticos". *Excepción (decisión del usuario, 2026-10-02): el **cerdito viajero**. Llega al azar (cada 1-2 min con el juego abierto, nunca offline) y trae, también al azar, una inyección de 10 min de producción o un ×5 durante 60 s. La cuantía es fija. **Se queda solo 10 s y se va** (excepción a la regla 2); si no estás, no pierdes nada porque no cuenta offline.*
2. **Nada de urgencia**: sin temporizadores que caduquen, sin ofertas por tiempo limitado, sin eventos de temporada que se pierden.
3. **Sin rachas** ni recompensas diarias por entrar. Sin penalización por ausencia (offline al 100 %).
4. **Sin notificaciones** push, sin badges en el icono, sin pedir permisos de notificación.
5. **Sin estímulos agresivos**: sin destellos, confeti, sacudidas de pantalla, números que saltan, contadores que giran, sonidos, vibración. Transiciones ≤ 150 ms de opacidad como mucho.
6. **Sin pantallazos de recompensa** a pantalla completa. Los logros y variedades se anotan en el Diario.
7. **Sin mecánicas de clic compulsivo**: el toque da 1 s de tu producción (decisión del usuario, 2026-10-02), pero no hay mejoras de toque ni combos. Además de eso, la **cesta de la granja** (determinista, con tope de 30 min) da un empujón a quien visita a menudo.
8. **Sin monetización** ni publicidad, ni moneda premium, ni "acelerar con dinero".
9. **Sin información oculta** sobre cómo progresar: todo requisito es visible.
10. **Sin comparación social** (rankings, amigos) en la v1.

## 12. Riesgos de diseño y cosas que replantearía

Con honestidad, sabiendo que algunas cosas contradicen lo pedido:

1. **"Jugar poco rinde igual que jugar mucho" puede dejar al jugador activo sin nada que hacer.** El simulador confirma que un jugador conectado todo el día apenas avanza más rápido que uno que entra 3 veces al día. Es coherente con los pilares, pero implica que la sesión típica es corta (5 min). Si se quiere más "juego activo", la palanca correcta son **decisiones** (qué mundo priorizar, rutas del árbol), no clics. Lo acepto como identidad del juego.
2. **El contenido se agota hacia el día 50-60.** Después, todo sigue creciendo (Abono es infinito) pero sin novedades: el simulador muestra huecos de 4-6 días sin nada nuevo a partir del día ~48. Un idle vive de añadir contenido; por eso el contenido es de datos. Recomiendo tener pensado el mundo 5 antes de "terminar" la v1.
3. **Un árbol de ventajas idéntico en los 4 mundos** es fácil de implementar y de equilibrar, pero puede sentirse repetitivo. Alternativa si molesta: mantener los efectos y cambiar solo la presentación (ramas con nombres propios de cada mundo), o añadir una ventaja exclusiva por mundo en la segunda fila.
4. **La mecánica de Calma** puede leerse como "te castigo por jugar". Mitigado con: la calma empieza llena, las compras seguidas cuentan como una sola molestia y la ventana es corta. Si en pruebas reales molesta, bajar la penalización (×0,5 → ×0,75).
5. **Números muy grandes en el Bosque** (1e35 en 60 días, por la cadena polinómica). Es inherente a la mecánica; break_infinity lo soporta, pero la UI debe mostrar notación legible (02 §7).
6. **Sin sonido ni animaciones** el juego puede sentirse "muerto" en la primera impresión. Propuesta compatible con los pilares: pequeñas ilustraciones estáticas de cada raza y una barra de progreso suave hacia la siguiente compra. Nada más.
7. **El umbral de desbloqueo por plumas** hace que el ritmo de cada mundo dependa del anterior; si se toca la economía del Valle, se desplaza todo. Por eso el simulador debe ejecutarse tras cualquier cambio de datos de economía (regla en CLAUDE.md).
