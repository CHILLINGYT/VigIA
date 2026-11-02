// Proxy de VigIA (Cloudflare Worker).
// Fase 0: solo responde que está vivo. En la Fase 1 se agregan /check-url, /check-hash y /chat.
// Cualquier otra ruta devuelve 404: este Worker NO es un proxy abierto.

export default {
	async fetch(request) {
		const url = new URL(request.url);

		if (request.method === 'GET' && url.pathname === '/') {
			return Response.json({ servicio: 'vigia-proxy', estado: 'ok' });
		}

		return Response.json({ error: 'no encontrado' }, { status: 404 });
	},
};
