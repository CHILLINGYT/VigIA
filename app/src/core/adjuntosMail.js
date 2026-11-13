// Señales de adjuntos riesgosos en un mail. Lógica pura: recibe los adjuntos que leyó postal-mime
// ({ filename, content }) y devuelve señales [{ tipo, detalle }]. Nunca abre ni ejecuta nada:
// de un zip solo lee el índice (la lista de nombres), sin descomprimir.

// Programas o scripts que se ejecutan con doble clic.
const EJECUTABLES = [
  'exe', 'scr', 'com', 'pif', 'bat', 'cmd', 'msi', 'msix', 'appx', 'lnk', 'hta', 'cpl',
  'js', 'jse', 'vbs', 'vbe', 'wsf', 'wsh', 'ps1', 'jar', 'reg'
] // prettier-ignore
// Abren una página (posiblemente falsa) sin pasar por un link del mail.
const PAGINAS = ['html', 'htm', 'shtml', 'xhtml', 'svg']
// Imágenes de disco: al abrirlas, Windows no muestra el aviso de "archivo de Internet".
const DISCOS = ['iso', 'img', 'vhd', 'vhdx']
const MACROS = ['docm', 'dotm', 'xlsm', 'xltm', 'xlam', 'pptm', 'potm', 'ppsm']
// Formatos de Office modernos: son un zip, y si traen macros adentro hay un "vbaProject.bin".
const OFFICE = ['docx', 'xlsx', 'pptx']
// Extensiones que alguien usaría para disimular: "factura.pdf.exe".
const DISFRACES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt', 'zip']

const extension = (nombre) => /\.([a-z0-9]{1,8})$/i.exec(nombre)?.[1]?.toLowerCase() ?? ''

// Lee el índice de un zip (el "directorio central", al final del archivo).
// Devuelve { nombres, conContrasena } o null si no es un zip válido.
const MAXIMO_ENTRADAS = 2000
export function leerIndiceZip(contenido) {
  const b = contenido instanceof Uint8Array ? contenido : new Uint8Array(contenido ?? [])
  if (b.length < 22) return null
  const vista = new DataView(b.buffer, b.byteOffset, b.byteLength)
  // El final del zip ("PK\5\6") está en los últimos 22 bytes + hasta 65535 de comentario.
  let fin = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (vista.getUint32(i, true) === 0x06054b50) {
      fin = i
      break
    }
  }
  if (fin < 0) return null
  const cantidad = Math.min(vista.getUint16(fin + 10, true), MAXIMO_ENTRADAS)
  let p = vista.getUint32(fin + 16, true)
  const nombres = []
  let conContrasena = false
  for (let n = 0; n < cantidad; n++) {
    // Cada entrada empieza con "PK\1\2"; si no, el zip está roto o es una trampa: paramos.
    if (p + 46 > b.length || vista.getUint32(p, true) !== 0x02014b50) return null
    if (vista.getUint16(p + 8, true) & 1) conContrasena = true // bit 0: archivo cifrado
    const largoNombre = vista.getUint16(p + 28, true)
    if (p + 46 + largoNombre > b.length) return null
    nombres.push(new TextDecoder().decode(b.subarray(p + 46, p + 46 + largoNombre)))
    p += 46 + largoNombre + vista.getUint16(p + 30, true) + vista.getUint16(p + 32, true)
  }
  return { nombres, conContrasena }
}

function senalesDeUno(nombre, contenido) {
  const ext = extension(nombre)
  const partes = nombre.toLowerCase().split('.')
  const anterior = partes.length > 2 ? partes.at(-2) : ''

  if (EJECUTABLES.includes(ext)) {
    return DISFRACES.includes(anterior)
      ? [
          {
            tipo: 'adjunto_disfrazado',
            detalle: `El adjunto "${nombre}" parece un .${anterior}, pero es un programa (.${ext}).`
          }
        ]
      : [
          {
            tipo: 'adjunto_ejecutable',
            detalle: `El adjunto "${nombre}" es un programa (.${ext}).`
          }
        ]
  }
  if (PAGINAS.includes(ext)) {
    return [
      {
        tipo: 'adjunto_pagina',
        detalle: `El adjunto "${nombre}" abre una página: puede ser un formulario falso para robar datos.`
      }
    ]
  }
  if (DISCOS.includes(ext)) {
    return [
      {
        tipo: 'adjunto_disco',
        detalle: `El adjunto "${nombre}" es una imagen de disco (.${ext}), un truco común para esconder programas.`
      }
    ]
  }
  if (MACROS.includes(ext)) {
    return [
      {
        tipo: 'adjunto_macros',
        detalle: `El adjunto "${nombre}" es un documento de Office con macros (pequeños programas).`
      }
    ]
  }
  if (ext === 'zip' || OFFICE.includes(ext)) {
    const indice = leerIndiceZip(contenido)
    if (!indice) return []
    const senales = []
    if (ext === 'zip' && indice.conContrasena) {
      senales.push({
        tipo: 'zip_con_contrasena',
        detalle: `El adjunto "${nombre}" está protegido con contraseña: los antivirus no pueden revisarlo.`
      })
    }
    if (OFFICE.includes(ext) && indice.nombres.some((n) => /(^|\/)vbaProject\.bin$/i.test(n))) {
      senales.push({
        tipo: 'adjunto_macros',
        detalle: `El adjunto "${nombre}" trae macros escondidas aunque su nombre no lo diga.`
      })
    }
    // Lo que hay adentro del zip, con las mismas reglas (sin mirar zips dentro de zips).
    if (ext === 'zip') {
      for (const interno of indice.nombres) {
        // Las carpetas terminan en "/" (o en "\" si el zip lo hizo Windows).
        const archivo = interno.split(/[\\/]/).pop()
        if (!archivo) continue
        for (const s of senalesDeUno(archivo, null)) {
          const detalle = s.detalle[0].toLowerCase() + s.detalle.slice(1)
          senales.push({ tipo: s.tipo, detalle: `Dentro de "${nombre}", ${detalle}` })
        }
      }
    }
    return senales
  }
  return []
}

// adjuntos: mail.attachments de postal-mime. Devuelve señales [{ tipo, detalle }].
export function senalesDeAdjuntos(adjuntos) {
  if (!Array.isArray(adjuntos)) return []
  return adjuntos.flatMap((a) =>
    typeof a?.filename === 'string' && a.filename ? senalesDeUno(a.filename, a.content) : []
  )
}
