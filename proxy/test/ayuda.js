import { SELF } from 'cloudflare:test';

// Hace un pedido a /check-url como lo haría la app. Se puede pisar cualquier encabezado.
export function checkUrl(cuerpo, { token = 'token-de-prueba', id = crypto.randomUUID() } = {}) {
	const headers = { 'Content-Type': 'application/json' };
	if (token !== null) headers.Authorization = `Bearer ${token}`;
	if (id !== null) headers['X-Instalacion-Id'] = id;
	return SELF.fetch('http://example.com/check-url', {
		method: 'POST',
		headers,
		body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
	});
}
