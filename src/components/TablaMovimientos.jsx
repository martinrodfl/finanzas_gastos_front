import { useMemo, useState } from 'react';
import styles from './TablaMovimientos.module.css';
import { combinarCategoriasConPersonalizadas } from '../utils/categorias';
import {
	ICONO_CATEGORIA_DEFAULT,
	ICONOS_CATEGORIA,
} from '../utils/categoriaIconos';
import api from '../api/client';

export default function TablaMovimientos({
	movimientos,
	onCategoriaChange,
	categorias: todasCategoriasBase,
	guardarCategoria: guardarPersonalizada,
}) {
	const [editorNuevaPorId, setEditorNuevaPorId] = useState({});
	const [textoNuevaPorId, setTextoNuevaPorId] = useState({});
	const [iconoNuevaPorId, setIconoNuevaPorId] = useState({});

	const categorias = useMemo(() => {
		const nombresCategorias = movimientos.flatMap((m) => [
			m.categoria_manual,
			m.categoria_regla,
		]);
		return combinarCategoriasConPersonalizadas(
			todasCategoriasBase,
			nombresCategorias,
		);
	}, [movimientos, todasCategoriasBase]);

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
								<div className={styles.selectorWrap}>
									<select
										value={categoriaActual(m)}
										onChange={(e) => {
											if (e.target.value === '__nueva__') {
												activarEditorNueva(m.id);
												return;
											}
											cambiarCategoria(m.id, e.target.value);
										}}
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
										<option value='__nueva__'>+ Nueva categoría</option>
									</select>

									{editorNuevaPorId[m.id] && (
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
												value={iconoNuevaPorId[m.id] ?? ICONO_CATEGORIA_DEFAULT}
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
								</div>
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
