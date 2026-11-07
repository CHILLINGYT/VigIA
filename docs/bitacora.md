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

### 2026-11-03: Fase 1, protegimos el proxy y conectamos Google Safe Browsing

- **Qué hicimos:**
  - Al proxy en la nube le agregamos la ruta `/check-url`, que recibe un link para analizar. Antes de conectarle cualquier servicio externo, le pusimos protecciones: una contraseña de la app (token), un número al azar por cada instalación (ID) y un límite de consultas por día (50 por instalación y 400 en total). Los contadores se guardan en una base de datos gratuita de Cloudflare (D1).
  - Conectamos Google Safe Browsing, la lista de Google de sitios peligrosos. Lo probamos con las direcciones de prueba oficiales de Google y detectó el phishing, el malware y el software no deseado.
- **Decisiones y por qué:**
  - Las protecciones van **antes** que los servicios: si alguien encontraba la dirección del proxy, podía gastar nuestras consultas gratis.
  - Gian creó y cargó él mismo cada clave secreta en Cloudflare. Nunca se pegaron en el chat.
  - Si un servicio falla, el resultado es "error" y nunca "limpio": una falla no puede hacer pasar un link peligroso por seguro.
- **Problemas y cómo se resolvieron:**
  - La versión vieja de Safe Browsing (v4) está "deprecada" y la nueva (v5) responde en un formato binario de Google (protobuf), no en texto. Pedirle texto dio error. Escribimos un "traductor" de unas 30 líneas y comprobamos que lee bien con las direcciones de prueba de Google (ver `decisiones.md`).
  - Gian corrió dos veces un comando de `wrangler` desde la carpeta equivocada y dio error. Aprendimos a mirar en qué carpeta estamos parados antes de correr un comando.
- **Qué aprendimos:**
  - Leer la documentación actual antes de programar: las APIs cambian.
  - Probar con datos reales, no solo con simulaciones: el problema del formato binario apareció recién al probar de verdad.
- **Próximo paso:** sumar URLhaus y VirusTotal.

### 2026-11-07: terminamos la Fase 1 (links y portapapeles) y empezamos la Fase 2 (archivos)

- **Qué hicimos:**
  - **Proxy:** sumamos URLhaus (lista de links que distribuyen virus) y VirusTotal (unos 90 antivirus a la vez), y una caché de 15 minutos para no repetir consultas. Agregamos la ruta `/check-hash`, que analiza archivos usando solo su "huella digital" (SHA-256) en MalwareBazaar y VirusTotal.
  - **App:** limpia los links (les saca los datos de rastreo), detecta dominios que imitan marcas argentinas (por ejemplo `mercadopag0.com`) y calcula el veredicto con reglas fijas: peligroso, sospechoso, desconocido o sin detecciones. Tiene la pantalla para pegar un link, la opción de revisar los links que copiás (portapapeles), el botón para analizar un archivo y la detección del estado de Microsoft Defender.
  - Probamos todo con casos reales: el phishing de prueba de Google sale "peligroso", un link viejo de malware (Emotet) sale "peligroso" gracias a URLhaus, un dominio que imita a Mercado Pago sale "sospechoso" y el archivo de prueba EICAR es detectado por 66 de 68 antivirus.
- **Decisiones y por qué:**
  - **Sacamos OpenPhish del proyecto.** Era gratis, pero sus términos de uso no permiten usarlo para detectar amenazas ni mostrarles los resultados a otras personas sin permiso escrito. Lo leímos antes de programar y lo descartamos (ver `decisiones.md`).
  - **El veredicto lo deciden reglas fijas y escritas, no la IA.** Por ejemplo: si Google o URLhaus lo detectan, es peligroso; si lo marcan solo 1 o 2 antivirus, es sospechoso (puede ser un falso positivo).
  - **"No sabemos" no es lo mismo que "seguro".** Si nadie conoce un link o un archivo, la app dice "Sin información suficiente". Por eso la mayoría de los archivos personales (fotos, documentos) dan ese resultado: nadie los subió nunca a esas bases. Defender va a cubrir ese caso en el próximo paso.
  - **De la PC sale solo la huella del archivo, nunca el archivo.** Y el archivo lo elige la persona en la ventana de Windows: la pantalla de la app no puede pedir que se lea cualquier archivo.
  - **El portapapeles empieza apagado**, muestra un aviso cuando está prendido, usa solo los links y no analiza nada hasta que la persona toca "Analizar".
- **Problemas y cómo se resolvieron:**
  - **El portapapeles no detectaba nada y después la app se colgaba.** Fuimos descartando causas de a una hasta encontrar que, en la versión de Electron que usamos (44), leer el portapapeles pasó a ser "asíncrono" (hay que esperar la respuesta) y nuestro código lo usaba como en versiones viejas. En el camino también fallaron varios scripts de prueba nuestros, no la app.
  - **En una prueba automática se analizó por error un PDF de Gian** ("CURSO DE EDUCACIÓN VIAL_AUTO.pdf") en vez del archivo de prueba: el texto que mandamos a la ventana de Windows no entró donde debía. Solo salió la huella del archivo; el PDF no se abrió ni se subió. Dejamos de automatizar esa ventana y Gian la probó a mano. El diseño de "solo sale la huella" protegió el archivo incluso ante el error.
  - **La lista pública de URLhaus ya no existe sin clave** y el sitio bloquea los programas automáticos. Para probar usamos un link de ejemplo de su propia documentación.
  - **No estaba claro si la caché funcionaba** en la dirección gratuita de Cloudflare (workers.dev). Lo probamos y funciona: la segunda consulta tarda 0,6 segundos en vez de 1,6.
  - **Suponíamos que Defender estaba en modo pasivo** porque Gian tiene Malwarebytes. Al revisarlo, está activo: la protección de Malwarebytes figura apagada.
  - Varios tests fallaron por errores en los tests mismos (por ejemplo, esperaban un resultado equivocado) y uno por un nombre de variable repetido. Los tests los detectaron antes de publicar.
- **Qué aprendimos:**
  - Leer los términos de uso de cada servicio, no solo la documentación técnica.
  - Ninguna fuente sola alcanza: en las pruebas, cada una detectó cosas que las otras no.
  - Las pruebas automáticas sobre la PC de una persona pueden tocar sus cosas: hay que hacerlas en lugares aislados o a mano.
  - Probar en vez de suponer (Defender, la caché, el formato de Safe Browsing).
- **Próximo paso:** escanear archivos con Defender (`MpCmdRun`) y comprobar sus códigos de salida con el archivo de prueba EICAR. También subir el repositorio a GitHub como copia de respaldo y que el equipo de investigación verifique la lista de dominios oficiales de las marcas.
