import { SELF, env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { checkUrl } from './ayuda.js';

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

describe('rutas', () => {
	it('GET / responde que está vivo', async () => {
		const response = await SELF.fetch('http://example.com/');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ servicio: 'vigia-proxy', estado: 'ok' });
	});

	it('cualquier otra ruta devuelve 404 (no es un proxy abierto)', async () => {
		const response = await SELF.fetch('http://example.com/https://google.com');
		expect(response.status).toBe(404);
	});

	it('GET /check-url devuelve 404 (solo se acepta POST)', async () => {
		const response = await SELF.fetch('http://example.com/check-url');
		expect(response.status).toBe(404);
	});
});

describe('POST /check-url', () => {
	it('acepta una URL válida', async () => {
		const response = await checkUrl({ url: 'https://example.com/hola' });
		expect(response.status).toBe(200);
		// En los tests no hay API keys, así que cada fuente responde 'error' sin salir a internet.
		expect(await response.json()).toEqual({
			url: 'https://example.com/hola',
			fuentes: [{ fuente: 'google_safe_browsing', resultado: 'error' }],
		});
	});

	it('rechaza sin token, o con token incorrecto', async () => {
		expect((await checkUrl({ url: 'https://example.com' }, { token: null })).status).toBe(401);
		expect((await checkUrl({ url: 'https://example.com' }, { token: 'token-de-prueba-mal' })).status).toBe(401);
	});

	it('rechaza sin ID de instalación, o con ID mal formado', async () => {
		expect((await checkUrl({ url: 'https://example.com' }, { id: null })).status).toBe(400);
		expect((await checkUrl({ url: 'https://example.com' }, { id: 'global' })).status).toBe(400);
	});

	it('rechaza cuerpos que no son JSON o que son demasiado grandes', async () => {
		expect((await checkUrl('esto no es json')).status).toBe(400);
		expect((await checkUrl({ url: 'https://example.com/' + 'a'.repeat(5000) })).status).toBe(413);
	});

	it('rechaza URLs inválidas o peligrosas', async () => {
		for (const url of [undefined, 123, '', 'no-es-una-url', 'javascript:alert(1)', 'file:///C:/Windows', 'https://example.com/' + 'a'.repeat(2100)]) {
			const response = await checkUrl({ url });
			expect(response.status, `url: ${String(url).slice(0, 40)}`).toBeGreaterThanOrEqual(400);
		}
	});
});
