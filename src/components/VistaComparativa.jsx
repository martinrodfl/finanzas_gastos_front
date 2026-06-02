import { useEffect, useState } from 'react';
import api from '../api/client';
import styles from './VistaComparativa.module.css';

/**
 * Tabla comparativa de egresos por categoría y mes.
 *
 * Filas: categorías únicas con movimientos en cualquier período.
 * Columnas: meses disponibles ordenados cronológicamente.
 * Celdas: total de débitos de esa categoría en ese mes, o "—" si no hay.
 * Pie: fila de totales por mes.
 */
export default function VistaComparativa() {
	const [datos, setDatos] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api
			.get('/movimientos/categorias-por-mes')
			.then(({ data }) => setDatos(data))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <p className={styles.cargando}>Cargando...</p>;
	if (datos.length === 0) {
		return <p className={styles.cargando}>No hay datos disponibles.</p>;
	}

	const meses = [...new Set(datos.map((d) => d.mes))].sort();
	const categorias = [...new Set(datos.map((d) => d.categoria))].sort((a, b) => {
		if (a === 'Sin categoría') return 1;
		if (b === 'Sin categoría') return -1;
		return a.localeCompare(b, 'es');
	});

	// Mapa de acceso rápido: mapa[categoria][mes] = total
	const mapa = {};
	for (const d of datos) {
		if (!mapa[d.categoria]) mapa[d.categoria] = {};
		mapa[d.categoria][d.mes] = d.total;
	}

	const totalesPorMes = {};
	for (const mes of meses) {
		totalesPorMes[mes] = categorias.reduce(
			(s, cat) => s + (mapa[cat]?.[mes] ?? 0),
			0,
		);
	}

	const fmt = (n) =>
		n.toLocaleString('es-UY', { minimumFractionDigits: 2 });

	const fmtMes = (m) => {
		const [year, month] = m.split('-');
		return new Date(Number(year), Number(month) - 1).toLocaleDateString(
			'es-UY',
			{ month: 'short', year: '2-digit' },
		);
	};

	return (
		<div className={styles.contenedor}>
			<div className={styles.wrapper}>
				<table className={styles.tabla}>
					<thead>
						<tr>
							<th className={styles.thCategoria}>Categoría</th>
							{meses.map((m) => (
								<th
									key={m}
									className={styles.thMes}
								>
									{fmtMes(m)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{categorias.map((cat) => (
							<tr key={cat}>
								<td className={styles.tdCategoria}>{cat}</td>
								{meses.map((mes) => {
									const val = mapa[cat]?.[mes] ?? 0;
									return (
										<td
											key={mes}
											className={`${styles.tdMonto} ${val === 0 ? styles.cero : ''}`}
										>
											{val === 0 ? '—' : `$ ${fmt(val)}`}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
					<tfoot>
						<tr className={styles.totalRow}>
							<td className={styles.tdCategoria}>Total</td>
							{meses.map((mes) => (
								<td
									key={mes}
									className={styles.tdMonto}
								>
									$ {fmt(totalesPorMes[mes])}
								</td>
							))}
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
}
