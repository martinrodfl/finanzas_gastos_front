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

/**
 * Vista de movimientos agrupados por categoría.
 *
 * Muestra cada categoría como un acordeón expandible con barra de progreso
 * proporcional al gasto total, y permite reclasificar movimientos individuales
 * o crear categorías nuevas directamente desde la vista.
 *
 * @param {{
 *   movimientos: Array,
 *   onCategoriaChange: (id: number, payload) => void,
 *   categorias: Array<{ nombre: string, icono: string, color: string }>,
 *   guardarCategoria: (nombre: string, icono: string) => Promise<void>
 * }} props
 */
export default function VistaCategorias({
	movimientos,
	onCategoriaChange,
	categorias: todasCategoriasBase,
	guardarCategoria: guardarPersonalizada,
}) {
	const [expandido, setExpandido] = useState(null);
	const [guardando, setGuardando] = useState(null);
	// Mapas por ID de movimiento para el editor inline de "nueva categoría"
	const [editorCatAbiertoPorId, setEditorCatAbiertoPorId] = useState({});
	const [nombreNuevaCatPorId, setNombreNuevaCatPorId] = useState({});
	const [iconoNuevaCatPorId, setIconoNuevaCatPorId] = useState({});
	const { width } = useViewport();

	/**
	 * Combina las categorías base (locales) con las que aparecen en los movimientos
	 * (pueden incluir personalizadas creadas por el usuario).
	 */
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

	/**
	 * Resuelve la categoría de un movimiento aplicando tres niveles de prioridad:
	 *   1. categoria_manual: asignada manualmente por el usuario (máxima prioridad).
	 *   2. categoria_regla: asignada por regla automática del backend.
	 *   3. Fallback: categorización local por keywords de la descripción.
	 *
	 * @param {object} mov - Movimiento a clasificar
	 * @returns {{ nombre: string, icono: string, color: string }} Categoría resuelta
	 */
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

	/**
	 * Construye el mapa de grupos por categoría a partir de todos los movimientos.
	 * Primero crea una entrada vacía para cada categoría conocida (para mantener
	 * el orden), luego asigna cada movimiento a su grupo. Filtra los grupos
	 * sin movimientos y los ordena por mayor débito.
	 */
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

	/**
	 * Envía el cambio de categoría al backend y notifica al padre.
	 * Muestra un spinner por fila mientras se procesa la petición.
	 */
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

	/** Abre el editor inline para crear una categoría nueva en la fila indicada. */
	const activarEditorNueva = (id) => {
		setEditorCatAbiertoPorId((prev) => ({ ...prev, [id]: true }));
		setIconoNuevaCatPorId((prev) => ({
			...prev,
			[id]: prev[id] ?? ICONO_CATEGORIA_DEFAULT,
		}));
	};

	/** Cierra el editor inline y limpia nombre e ícono para la fila indicada. */
	const cancelarEditorNueva = (id) => {
		setEditorCatAbiertoPorId((prev) => ({ ...prev, [id]: false }));
		setNombreNuevaCatPorId((prev) => ({ ...prev, [id]: '' }));
		setIconoNuevaCatPorId((prev) => ({
			...prev,
			[id]: ICONO_CATEGORIA_DEFAULT,
		}));
	};

	/**
	 * Guarda la nueva categoría en el backend y la asigna al movimiento.
	 *
	 * @param {number} id - ID del movimiento al que se asignará la categoría creada
	 */
	const guardarNuevaCategoria = async (id) => {
		const nombre = (nombreNuevaCatPorId[id] ?? '').trim();
		if (!nombre) return;
		await guardarPersonalizada(
			nombre,
			iconoNuevaCatPorId[id] ?? ICONO_CATEGORIA_DEFAULT,
		);
		await cambiarCategoria(id, nombre);
		cancelarEditorNueva(id);
	};

	/** Base para calcular el porcentaje de barra de cada categoría. */
	const totalDebitoGlobal =
		grupos.reduce((sum, g) => sum + g.totalDebito, 0) || 1;

	/** Formatea moneda UY. */
	const fmt = (n) =>
		`$ ${n.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
	/** Convierte fecha ISO a DD/MM/YYYY. */
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
									<div className={styles.barraTrack}>
										<div
											className={styles.barra}
											style={{
												width: `${(totalDebito / totalDebitoGlobal) * 100}%`,
												background: categoria.color,
											}}
										/>
									</div>
									<span className={styles.pctLabel}>
										{totalDebito > 0
											? `${((totalDebito / totalDebitoGlobal) * 100).toFixed(1)}%`
											: ''}
									</span>
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
														{editorCatAbiertoPorId[m.id] && !cargando && (
															<div className={styles.nuevaCategoriaRow}>
																<input
																	type='text'
																	placeholder='Nombre de categoría'
																	value={nombreNuevaCatPorId[m.id] ?? ''}
																	onChange={(e) =>
																		setNombreNuevaCatPorId((prev) => ({
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
																		iconoNuevaCatPorId[m.id] ??
																		ICONO_CATEGORIA_DEFAULT
																	}
																	onChange={(e) =>
																		setIconoNuevaCatPorId((prev) => ({
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
