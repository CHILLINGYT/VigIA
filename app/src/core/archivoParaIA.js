// Cómo le nombramos un archivo a la IA. Privacidad (CLAUDE.md: de la PC salen solo hashes y URLs):
// el nombre puede tener datos personales (por ejemplo "Trabajo práctico (Nombre Apellido).pdf"),
// así que a la IA le llega solo el tipo: "un archivo .pdf". En la pantalla el nombre se sigue viendo.
export function archivoParaIA(nombre) {
  const extension = /\.([a-z0-9]{1,8})$/i.exec(String(nombre ?? ''))?.[1]
  return extension ? `un archivo .${extension.toLowerCase()}` : 'un archivo'
}
