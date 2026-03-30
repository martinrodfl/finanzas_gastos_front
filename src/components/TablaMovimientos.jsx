import styles from './TablaMovimientos.module.css';
import { getCategorias } from '../utils/categorias';
import api from '../api/client';

export default function TablaMovimientos({ movimientos, onCategoriaChange }) {
	const categorias = getCategorias();

	const fmt = (n) =>
		n > 0
			? `$ ${Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`
			: '—';

	const fmtFecha = (f) => {
		const [y, m, d] = f.split('-');
		return `${d}/${m}/${y}`;
	};

	const categoriaActual = (m) =>
		m.categoria_manual ?? m.categoria_regla ?? 'Otros';

	const cambiarCategoria = async (id, categoria) => {
		const { data } = await api.patch(`/movimientos/${id}/categoria`, {
			categoria,
		});
		onCategoriaChange?.(id, data ?? { categoria_manual: categoria });
	};

	if (movimientos.length === 0) {
		return (
			<p className={styles.vacio}>No hay movimientos para este período.</p>
		);
	}

	return (
		<div className={styles.wrapper}>
			<table className={styles.tabla}>
				<thead>
					<tr>
						<th>Fecha</th>
						<th>Descripción</th>
						<th>Categoría</th>
						<th>Asunto</th>
						<th className={styles.monto}>Egreso</th>
						<th className={styles.monto}>Ingreso</th>
					</tr>
				</thead>
				<tbody>
					{movimientos.map((m) => (
						<tr
							key={m.id}
							className={m.credito > 0 ? styles.ingreso : ''}
						>
							<td className={styles.fecha}>{fmtFecha(m.fecha)}</td>
							<td>{m.descripcion}</td>
							<td className={styles.categoriaCol}>
								<select
									value={categoriaActual(m)}
									onChange={(e) => cambiarCategoria(m.id, e.target.value)}
									className={styles.selectCategoria}
								>
									{categorias.map((c) => (
										<option
											key={c.nombre}
											value={c.nombre}
										>
											{c.icono} {c.nombre}
										</option>
									))}
								</select>
							</td>
							<td className={styles.dependencia}>{m.asunto ?? '—'}</td>
							<td className={`${styles.monto} ${styles.debito}`}>
								{fmt(m.debito)}
							</td>
							<td className={`${styles.monto} ${styles.credito}`}>
								{fmt(m.credito)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
