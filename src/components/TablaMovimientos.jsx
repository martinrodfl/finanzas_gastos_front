import { useMemo, useState } from 'react';
import styles from './TablaMovimientos.module.css';
import { combinarCategoriasConPersonalizadas } from '../utils/categorias';
import {
	ICONO_CATEGORIA_DEFAULT,
	ICONOS_CATEGORIA,
} from '../utils/categoriaIconos';
import { GASTOS_FIJOS } from '../utils/gastosFijos';
import api from '../api/client';

/**
 * Tabla de movimientos del mes con edición inline de categoría y gasto fijo.
 *
 * Cada fila permite cambiar la categoría del movimiento mediante un select,
 * crear una categoría nueva on-the-fly, y asignar el gasto fijo correspondiente.
 *
 * @param {{
 *   movimientos: Array,
 *   onCategoriaChange: (id: number, payload) => void,
 *   categorias: Array<{ nombre: string, icono: string, color: string }>,
 *   guardarCategoria: (nombre: string, icono: string) => Promise<void>,
 *   onGastoFijoChange: (id: number, gastoFijo: string | null) => void
 * }} props
 */
export default function TablaMovimientos({
	movimientos,
	onCategoriaChange,
	categorias: todasCategoriasBase,
	guardarCategoria: guardarPersonalizada,
	onGastoFijoChange,
}) {
	// Mapas por ID de movimiento para el editor inline de "nueva categoría"
	const [editorCatAbiertoPorId, setEditorCatAbiertoPorId] = useState({});
	const [nombreNuevaCatPorId, setNombreNuevaCatPorId] = useState({});
	const [iconoNuevaCatPorId, setIconoNuevaCatPorId] = useState({});

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

	/** Formatea un número como moneda UY (ej: $ 1.234,56) o '—' si es cero. */
	const fmt = (n) =>
		n > 0
			? `$ ${Number(n).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`
			: '—';

	/** Convierte fecha ISO (YYYY-MM-DD) a formato legible DD/MM/YYYY. */
	const fmtFecha = (f) => {
		const [y, m, d] = f.split('-');
		return `${d}/${m}/${y}`;
	};

	/**
	 * Resuelve la categoría visible de un movimiento.
	 * Prioridad: categoria_manual > categoria_regla > 'Otros'.
	 */
	const categoriaActual = (m) =>
		m.categoria_manual ?? m.categoria_regla ?? 'Otros';

	/**
	 * Envía el cambio de categoría al backend (PATCH /movimientos/{id}/categoria)
	 * y notifica al padre con la respuesta del servidor.
	 *
	 * @param {number} id
	 * @param {string | null} categoria - null para restaurar la categoría automática
	 */
	const cambiarCategoria = async (id, categoria) => {
		const { data } = await api.patch(`/movimientos/${id}/categoria`, {
			categoria,
		});
		onCategoriaChange?.(id, data ?? { categoria_manual: categoria });
	};

	/**
	 * Envía el cambio de gasto fijo al backend (PATCH /movimientos/{id}/gasto-fijo).
	 * Convierte string vacío a null para poder limpiar el valor en BD.
	 *
	 * @param {number} id
	 * @param {string} gastoFijo - Nombre del gasto fijo, o '' para limpiar
	 */
	const cambiarGastoFijo = async (id, gastoFijo) => {
		const valor = gastoFijo || null;
		await api.patch(`/movimientos/${id}/gasto-fijo`, { gasto_fijo: valor });
		onGastoFijoChange?.(id, valor);
	};

	/** Abre el editor inline para crear una nueva categoría en la fila con el ID dado. */
	const activarEditorNueva = (id) => {
		setEditorCatAbiertoPorId((prev) => ({ ...prev, [id]: true }));
		setIconoNuevaCatPorId((prev) => ({
			...prev,
			[id]: prev[id] ?? ICONO_CATEGORIA_DEFAULT,
		}));
	};

	/** Cierra el editor inline y limpia los campos de nombre e ícono para esa fila. */
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
	 * Solo procede si hay un nombre ingresado.
	 *
	 * @param {number} id - ID del movimiento al que se asignará la nueva categoría
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
						<th className={styles.gastoFijoCol}>Gasto fijo</th>
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

									{/* Editor inline para crear una categoría nueva sin salir de la fila */}
									{editorCatAbiertoPorId[m.id] && (
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
													iconoNuevaCatPorId[m.id] ?? ICONO_CATEGORIA_DEFAULT
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
								</div>
							</td>
							<td className={styles.gastoFijoCol}>
								<select
									value={m.gasto_fijo ?? ''}
									onChange={(e) => cambiarGastoFijo(m.id, e.target.value)}
									className={`${styles.selectCategoria} ${m.gasto_fijo ? styles.gastoFijoAsignado : styles.gastoFijoVacio}`}
								>
									<option value=''>— Sin asignar —</option>
									{GASTOS_FIJOS.map((g) => (
										<option
											key={g.nombre}
											value={g.nombre}
										>
											{g.nombre}
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
