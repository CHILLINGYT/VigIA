// URLhaus (abuse.ch): base de URLs que distribuyen malware.
// Docs: https://urlhaus-api.abuse.ch/ (sección "Query URL information").
// Gratis bajo "fair use"; el uso comercial requiere la API paga.

const ENDPOINT = 'https://urlhaus-api.abuse.ch/v1/url/';
const FUENTE = 'urlhaus';

// Devuelve { fuente, resultado: 'detectado' | 'no_detectado' | 'error', detalle? }.
// Igual que en Safe Browsing: ante cualquier falla, 'error' y nunca 'no_detectado'.
export async function consultarUrlhaus(url, apiKey) {
	if (!apiKey) return { fuente: FUENTE, resultado: 'error' };
	try {
		const respuesta = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'Auth-Key': apiKey },
			body: new URLSearchParams({ url }), // formulario: url=...
			signal: AbortSignal.timeout(5000),
		});
		if (!respuesta.ok) {
			console.error('urlhaus: HTTP', respuesta.status);
			return { fuente: FUENTE, resultado: 'error' };
		}

		const datos = await respuesta.json();
		if (datos.query_status === 'no_results') return { fuente: FUENTE, resultado: 'no_detectado' };
		if (datos.query_status !== 'ok') {
			console.error('urlhaus: query_status', datos.query_status);
			return { fuente: FUENTE, resultado: 'error' };
		}
		// La URL está en la base. Aunque esté "offline" la marcamos: el scoring decide cuánto pesa.
		return { fuente: FUENTE, resultado: 'detectado', detalle: [datos.threat, `url_${datos.url_status}`] };
	} catch (e) {
		console.error('urlhaus:', e.name);
		return { fuente: FUENTE, resultado: 'error' };
	}
}
