# Cerditos

Juego incremental tranquilo sobre granjas de cerditos. Ver [CLAUDE.md](CLAUDE.md) para las reglas del proyecto y [docs/05-guia-del-juego.md](docs/05-guia-del-juego.md) para la guía de juego.

```bash
npm install
npm run dev        # desarrollo
npm test           # tests
npm run build      # typecheck + build de producción (incluye la PWA)
npm run preview    # sirve el build
```

## Probarlo en el móvil

### A) Rápido, en tu red wifi (solo el juego, sin instalarlo)

1. Móvil y PC en la misma wifi.
2. En el PC: `npm run build && npm run preview -- --host` (o `npm run dev -- --host`).
3. En el móvil, abre la dirección "Network" que imprime Vite (algo como `http://192.168.1.17:4173`).
4. Si no carga, el cortafuegos de Windows está bloqueando el puerto: permite Node.js en redes privadas.

Aquí el juego funciona y guarda la partida, pero **no es instalable ni funciona sin conexión**: los service workers exigen HTTPS (salvo en `localhost`).

### B) Instalable, con HTTPS

Dos caminos:

- **Túnel temporal** (para probar ya): `npm run build && npm run preview`, y en otra terminal `npx cloudflared tunnel --url http://localhost:4173` (o `ngrok http 4173`). Abre en el móvil la URL `https://…` que te dé.
- **GitHub Pages** (permanente): sube el repo a GitHub, en *Settings → Pages* elige *GitHub Actions* como origen y haz push a `main`: el flujo [.github/workflows/deploy.yml](.github/workflows/deploy.yml) compila y publica en `https://<usuario>.github.io/<repo>/`. (`base: './'` hace que funcione en ese subdirectorio.)

### Instalar en iPhone

1. Abre la URL HTTPS **en Safari**.
2. Compartir → **Añadir a pantalla de inicio**.
3. Ábrelo desde el icono: se ve a pantalla completa y funciona sin conexión.

> **La app instalada tiene su propio almacenamiento**, separado del de Safari. Si ya jugaste en Safari: en Ajustes → *Guardar partida en texto* genera el código, y en la app instalada pégalo en *Cargar partida desde texto*.

### Instalar en Android / escritorio (Chrome)

Menú ⋮ → **Instalar aplicación** (o el icono de instalar en la barra de direcciones).

## Lista de comprobación manual (hito 10)

- [ ] Chrome → DevTools → Lighthouse → "Progressive Web App": instalable.
- [ ] iPhone: se abre a pantalla completa, respeta el notch y la barra inferior.
- [ ] Modo avión: la app abre y sigue funcionando; al volver, el resumen de ausencia sale bien.
- [ ] No pide ningún permiso (ni notificaciones, ni ubicación).
- [ ] Tras publicar una versión nueva, se aplica sola la siguiente vez que se abre (sin avisos).

## Iconos

`node tools/make-icons.ts` regenera `public/icons/*.png` y `public/favicon.svg` (un cerdito dibujado por código, sin dependencias).
