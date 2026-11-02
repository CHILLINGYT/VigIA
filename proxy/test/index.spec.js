import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('vigia-proxy', () => {
	it('GET / responde que está vivo', async () => {
		const response = await SELF.fetch('http://example.com/');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ servicio: 'vigia-proxy', estado: 'ok' });
	});

	it('cualquier otra ruta devuelve 404 (no es un proxy abierto)', async () => {
		const response = await SELF.fetch('http://example.com/https://google.com');
		expect(response.status).toBe(404);
	});

	it('POST / también devuelve 404', async () => {
		const response = await SELF.fetch('http://example.com/', { method: 'POST' });
		expect(response.status).toBe(404);
	});
});
