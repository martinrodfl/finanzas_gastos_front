import { useCallback, useMemo, useState } from 'react';
import {
	categorizar,
	combinarCategoriasConPersonalizadas,
	crearCategoriaPersonalizada,
} from '../utils/categorias';
import {
	ICONO_CATEGORIA_DEFAULT,
	ICONOS_CATEGORIA,
} from '../utils/categoriaIconos';
import { useViewport } from '../hooks/useViewport';
import api from '../api/client';
import styles from './VistaCategorias.module.css';

export default function VistaCategorias({
	movimientos,
	onCategoriaChange,
	categorias: todasCategoriasBase,
	guardarCategoria: guardarPersonalizada,
}) {
	const [expandido, setExpandido] = useState(null);
	const [guardando, setGuardando] = useState(null);
	const [editorNuevaPorId, setEditorNuevaPorId] = useState({});
	const [textoNuevaPorId, setTextoNuevaPorId] = useState({});
	const [iconoNuevaPorId, setIconoNuevaPorId] = useState({});
	const { width } = useViewport();

	const todasCategorias = useMemo(() => {
		const nombresCategorias = movimientos.flatMap((m) => [
			m.categoria_manual,
			m.categoria_regla,
		]);
		return combinarCategoriasConPersonalizadas(
			todasCategoriasBase,
			nombresCategorias,
		);
	}, [movimientos, todasCategoriasBase]);

	const resolverCategoria = useCallback(
		(mov) => {
			const nombreManual = String(mov.categoria_manual ?? '').trim();
			if (nombreManual) {
				return (
					todasCategorias.find((c) => c.nombre === nombreManual) ??
					crearCategoriaPersonalizada(nombreManual)
				);
			}

			const nombreRegla = String(mov.categoria_regla ?? '').trim();
			if (nombreRegla) {
				return (
					todasCategorias.find((c) => c.nombre === nombreRegla) ??
					crearCategoriaPersonalizada(nombreRegla)
				);
			}

			return categorizar(mov.descripcion);
		},
		[todasCategorias],
	);

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
			if (!mapa.has(cat.nombre)) {
				mapa.set(cat.nombre, {
					categoria: cat,
					movimientos: [],
					totalDebito: 0,
					totalCredito: 0,
				});
			}

			const grupo = mapa.get(cat.nombre);
			grupo.movimientos.push(mov);
			grupo.totalDebito += Number(mov.debito);
			grupo.totalCredito += Number(mov.credito);
		}

		return Array.from(mapa.values())
			.filter((g) => g.movimientos.length > 0)
			.sort((a, b) => b.totalDebito - a.totalDebito);
	}, [movimientos, resolverCategoria, todasCategorias]);

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

	const activarEditorNueva = (id) => {
		setEditorNuevaPorId((prev) => ({ ...prev, [id]: true }));
		setIconoNuevaPorId((prev) => ({
			...prev,
			[id]: prev[id] ?? ICONO_CATEGORIA_DEFAULT,
		}));
	};

	const cancelarEditorNueva = (id) => {
		setEditorNuevaPorId((prev) => ({ ...prev, [id]: false }));
		setTextoNuevaPorId((prev) => ({ ...prev, [id]: '' }));
		setIconoNuevaPorId((prev) => ({ ...prev, [id]: ICONO_CATEGORIA_DEFAULT }));
	};

	const guardarNuevaCategoria = async (id) => {
		const nombre = (textoNuevaPorId[id] ?? '').trim();
		if (!nombre) return;
		await guardarPersonalizada(
			nombre,
			iconoNuevaPorId[id] ?? ICONO_CATEGORIA_DEFAULT,
		);
		await cambiarCategoria(id, nombre);
		cancelarEditorNueva(id);
	};

	const maxDebito = Math.max(...grupos.map((g) => g.totalDebito), 1);

	const fmt = (n) =>
		`$ ${n.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
	const fmtFecha = (f) => {
		const [y, m, d] = f.split('-');
		return `${d}/${m}/${y}`;
	};

	const fmtFecha2 = (f) => {
		const [_y, m, d] = f.split('-');
		return `${d}/${m}`;
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
							{width >= 740 && (
								<div className={styles.barraWrapper}>
									<div
										className={styles.barra}
										style={{
											width: `${(totalDebito / maxDebito) * 100}%`,
											background: categoria.color,
										}}
									/>
								</div>
							)}
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
												<td className={styles.fecha}>
													{width >= 740
														? fmtFecha(m.fecha)
														: fmtFecha2(m.fecha)}
												</td>
												<td className={styles.descriptionBody}>
													{m.descripcion}
												</td>

												<td>
													<div className={styles.selectorCat}>
														<select
															value={catActual.nombre}
															disabled={cargando}
															onChange={(e) =>
																e.target.value === '__nueva__'
																	? activarEditorNueva(m.id)
																	: cambiarCategoria(m.id, e.target.value)
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
															<option value='__nueva__'>
																+ Nueva categoría
															</option>
														</select>
														{editorNuevaPorId[m.id] && !cargando && (
															<div className={styles.nuevaCategoriaRow}>
																<input
																	type='text'
																	placeholder='Nombre de categoría'
																	value={textoNuevaPorId[m.id] ?? ''}
																	onChange={(e) =>
																		setTextoNuevaPorId((prev) => ({
																			...prev,
																			[m.id]: e.target.value,
																		}))
																	}
																	onKeyDown={(e) => {
																		if (e.key === 'Enter') {
																			e.preventDefault();
																			guardarNuevaCategoria(m.id);
																		}
																	}}
																	className={styles.nuevaCategoriaInput}
																/>
																<select
																	value={
																		iconoNuevaPorId[m.id] ??
																		ICONO_CATEGORIA_DEFAULT
																	}
																	onChange={(e) =>
																		setIconoNuevaPorId((prev) => ({
																			...prev,
																			[m.id]: e.target.value,
																		}))
																	}
																	className={styles.iconoCategoriaSelect}
																>
																	{ICONOS_CATEGORIA.map((op) => (
																		<option
																			key={op.icono}
																			value={op.icono}
																		>
																			{op.icono} {op.nombre}
																		</option>
																	))}
																</select>
																<button
																	type='button'
																	onClick={() => guardarNuevaCategoria(m.id)}
																	className={styles.btnNuevaCategoria}
																>
																	Guardar
																</button>
																<button
																	type='button'
																	onClick={() => cancelarEditorNueva(m.id)}
																	className={styles.btnCancelarNueva}
																>
																	Cancelar
																</button>
															</div>
														)}
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
