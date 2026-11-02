# Bitácora de VigIA

Registro de cada sesión de trabajo: qué hicimos, qué decidimos, qué falló y qué aprendimos.

### 2026-11-02: Fase 0, armamos la base del proyecto

- **Qué hicimos:**
  - Revisamos las herramientas de la PC: Node 26, npm 11 y Git 2.56 ya estaban instalados.
  - Creamos el repositorio de Git (el "historial" del proyecto) y la carpeta `docs/`.
  - Creamos la app de escritorio (Electron + React) en `app/`. Por ahora abre una ventana que dice "VigIA — Hola, Ciberpibes".
  - Creamos el proxy en la nube (un Cloudflare Worker) en `proxy/` y lo publicamos en https://vigia-proxy.vigia-proxy.workers.dev. Por ahora solo responde "estoy vivo".
  - Hicimos dos commits: uno para la app y otro para el proxy.
- **Decisiones y por qué:**
  - Usamos plantillas oficiales (electron-vite para la app, create-cloudflare para el proxy) en vez de armar todo a mano: son más confiables y ahorran tiempo. El detalle está en `decisiones.md`.
  - No activamos la actualización automática de la app: no la necesitamos y sería una puerta más para atacarla.
  - El proxy contesta "no encontrado" (404) a todo lo que no sea la ruta principal. Así nadie lo puede usar como "puente" para llegar a otras webs.
- **Problemas y cómo se resolvieron:**
  - El archivo `docs/investigacion.md` no existía. Lo creamos vacío para que lo complete el equipo de investigación.
  - La plantilla de Electron venía con opciones inseguras: le daba a la ventana acceso a funciones internas del sistema y abría cualquier link sin preguntar. Las corregimos y lo comprobamos "desde afuera": nos conectamos a la ventana y verificamos que no puede usar Node ni navegar a otra página.
  - Después de publicar el proxy, las primeras pruebas fallaron porque la dirección nueva todavía no estaba registrada en internet (DNS). Esperamos unos segundos y funcionó.
  - Como la cuenta de Cloudflare era nueva, se registró solo el subdominio "vigia-proxy" y por eso la dirección repite el nombre. Se puede cambiar desde el panel de Cloudflare.
- **Qué aprendimos:**
  - Las plantillas priorizan la comodidad y no la seguridad: siempre hay que revisar sus opciones antes de usarlas.
  - Un "proxy" mal hecho puede usarlo cualquiera para cualquier cosa. Por eso el nuestro solo responde a rutas que habilitamos nosotros.
  - Hay que probar las cosas de verdad, no solo suponer que andan: por eso hicimos tests y pruebas contra la dirección publicada.
- **Próximo paso:** subir el repositorio a GitHub como copia de respaldo. Después, empezar la Fase 1: el endpoint `/check-url` en el proxy, empezando por el ID de instalación y el límite de consultas, antes de conectar cualquier API.
