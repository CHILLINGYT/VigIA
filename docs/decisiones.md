# Decisiones técnicas

Cada decisión importante: contexto, opciones consideradas, decisión y consecuencias.

## 2026-11-02: Plantilla de la app de escritorio (electron-vite)

- **Contexto:** necesitábamos una app Electron con React, en JavaScript, que se pueda empaquetar como instalador de Windows.
- **Opciones consideradas:** armar todo a mano (Electron + Vite + React por separado) o usar la plantilla oficial de electron-vite (`@quick-start/create-electron`, plantilla `react`).
- **Decisión:** usamos la plantilla oficial, porque ya trae la compilación del proceso principal, el preload y la interfaz, y el instalador con electron-builder. No activamos el auto-updater (no lo necesitamos y suma superficie de ataque).
- **Consecuencias:**
  - La estructura queda como `app/src/main`, `app/src/preload` y `app/src/renderer` (con un `src/` de más respecto del plan original). La dejamos así porque es la convención de la herramienta; cambiarla obliga a configurar rutas a mano. La lógica pura va a ir en `app/src/core`.
  - Corregimos defaults inseguros de la plantilla: tenía `sandbox: false`, un preload que exponía todo `ipcRenderer` a la interfaz (`@electron-toolkit/preload`, que desinstalamos) y abría en el navegador cualquier link sin preguntar. Ahora la interfaz solo ve `window.vigia` (vacío por ahora), y las ventanas nuevas y la navegación están bloqueadas.

## 2026-11-03: Safe Browsing v5 con decodificador de protobuf propio

- **Contexto:** la v4 de Safe Browsing (que responde en JSON) está deprecada. La v5 (`urls:search`) solo responde en protobuf, un formato binario: probamos pedirle JSON con `alt=json` y Google contestó "400 Unsupported Output Format". Google no publica el archivo `.proto` con la estructura de la respuesta.
- **Opciones consideradas:**
  1. Volver a la v4: simple, pero deprecada y podría apagarse antes de EkoParty 2027.
  2. Instalar la librería `protobufjs`: suma una dependencia y aun así había que deducir los números de campo.
  3. Escribir un decodificador mínimo propio (unas 30 líneas, sin dependencias).
- **Decisión:** opción 3. Los números de campo los verificamos con las URLs de prueba oficiales de Google: phishing → `SOCIAL_ENGINEERING`, malware → `MALWARE` + `POTENTIALLY_HARMFUL_APPLICATION`, unwanted → `UNWANTED_SOFTWARE`, example.com → sin amenazas.
- **Consecuencias:** si la respuesta trae algo inesperado (campos desconocidos, datos cortados, una amenaza sin tipo), el resultado es `error` y nunca "sin detecciones". Si Google cambia el formato, VigIA lo muestra como falla y no deja pasar un link peligroso como limpio. Google ve la URL completa; la alternativa privada (`hashes:search`) queda para más adelante.
