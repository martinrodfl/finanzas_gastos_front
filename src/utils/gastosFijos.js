/**
 * Lista de gastos fijos mensuales que la app trackea automáticamente.
 *
 * Cada entrada tiene:
 *   - nombre: identificador único que se guarda en el campo gasto_fijo del movimiento.
 *   - keywords: términos (en minúsculas) a buscar en la descripción o dependencia
 *     del movimiento como detección automática (fallback si no hay campo explícito).
 */
export const GASTOS_FIJOS = [
	{ nombre: 'Alquiler', keywords: ['alquiler', 'arrendamiento'] },
	{ nombre: 'Internet', keywords: ['internet'] },
	{
		nombre: 'Teléfono fijo',
		keywords: ['telefono fijo', 'teléfono fijo', 'antel fijo'],
	},
	{ nombre: 'Celular', keywords: ['celular', 'movistar', 'claro'] },
	{ nombre: 'UTE (Luz)', keywords: ['ute', ' luz '] },
	{
		nombre: 'Tarjeta de crédito',
		keywords: [
			'tarjeta',
			'visa',
			'mastercard',
			'oca',
			'credito',
			'crédito',
			'PAGO DE TC',
		],
	},
	{ nombre: 'DGI', keywords: ['dgi'] },
	{ nombre: 'BPS', keywords: ['bps'] },
	{
		nombre: 'Servicio fúnebre',
		keywords: ['funebre', 'fúnebre', 'funeral', 'funebr'],
	},
	{ nombre: 'Contadora', keywords: ['honorarios', 'contadora', 'Honorarios'] },
];
