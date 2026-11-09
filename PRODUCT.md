# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(App de escritorio para Windows 10/11 hecha con Electron: la interfaz es web, en una ventana propia.)

## Users

Cualquier persona, sin conocimientos técnicos (confirmado por Gian, 2026-11-08). La situación típica: recibió un link por WhatsApp o un mail, descargó un archivo, o le llegó algo raro, y no sabe si abrirlo. Quiere una respuesta clara y qué hacer, sin jerga.

Audiencias de evaluación: jurados de exposiciones escolares y de EkoParty 2027 (público experto en seguridad), que van a revisar el código y las decisiones.

## Product Purpose

VigIA es un asistente de ciberseguridad con forma de chat. La persona le escribe, le pega un link o le adjunta un archivo ("analizame este archivo y decime si tiene malware") y VigIA responde con un veredicto y una explicación en lenguaje simple.

Éxito: la persona entiende si algo es peligroso y qué hacer, y nunca recibe una falsa sensación de seguridad.

## Positioning

"La IA no detecta: orquesta y explica." La detección la hacen motores reales (Google Safe Browsing, URLhaus, MalwareBazaar, VirusTotal, Microsoft Defender y reglas propias) y el veredicto lo calcula código determinístico. La IA solo conversa y explica un veredicto ya decidido: si la IA falla o es manipulada, el veredicto no cambia. Un chatbot genérico no puede afirmar esto.

## Operating Context

- Ventana de escritorio en Windows, usada en el momento de la duda (con el link o el archivo recién recibido).
- De la PC solo salen hashes SHA-256 y URLs sin parámetros de rastreo; los archivos nunca se suben ni se abren.
- El portapapeles se revisa solo si la persona lo activa, con indicador visible.
- Las claves de las APIs viven en un proxy de Cloudflare, nunca en la app.

## Capabilities and Constraints

- Hoy: análisis de links (Safe Browsing, URLhaus, VirusTotal, dominios parecidos a marcas argentinas), análisis de archivos por hash (MalwareBazaar, VirusTotal), detección del estado de Defender, portapapeles opt-in.
- En desarrollo: chat con IA (Groq, con capa para cambiar a Gemini), escaneo con Defender, análisis de mails, vigilancia de Descargas.
- Veredictos: peligroso, sospechoso, desconocido, sin detecciones. Nunca "seguro" ni "100%": como mucho "no encontramos amenazas conocidas".
- Abierto: Groq exige 18+ y no es para uso de consumidores según su contrato; falta definir quién es titular de la cuenta.
- Presupuesto USD 0; uso no comercial; un solo programador (JavaScript, React).

## Brand Commitments

- Nombre: VigIA. Equipo: Ciberpibes (escuela secundaria, Argentina).
- Sin logo ni colores previos: identidad nueva a crear (confirmado por Gian, 2026-11-08).
- Voz: español rioplatense con voseo, simple y directo; atribuye cada fuente (por ejemplo, "Según Google Safe Browsing...") y nunca afirma certeza.

## Evidence on Hand

- Resultados reales de pruebas (docs/bitacora.md): phishing de prueba de Google → peligroso; URL de Emotet → peligroso por URLhaus; EICAR → 66 de 68 antivirus.
- No hay usuarios reales, testimonios ni métricas: no inventarlos.

## Product Principles

1. Nunca una falsa sensación de seguridad: "no sabemos" se dice como "no sabemos".
2. El veredicto es de las reglas, no de la IA; la interfaz lo muestra aparte de la explicación.
3. Privacidad por diseño: lo mínimo sale de la PC, y la persona lo puede ver.
4. Lenguaje de la persona, no del experto; cada afirmación con su fuente.
5. Todo tiene que poder explicarse frente a un jurado experto.

## Accessibility & Inclusion

Usuarios de cualquier edad y nivel técnico: texto legible, contraste suficiente, el veredicto nunca transmitido solo por color, todo usable con teclado.
