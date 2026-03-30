import { useMemo, useState } from 'react';
import { categorizar, getCategorias } from '../utils/categorias';
import api from '../api/client';
import styles from './VistaCategorias.module.css';

export default function VistaCategorias({ movimientos, onCategoriaChange }) {
	const [expandido, setExpandido] = useState(null);
	const [guardando, setGuardando] = useState(null);

	const todasCategorias = getCategorias();

	const resolverCategoria = (mov) => {
		if (mov.categoria_manual) {
			return (
				todasCategorias.find((c) => c.nombre === mov.categoria_manual) ??
				categorizar(mov.descripcion)
			);
		}
		if (mov.categoria_regla) {
			return (
				todasCategorias.find((c) => c.nombre === mov.categoria_regla) ??
				categorizar(mov.descripcion)
			);
		}
		return categorizar(mov.descripcion);
	};

	const grupos = useMemo(() => {
		const mapa = new Map();
		for (const cat of todasCategorias) {
			mapa.set(cat.nombre, {
				categoria: cat,
				movimientos: [],
				totalDebito: 0,
				totalCredito: 0,
			});
		}

		for (const mov of movimientos) {
			const cat = resolverCategoria(mov);
			const grupo = mapa.get(cat.nombre);
			grupo.movimientos.push(mov);
			grupo.totalDebito += Number(mov.debito);
			grupo.totalCredito += Number(mov.credito);
		}

		return Array.from(mapa.values())
			.filter((g) => g.movimientos.length > 0)
			.sort((a, b) => b.totalDebito - a.totalDebito);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [movimientos]);

	const cambiarCategoria = async (id, categoria) => {
		setGuardando(id);
		try {
			const { data } = await api.patch(`/movimientos/${id}/categoria`, {
				categoria,
			});
			onCategoriaChange(id, data ?? { categoria_manual: categoria });
		} finally {
			setGuardando(null);
		}
	};

	const maxDebito = Math.max(...grupos.map((g) => g.totalDebito), 1);
	const fmt = (n) =>
		`$ ${n.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
	const fmtFecha = (f) => {
		const [y, m, d] = f.split('-');
		return `${d}/${m}/${y}`;
	};
	const toggle = (nombre) =>
		setExpandido((prev) => (prev === nombre ? null : nombre));

	if (grupos.length === 0) {
		return (
			<p className={styles.vacio}>No hay movimientos para este período.</p>
		);
	}

	return (
		<div className={styles.contenedor}>
			{grupos.map(
				({ categoria, movimientos: movs, totalDebito, totalCredito }) => (
					<div
						key={categoria.nombre}
						className={styles.grupo}
					>
						<button
							className={styles.cabecera}
							onClick={() => toggle(categoria.nombre)}
							style={{ borderLeftColor: categoria.color }}
						>
							<span className={styles.icono}>{categoria.icono}</span>
							<span className={styles.nombre}>{categoria.nombre}</span>
							<span className={styles.cantidad}>{movs.length} mov.</span>
							<div className={styles.barraWrapper}>
								<div
									className={styles.barra}
									style={{
										width: `${(totalDebito / maxDebito) * 100}%`,
										background: categoria.color,
									}}
								/>
							</div>
							<div className={styles.totales}>
								{totalDebito > 0 && (
									<span className={styles.egreso}>{fmt(totalDebito)}</span>
								)}
								{totalCredito > 0 && (
									<span className={styles.ingreso}>{fmt(totalCredito)}</span>
								)}
							</div>
							<span className={styles.chevron}>
								{expandido === categoria.nombre ? '▲' : '▼'}
							</span>
						</button>

						{expandido === categoria.nombre && (
							<table className={styles.tabla}>
								<thead>
									<tr>
										<th>Fecha</th>
										<th>Descripción</th>
										<th>Categoría</th>
										<th className={styles.monto}>Egreso</th>
										<th className={styles.monto}>Ingreso</th>
									</tr>
								</thead>
								<tbody>
									{movs.map((m) => {
										const catActual = resolverCategoria(m);
										const esManual = m.categoria_manual !== null;
										const cargando = guardando === m.id;

										return (
											<tr key={m.id}>
												<td className={styles.fecha}>{fmtFecha(m.fecha)}</td>
												<td>{m.descripcion}</td>
												<td>
													<div className={styles.selectorCat}>
														<select
															value={catActual.nombre}
															disabled={cargando}
															onChange={(e) =>
																cambiarCategoria(m.id, e.target.value)
															}
															className={styles.selectCat}
															style={{
																borderColor: catActual.color,
																opacity: cargando ? 0.5 : 1,
															}}
														>
															{todasCategorias.map((c) => (
																<option
																	key={c.nombre}
																	value={c.nombre}
																>
																	{c.icono} {c.nombre}
																</option>
															))}
														</select>
														{esManual && !cargando && (
															<button
																className={styles.btnReset}
																title='Restaurar categoría automática'
																onClick={() => cambiarCategoria(m.id, null)}
															>
																↩
															</button>
														)}
														{cargando && (
															<span className={styles.guardando}>…</span>
														)}
													</div>
												</td>
												<td className={`${styles.monto} ${styles.colorEgreso}`}>
													{m.debito > 0 ? fmt(Number(m.debito)) : '—'}
												</td>
												<td
													className={`${styles.monto} ${styles.colorIngreso}`}
												>
													{m.credito > 0 ? fmt(Number(m.credito)) : '—'}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				),
			)}
		</div>
	);
}
