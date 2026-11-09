// Límite de uso diario, para que nadie gaste las cuotas gratis de las APIs.
// Se cuenta por instalación y también un total global (por si alguien inventa muchos IDs).

const LIMITES = {
	consulta: { porInstalacion: 50, global: 400 }, // VirusTotal gratis permite 500 por día
	chat: { porInstalacion: 30, global: 900 }, // Groq (gpt-oss-20b) permite 1000 pedidos por día
};

const SQL_SUMAR_UNO = `
	INSERT INTO uso (id, dia, tipo, cantidad) VALUES (?1, ?2, ?3, 1)
	ON CONFLICT (id, dia, tipo) DO UPDATE SET cantidad = cantidad + 1
	RETURNING cantidad`;

async function sumarUno(db, id, dia, tipo) {
	const fila = await db.prepare(SQL_SUMAR_UNO).bind(id, dia, tipo).first();
	return fila.cantidad;
}

// Devuelve true si la instalación todavía puede hacer este tipo de pedido hoy.
// Una instalación que ya pasó su límite no suma al global, así no puede agotarlo sola.
export async function registrarUso(db, idInstalacion, tipo) {
	const limite = LIMITES[tipo];
	const dia = new Date().toISOString().slice(0, 10); // día en UTC, igual que el reinicio de D1

	if ((await sumarUno(db, idInstalacion, dia, tipo)) > limite.porInstalacion) return false;
	return (await sumarUno(db, 'global', dia, tipo)) <= limite.global;
}
