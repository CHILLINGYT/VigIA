// Tests de Safe Browsing con la API de Google simulada: no gastan cuota ni necesitan internet.
// Las respuestas se arman a mano en protobuf, igual que las que manda Google.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { consultarSafeBrowsing, decodificarRespuesta } from '../src/fuentes/safebrowsing.js';

// Mini codificador de protobuf, solo para armar respuestas de prueba.
const varint = (n) => {
	const b = [];
	while (n > 127) {
		b.push((n & 127) | 128);
		n >>>= 7;
	}
	return [...b, n];
};
const bloque = (numero, bytes) => [...varint(numero * 8 + 2), ...varint(bytes.length), ...bytes];
const numero = (n, valor) => [...varint(n * 8), ...varint(valor)];
const texto = (s) => [...new TextEncoder().encode(s)];
const protobuf = (...partes) => new Uint8Array(partes.flat());

// ThreatUrl { 1: url, 2: tipos empaquetados }
const amenaza = (url, ...tipos) => bloque(1, [...bloque(1, texto(url)), ...bloque(2, tipos.flatMap(varint))]);
const duracion = bloque(2, numero(1, 300)); // cacheDuration { seconds: 300 }

describe('decodificarRespuesta', () => {
	it('respuesta vacía = sin amenazas', () => {
		expect(decodificarRespuesta(protobuf())).toEqual([]);
		expect(decodificarRespuesta(protobuf(duracion))).toEqual([]);
	});

	it('lee tipos empaquetados y sin empaquetar', () => {
		expect(decodificarRespuesta(protobuf(amenaza('http://malo.test/', 2, 1), duracion))).toEqual(['SOCIAL_ENGINEERING', 'MALWARE']);
		const sinEmpaquetar = bloque(1, [...bloque(1, texto('http://malo.test/')), ...numero(2, 3)]);
		expect(decodificarRespuesta(protobuf(sinEmpaquetar))).toEqual(['UNWANTED_SOFTWARE']);
	});

	it('tira error ante datos cortados, campos inesperados o amenazas sin tipo', () => {
		expect(() => decodificarRespuesta(protobuf(amenaza('http://malo.test/', 2)).slice(0, -1))).toThrow();
		expect(() => decodificarRespuesta(protobuf(numero(7, 1)))).toThrow();
		expect(() => decodificarRespuesta(protobuf(bloque(1, bloque(1, texto('http://malo.test/')))))).toThrow();
	});
});

const simularGoogle = (respuesta) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta);

afterEach(() => vi.restoreAllMocks());

describe('consultarSafeBrowsing', () => {
	it('marca "detectado" con los tipos de amenaza que devuelve Google', async () => {
		simularGoogle(new Response(protobuf(amenaza('http://malo.test/', 2, 1), duracion)));
		expect(await consultarSafeBrowsing('http://malo.test/', 'key-falsa')).toEqual({
			fuente: 'google_safe_browsing',
			resultado: 'detectado',
			detalle: ['SOCIAL_ENGINEERING', 'MALWARE'],
		});
	});

	it('marca "no_detectado" si Google no devuelve amenazas', async () => {
		simularGoogle(new Response(protobuf(duracion)));
		expect((await consultarSafeBrowsing('https://example.com/', 'key-falsa')).resultado).toBe('no_detectado');
	});

	it('marca "error" (nunca "no_detectado") si Google responde con error', async () => {
		simularGoogle(new Response('cuota agotada', { status: 429 }));
		expect((await consultarSafeBrowsing('https://example.com/', 'key-falsa')).resultado).toBe('error');
	});

	it('marca "error" si la red falla o la respuesta no se puede leer', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('sin conexión'));
		expect((await consultarSafeBrowsing('https://example.com/', 'key-falsa')).resultado).toBe('error');
		simularGoogle(new Response('<html>'));
		expect((await consultarSafeBrowsing('https://example.com/', 'key-falsa')).resultado).toBe('error');
	});

	it('sin API key no llama a Google', async () => {
		const fetch = simularGoogle(new Response(protobuf()));
		expect((await consultarSafeBrowsing('https://example.com/', undefined)).resultado).toBe('error');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('manda la key en un encabezado y no en la URL', async () => {
		const fetch = simularGoogle(new Response(protobuf()));
		await consultarSafeBrowsing('https://example.com/a?b=c', 'key-falsa');
		const [urlPedida, opciones] = fetch.mock.calls[0];
		expect(urlPedida).toBe('https://safebrowsing.googleapis.com/v5/urls:search?urls=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc');
		expect(urlPedida).not.toContain('key-falsa');
		expect(opciones.headers['X-Goog-Api-Key']).toBe('key-falsa');
	});
});
