# Decisiones técnicas

Cada decisión importante: contexto, opciones consideradas, decisión y consecuencias.

## 2026-11-02: Plantilla de la app de escritorio (electron-vite)

- **Contexto:** necesitábamos una app Electron con React, en JavaScript, que se pueda empaquetar como instalador de Windows.
- **Opciones consideradas:** armar todo a mano (Electron + Vite + React por separado) o usar la plantilla oficial de electron-vite (`@quick-start/create-electron`, plantilla `react`).
- **Decisión:** usamos la plantilla oficial, porque ya trae la compilación del proceso principal, el preload y la interfaz, y el instalador con electron-builder. No activamos el auto-updater (no lo necesitamos y suma superficie de ataque).
- **Consecuencias:**
  - La estructura queda como `app/src/main`, `app/src/preload` y `app/src/renderer` (con un `src/` de más respecto del plan original). La dejamos así porque es la convención de la herramienta; cambiarla obliga a configurar rutas a mano. La lógica pura va a ir en `app/src/core`.
  - Corregimos defaults inseguros de la plantilla: tenía `sandbox: false`, un preload que exponía todo `ipcRenderer` a la interfaz (`@electron-toolkit/preload`, que desinstalamos) y abría en el navegador cualquier link sin preguntar. Ahora la interfaz solo ve `window.vigia` (vacío por ahora), y las ventanas nuevas y la navegación están bloqueadas.
