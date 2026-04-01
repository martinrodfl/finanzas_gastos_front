import { ICONO_CATEGORIA_DEFAULT } from './categoriaIconos';

export const CATEGORIAS = [
	{
		nombre: 'Supermercado',
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

export const CATEGORIA_OTROS = {
	nombre: 'Otros',
	color: 'var(--color-category-otros)',
	icono: '📋',
	palabras: ['Retiro Red: REDBROU', 'Retiro Red: REDPAGOS', 'RETIRO RED'],
};

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

export function categorizar(descripcion = '') {
	const desc = descripcion.toUpperCase();
	for (const cat of CATEGORIAS) {
		if (cat.palabras.some((p) => desc.includes(p))) {
			return cat;
		}
	}
	return CATEGORIA_OTROS;
}

export function getCategorias() {
	return [...CATEGORIAS, CATEGORIA_OTROS];
}

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
