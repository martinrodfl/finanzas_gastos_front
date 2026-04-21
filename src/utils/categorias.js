import { ICONO_CATEGORIA_DEFAULT } from './categoriaIconos';

/**
 * Definición de categorías predefinidas del sistema.
 *
 * Cada categoría tiene un color CSS (variable del tema), un ícono emoji
 * y un array de palabras clave (en mayúsculas) para detección automática
 * por coincidencia en la descripción del movimiento.
 */
export const CATEGORIAS = [
	{
		nombre: 'Alimentacion/Supermercado',
		color: 'var(--color-category-supermercado)',
		icono: '🛒',
		palabras: [
			'SUPERM',
			'DISCO',
			'TIENDA INGLESA',
			'DEVOTO',
			'GEANT',
			'TA-TA',
			'TATA',
			'MACROMERCADO',
			'FRESH MARKET',
			'EL DORADO',
			'MULTIAHORRO',
			'Comercio: DISA',
			'Comercio: DISCO N? 7',
		],
	},
	{
		nombre: 'Servicios',
		color: 'var(--color-category-servicios)',
		icono: '⚡',
		palabras: [
			'UTE',
			'OSE',
			'ANTEL',
			'ANCAP',
			'GAS',
			'AGUA ',
			'LUZ ',
			'TELEFON',
			'INTERNET',
			'FIBRA',
			'MOVISTAR',
			'CLARO',
		],
	},
	{
		nombre: 'Alquiler',
		color: 'var(--color-category-alquiler)',
		icono: '🏠',
		palabras: ['ALQUILER', 'INMOBILIARIA', 'ARRIENDO', 'ADMINISTRACION'],
	},
	{
		nombre: 'Salud',
		color: 'var(--color-category-salud)',
		icono: '🏥',
		palabras: [
			'FARMACI',
			'SALUD',
			'MEDIC',
			'CLINICA',
			'HOSPITAL',
			'DENTIST',
			'OPTICA',
			'MUTUALISTA',
			'ASSE',
			'HOSPITAL',
		],
	},
	{
		nombre: 'Transporte',
		color: 'var(--color-category-transporte)',
		icono: '🚌',
		palabras: [
			'STM',
			'TAXI',
			'UBER',
			'COPSA',
			'TURISMAR',
			'CUTCSA',
			'OMNIBUS',
			'CABIFY',
			'PEDIDO YA',
			'NAFTA',
			'COMBUSTIBLE',
			'PEAJE',
		],
	},
	{
		nombre: 'Educación',
		color: 'var(--color-category-educacion)',
		icono: '📚',
		palabras: [
			'UDELAR',
			'EDUCACION',
			'LICEO',
			'ESCUELA',
			'COLEGIO',
			'UNIVERSIDAD',
			'INSTITUTO',
			'CURSO',
			'CAPACITACION',
		],
	},
	{
		nombre: 'Entretenimiento',
		color: 'var(--color-category-entretenimiento)',
		icono: '🎬',
		palabras: [
			'NETFLIX',
			'SPOTIFY',
			'CINEMA',
			'CABLEVISION',
			'DIRECTV',
			'YOUTUBE',
			'DISNEY',
			'HBO',
			'CINE ',
			'TEATRO',
			'RESTAU',
			'RESTAURANT',
			'PIZZ',
			'SUSHI',
			'BURGER',
			'MCDONALD',
			'DELIVERY',
		],
	},
	{
		nombre: 'Transferencias',
		color: 'var(--color-category-transferencias)',
		icono: '↔️',
		palabras: ['TRANSFERENCIA', 'TEFI', 'PAGO '],
	},
	{
		nombre: 'Ingresos',
		color: 'var(--color-category-ingresos)',
		icono: '💰',
		palabras: [
			'SALARIO',
			'HABERES',
			'SUELDO',
			'HONORARIO',
			'COBRO',
			'ACREDITACION',
		],
	},
	{
		nombre: 'Personal',
		color: 'var(--color-category-personal)',
		icono: '👤',
		palabras: [
			'PERSONAL',
			'GASTOS PERSONALES',
			'OTROS GASTOS',
			'Comercio: CLASSIE *HANDY*',
		],
	},
	{
		nombre: 'Impuestos',
		color: 'var(--color-category-impuestos)',
		icono: '💸',
		palabras: [
			'IMPUESTO',
			'TRIBUTOS',
			'TASA',
			'CONTRIBUCION',
			'DGI',
			'BPS',
			'DGR',
			'INTENDENCIA',
			'MUNICIPALIDAD',
		],
	},
];

/** Categoría de fallback cuando ninguna palabra clave coincide con la descripción. */
export const CATEGORIA_OTROS = {
	nombre: 'Otros',
	color: 'var(--color-category-otros)',
	icono: '📋',
	palabras: ['Retiro Red: REDBROU', 'Retiro Red: REDPAGOS', 'RETIRO RED'],
};

/**
 * Crea un objeto de categoría personalizada con valores por defecto.
 * Se usa cuando el usuario ingresa un nombre nuevo que no existe en CATEGORIAS.
 *
 * @param {string} [nombre]
 * @param {string|null} [iconoElegido]
 * @returns {{ nombre: string, color: string, icono: string, palabras: string[] }}
 */
export function crearCategoriaPersonalizada(nombre = '', iconoElegido = null) {
	const nombreLimpio = nombre.trim();
	const icono = iconoElegido || ICONO_CATEGORIA_DEFAULT;

	return {
		nombre: nombreLimpio,
		color: 'var(--color-category-otros)',
		icono,
		palabras: [],
	};
}

/**
 * Determina la categoría de un movimiento por coincidencia de palabras clave.
 * Recorre CATEGORIAS en orden y retorna la primera que coincida.
 * Si ninguna coincide, retorna CATEGORIA_OTROS.
 *
 * @param {string} descripcion - Descripción del movimiento (mayúsculas o minúsculas)
 * @returns {{ nombre: string, color: string, icono: string, palabras: string[] }}
 */
export function categorizar(descripcion = '') {
	const desc = descripcion.toUpperCase();
	for (const cat of CATEGORIAS) {
		if (cat.palabras.some((p) => desc.includes(p))) {
			return cat;
		}
	}
	return CATEGORIA_OTROS;
}

/**
 * Devuelve todas las categorías predefinidas (CATEGORIAS + CATEGORIA_OTROS).
 *
 * @returns {Array}
 */
export function getCategorias() {
	return [...CATEGORIAS, CATEGORIA_OTROS];
}

/**
 * Combina las categorías base con las que aparecen en los movimientos.
 * Si un nombre del array no existe en categorías base, se crea como
 * categoría personalizada con valores por defecto.
 *
 * Esto permite que los movimientos con categorias_manuales o categorias_regla
 * distintas a las predefinidas siempre tengan un objeto de categoría válido.
 *
 * @param {Array} categoriasBase - Categorías conocidas
 * @param {(string|null|undefined)[]} nombres - Nombres extraídos de los movimientos
 * @returns {Array}
 */
export function combinarCategoriasConPersonalizadas(
	categoriasBase,
	nombres = [],
) {
	const mapa = new Map(categoriasBase.map((cat) => [cat.nombre, cat]));

	for (const nombreRaw of nombres) {
		const nombre = String(nombreRaw ?? '').trim();
		if (!nombre) continue;
		if (!mapa.has(nombre)) {
			mapa.set(nombre, crearCategoriaPersonalizada(nombre));
		}
	}

	return Array.from(mapa.values());
}
