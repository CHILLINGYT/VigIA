// Tests de VirusTotal con la API simulada.
import { it, expect, vi, afterEach } from 'vitest';
import { consultarVirusTotal, consultarVirusTotalArchivo, idDeUrl } from '../src/fuentes/virustotal.js';

const simularVT = (respuesta) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta);
const reporte = (stats) =>
	Response.json({ data: { attributes: { last_analysis_stats: { harmless: 0, malicious: 0, suspicious: 0, undetected: 0, timeout: 0, ...stats } } } });

afterEach(() => vi.restoreAllMocks());

it('arma el ID como base64 url-safe sin "="', () => {
	// Ejemplo calculado con base64.urlsafe_b64encode de Python, como en la documentación.
	expect(idDeUrl('http://www.somedomain.com/this/is/my/url')).toBe('aHR0cDovL3d3dy5zb21lZG9tYWluLmNvbS90aGlzL2lzL215L3VybA');
	// En base64 normal termina en "Pz8/": la versión url-safe cambia "/" por "_".
	expect(idDeUrl('https://a.test/???')).toBe('aHR0cHM6Ly9hLnRlc3QvPz8_');
});

it('marca "detectado" con la cantidad de motores', async () => {
	simularVT(reporte({ malicious: 5, suspicious: 1, harmless: 60, undetected: 24 }));
	expect(await consultarVirusTotal('http://malo.test/', 'key-falsa')).toEqual({
		fuente: 'virustotal',
		resultado: 'detectado',
		motores: { maliciosos: 5, sospechosos: 1, total: 90 },
	});
});

it('marca "no_detectado" si ningún motor la marca', async () => {
	simularVT(reporte({ harmless: 70, undetected: 20 }));
	expect((await consultarVirusTotal('https://example.com/', 'key-falsa')).resultado).toBe('no_detectado');
});

it('marca "sin_datos" (no "no_detectado") si VirusTotal nunca la analizó', async () => {
	simularVT(Response.json({ error: { code: 'NotFoundError' } }, { status: 404 }));
	expect((await consultarVirusTotal('https://nueva.test/', 'key-falsa')).resultado).toBe('sin_datos');
});

it('marca "error" si se agota la cuota, la red falla o la respuesta es rara', async () => {
	simularVT(Response.json({ error: { code: 'QuotaExceededError' } }, { status: 429 }));
	expect((await consultarVirusTotal('https://example.com/', 'key-falsa')).resultado).toBe('error');
	vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('sin conexión'));
	expect((await consultarVirusTotal('https://example.com/', 'key-falsa')).resultado).toBe('error');
	simularVT(Response.json({ data: {} }));
	expect((await consultarVirusTotal('https://example.com/', 'key-falsa')).resultado).toBe('error');
});

it('sin API key no llama a VirusTotal; con key la manda en x-apikey', async () => {
	const fetch = simularVT(reporte({}));
	expect((await consultarVirusTotal('https://example.com/', undefined)).resultado).toBe('error');
	expect(fetch).not.toHaveBeenCalled();
	await consultarVirusTotal('https://example.com/', 'key-falsa');
	const [endpoint, opciones] = fetch.mock.calls[0];
	expect(endpoint).toBe('https://www.virustotal.com/api/v3/urls/aHR0cHM6Ly9leGFtcGxlLmNvbS8');
	expect(opciones.headers['x-apikey']).toBe('key-falsa');
});

it('archivos: consulta /files/<sha256> y responde igual que para URLs', async () => {
	const fetch = simularVT(reporte({ malicious: 60, harmless: 0, undetected: 10 }));
	const hash = 'b'.repeat(64);
	expect(await consultarVirusTotalArchivo(hash, 'key-falsa')).toEqual({
		fuente: 'virustotal',
		resultado: 'detectado',
		motores: { maliciosos: 60, sospechosos: 0, total: 70 },
	});
	expect(fetch.mock.calls[0][0]).toBe(`https://www.virustotal.com/api/v3/files/${hash}`);
	simularVT(Response.json({ error: { code: 'NotFoundError' } }, { status: 404 }));
	expect((await consultarVirusTotalArchivo(hash, 'key-falsa')).resultado).toBe('sin_datos');
});
