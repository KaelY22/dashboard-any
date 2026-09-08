# Dashboard Any Moon's 🌙

Página de fanpage para la creadora **Any Moon's** — fandubs, covers y su comunidad, todo en un solo lugar.

Dashboard oficial de contenido: muestra los fandubs por YouTube, contenido "clandestino" que no puede estar en la plataforma, redes sociales y el estado del servidor de Discord. Todo el contenido se administra desde un **panel privado** y se sirve por una API con Cloudflare Workers + D1.

- **Producción**: https://anymoons.pages.dev
- **API**: `api-anymoons.kael-iv22.workers.dev`
- **DB**: Cloudflare D1 (`anymoons-db`)
- **Plataforma**: Cloudflare Pages + Worker + D1

---

## Características

- **Fandubs**: catálogo de fan-doblajes de videos de YouTube con filtros por etiqueta.
- **Fandubs clandestinos**: contenido exclusivo de la comunidad (no apto para plataformas) con reproductor propio.
- **Redes sociales**: enlaces a las redes de la creadora con iconos reconocibles.
- **Widget de Discord**: estado del servidor en vivo (miembros online, invitación y avatares).
- **Avatar global**: logo/perfil de la creadora, configurable desde el panel.
- **Panel de administración privado**: CRUD completo de fandubs, enlaces, clandestinos y avatar.

---

## Stack

| Herramienta | Uso |
|---|---|
| HTML + Tailwind CSS + JS vanilla | Frontend (CDN de Tailwind, sin build) |
| Cloudflare Pages | Deploy del frontend |
| Cloudflare Workers | API (`api-anymoons`) |
| Cloudflare D1 | Fandubs, enlaces, clandestinos y config |

## Puesta en marcha

Frontend sin build: sírvelo estático o abre `index.html`.

API:

```bash
# Configurar secretos (una vez)
wrangler secret put ADMIN_PASSWORD

# Deploy del Worker (con su D1)
wrangler deploy

# Deploy del frontend a Pages
wrangler pages deploy . --project-name=anymoons
```

La conig del worker (binding D1, rutas) vive en `wrangler.toml`.

---

## Estructura

```
├── index.html           Portada: fandubs, clandestinos, redes y Discord
├── video.html           Reproductor de contenido clandestino
├── admin.html           Panel de administración privado
├── css/style.css        Estilos (dark con glass en capa funcional)
├── js/
│   ├── config.js        API URL
│   ├── public.js        Vistas públicas + widgets
│   ├── admin.js         CRUD del panel
│   └── video.js         Reproductor
└── worker/
    ├── worker.js        API completa (público + admin)
    └── wrangler.toml    Config del deploy
```

## API del Worker

| Endpoint | Qué hace |
|---|---|
| `/api/games` | Lista pública de fandubs |
| `/api/clandestine` | Contenido clandestino |
| `/api/links` | Redes sociales |
| `/api/avatar` | Avatar global |
| `/api/admin/*` | CRUD privado protegido con `X-Admin-Password` |

---

## Licencia

MIT — ver [LICENSE](LICENSE).

> Hecho con la ayuda de un compañero de código IA. ✨