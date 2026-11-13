import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { configurarPortapapeles } from './portapapeles.js'
import { estadoDefender, historialDefender, escanearPc } from './defender.js'
import { adjuntarArchivo, quitarAdjunto, analizarMensaje, responder } from './chat.js'

// Solo aceptamos pedidos IPC que vengan de nuestra propia página (no de otro contenido cargado).
function remitenteValido(event) {
  const origen = event.senderFrame?.url ?? ''
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return origen.startsWith(process.env['ELECTRON_RENDERER_URL'])
  }
  return origen.startsWith('file://')
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 720,
    minHeight: 560,
    title: 'VigIA',
    backgroundColor: '#EEF4F8', // el mismo fondo de la interfaz: sin destello blanco al abrir
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Seguridad (ver CLAUDE.md): la interfaz no tiene acceso a Node ni al sistema.
      // Varios ya son el valor por defecto, pero los dejamos explícitos para que se vean.
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Bloqueamos ventanas nuevas (window.open, target="_blank").
  // Más adelante, abrir links externos va a pasar por validación + confirmación del usuario.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Bloqueamos que la ventana navegue a otra página (por ejemplo, un link malicioso).
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('ar.ciberpibes.vigia')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Sin parámetros a propósito: la ruta la elige el usuario en el diálogo de Windows,
  // así la interfaz nunca puede pedir que se lea un archivo cualquiera.
  ipcMain.handle('adjuntar-archivo', (event) => {
    if (!remitenteValido(event)) return { cancelado: true }
    return adjuntarArchivo(BrowserWindow.fromWebContents(event.sender))
  })

  ipcMain.handle('quitar-adjunto', (event, id) => {
    if (remitenteValido(event) && typeof id === 'string') quitarAdjunto(id)
  })

  // chat.js valida todo lo que llega (tipos, cantidades, largos e ids de adjuntos).
  ipcMain.handle('analizar-mensaje', (event, texto, ids) => {
    if (!remitenteValido(event)) return { error: 'Pedido rechazado.' }
    return analizarMensaje(texto, ids)
  })

  ipcMain.handle('responder', (event, historial, idAnalisis) => {
    if (!remitenteValido(event)) return { error: 'Pedido rechazado.' }
    return responder(historial, idAnalisis)
  })

  ipcMain.handle('estado-defender', (event) => {
    if (!remitenteValido(event)) return null
    return estadoDefender()
  })

  // Sin parámetros: el comando de Defender es fijo, la interfaz no puede cambiar qué se ejecuta.
  ipcMain.handle('historial-defender', (event) => {
    if (!remitenteValido(event)) return null
    return historialDefender()
  })

  // La interfaz solo elige 'rapido' o 'completo' (escanearPc rechaza cualquier otra cosa):
  // nunca elige rutas ni argumentos de MpCmdRun.
  ipcMain.handle('escanear-pc', (event, tipo) => {
    if (!remitenteValido(event) || typeof tipo !== 'string') return null
    return escanearPc(tipo)
  })

  ipcMain.handle('portapapeles', async (event, activo) => {
    if (!remitenteValido(event) || typeof activo !== 'boolean') return false
    await configurarPortapapeles(event.sender, activo)
    return activo
  })

  estadoDefender() // empezamos a leerlo al iniciar, mientras se abre la ventana
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
