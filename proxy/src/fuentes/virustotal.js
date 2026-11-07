// VirusTotal API v3: resultado del último análisis de una URL o de un archivo por ~90 antivirus.
// Docs: https://docs.virustotal.com/reference/url-info
// API pública: 4 consultas por minuto, 500 por día, prohibido el uso comercial.

const ENDPOINT = 'https://www.virustotal.com/api/v3/';
const FUENTE = 'virustotal';

// VirusTotal identifica una URL por su base64 "url-safe" sin el relleno "=" (RFC 4648 sección 5).
// shortcut: btoa solo acepta ASCII; sirve porque new URL() ya codificó la URL (%xx y punycode).
export const idDeUrl = (url) => btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Devuelve { fuente, resultado, motores? }. resultado puede ser:
//   'detectado' | 'no_detectado' | 'sin_datos' (VirusTotal nunca la analizó) | 'error'.
// 'sin_datos' NO es lo mismo que limpio: que nadie la haya analizado no dice nada de ella.
export const consultarVirusTotal = (url, apiKey) => consultar(`urls/${idDeUrl(url)}`, apiKey);

// Archivos: VirusTotal los identifica directamente por su SHA-256 (no hace falta subir el archivo).
export const consultarVirusTotalArchivo = (sha256, apiKey) => consultar(`files/${sha256}`, apiKey);

// Las dos consultas son iguales salvo la ruta: misma respuesta, mismos errores.
async function consultar(ruta, apiKey) {
	if (!apiKey) return { fuente: FUENTE, resultado: 'error' };
	try {
		const respuesta = await fetch(ENDPOINT + ruta, {
			headers: { 'x-apikey': apiKey },
			signal: AbortSignal.timeout(5000),
		});
		if (respuesta.status === 404) return { fuente: FUENTE, resultado: 'sin_datos' };
		if (!respuesta.ok) {
			// 429 puede ser cuota del minuto o del día: el código del error dice cuál.
			const codigo = (await respuesta.json().catch(() => null))?.error?.code;
			console.error('virustotal: HTTP', respuesta.status, codigo);
			return { fuente: FUENTE, resultado: 'error' };
		}

		const stats = (await respuesta.json()).data.attributes.last_analysis_stats;
		const motores = {
			maliciosos: stats.malicious,
			sospechosos: stats.suspicious,
			total: stats.malicious + stats.suspicious + stats.harmless + stats.undetected,
		};
		// Mandamos los números: cuánto pesa "1 de 90 motores" lo decide el scoring de la app.
		const detectado = motores.maliciosos + motores.sospechosos > 0;
		return { fuente: FUENTE, resultado: detectado ? 'detectado' : 'no_detectado', motores };
	} catch (e) {
		console.error('virustotal:', e.name);
		return { fuente: FUENTE, resultado: 'error' };
	}
}
