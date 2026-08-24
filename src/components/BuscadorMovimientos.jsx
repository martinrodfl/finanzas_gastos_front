import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import styles from './BuscadorMovimientos.module.css';
import TablaMovimientos from './TablaMovimientos';

const FILTROS_INICIALES = {
	q: '',
	categoria: '',
	fechaDesde: '',
	fechaHasta: '',
	tipo: '',
	montoMin: '',
	montoMax: '',
};

const PER_PAGE = 25;

/**
 * Búsqueda global de movimientos: permite filtrar por texto libre (descripción,
 * asunto, documento o dependencia), categoría, rango de fechas, tipo
 * (ingreso/egreso) y rango de monto, con paginación server-side.
 *
 * Los resultados se renderizan con `TablaMovimientos`, reutilizando la misma
 * edición inline de categoría y gasto fijo que el resto de la app.
 *
 * @param {{
 *   categorias: Array<{ nombre: string, icono: string, color: string }>,
 *   guardarCategoria: (nombre: string, icono: string) => Promise<void>,
 * }} props
 */
export default function BuscadorMovimientos({ categorias, guardarCategoria }) {
	const [filtros, setFiltros] = useState(FILTROS_INICIALES);
	const [textoDebounced, setTextoDebounced] = useState('');
	const [resultados, setResultados] = useState([]);
	const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);

	// Debounce del texto libre para no disparar un fetch por cada tecla
	useEffect(() => {
		const timeout = setTimeout(() => {
			setTextoDebounced(filtros.q.trim());
			setPage(1);
		}, 350);
		return () => clearTimeout(timeout);
	}, [filtros.q]);

	/** Busca movimientos en el backend con los filtros y página actuales. */
	const buscarMovimientos = async (params, cancelRef) => {
		await Promise.resolve();
		if (cancelRef.cancelado) return;
		setLoading(true);

		try {
			const { data } = await api.get('/movimientos/buscar', { params });
			if (cancelRef.cancelado) return;
			setResultados(Array.isArray(data?.data) ? data.data : []);
			setMeta(data?.meta ?? { current_page: 1, last_page: 1, total: 0 });
		} catch {
			if (cancelRef.cancelado) return;
			setResultados([]);
			setMeta({ current_page: 1, last_page: 1, total: 0 });
		} finally {
			if (!cancelRef.cancelado) setLoading(false);
		}
	};

	// Fetch de resultados: se dispara al cambiar cualquier filtro o de página
	useEffect(() => {
		const cancelRef = { cancelado: false };

		buscarMovimientos(
			{
				q: textoDebounced,
				categoria: filtros.categoria,
				fecha_desde: filtros.fechaDesde,
				fecha_hasta: filtros.fechaHasta,
				tipo: filtros.tipo,
				monto_min: filtros.montoMin,
				monto_max: filtros.montoMax,
				page,
				per_page: PER_PAGE,
			},
			cancelRef,
		);

		return () => {
			cancelRef.cancelado = true;
		};
	}, [
		textoDebounced,
		filtros.categoria,
		filtros.fechaDesde,
		filtros.fechaHasta,
		filtros.tipo,
		filtros.montoMin,
		filtros.montoMax,
		page,
	]);

	/** Actualiza un campo del filtro y vuelve a la primera página. */
	const actualizarFiltro = (campo) => (e) => {
		setFiltros((prev) => ({ ...prev, [campo]: e.target.value }));
		setPage(1);
	};

	const limpiarFiltros = () => {
		setFiltros(FILTROS_INICIALES);
		setTextoDebounced('');
		setPage(1);
	};

	/**
	 * Actualiza el estado local de un resultado cuando cambia su categoría,
	 * replicando la misma lógica de propagación por descripción que usa Dashboard.
	 */
	const handleCategoriaChange = (id, payload) => {
		const categoria =
			typeof payload === 'string'
				? payload
				: (payload?.categoria_manual ?? null);

		setResultados((prev) => {
			const desc = prev.find((m) => m.id === id)?.descripcion;
			return prev.map((m) => {
				if (m.id === id) {
					return {
						...m,
						categoria_manual: categoria,
						debito:
							typeof payload?.debito === 'number' ? payload.debito : m.debito,
						credito:
							typeof payload?.credito === 'number'
								? payload.credito
								: m.credito,
					};
				}
				if (categoria !== null && m.descripcion === desc) {
					return { ...m, categoria_regla: categoria };
				}
				return m;
			});
		});
	};

	const handleGastoFijoChange = (id, gastoFijo) => {
		setResultados((prev) =>
			prev.map((m) => (m.id === id ? { ...m, gasto_fijo: gastoFijo } : m)),
		);
	};

	const categoriasOrdenadas = useMemo(
		() => [...categorias].sort((a, b) => a.nombre.localeCompare(b.nombre)),
		[categorias],
	);

	const hayFiltrosActivos = Object.values(filtros).some((v) => v !== '');

	return (
		<div className={styles.wrapper}>
			<div className={styles.filtros}>
				<input
					type='text'
					placeholder='Buscar por descripción, asunto, documento o dependencia...'
					value={filtros.q}
					onChange={actualizarFiltro('q')}
					className={styles.inputTexto}
				/>

				<select
					value={filtros.categoria}
					onChange={actualizarFiltro('categoria')}
					className={styles.select}
				>
					<option value=''>Todas las categorías</option>
					{categoriasOrdenadas.map((c) => (
						<option
							key={c.nombre}
							value={c.nombre}
						>
							{c.icono} {c.nombre}
						</option>
					))}
				</select>

				<select
					value={filtros.tipo}
					onChange={actualizarFiltro('tipo')}
					className={styles.select}
				>
					<option value=''>Ingresos y egresos</option>
					<option value='egreso'>Solo egresos</option>
					<option value='ingreso'>Solo ingresos</option>
				</select>

				<label className={styles.campo}>
					<span>Desde</span>
					<input
						type='date'
						value={filtros.fechaDesde}
						onChange={actualizarFiltro('fechaDesde')}
					/>
				</label>

				<label className={styles.campo}>
					<span>Hasta</span>
					<input
						type='date'
						value={filtros.fechaHasta}
						onChange={actualizarFiltro('fechaHasta')}
					/>
				</label>

				<label className={styles.campo}>
					<span>Monto mín.</span>
					<input
						type='number'
						min='0'
						step='0.01'
						placeholder='0'
						value={filtros.montoMin}
						onChange={actualizarFiltro('montoMin')}
						className={styles.inputMonto}
					/>
				</label>

				<label className={styles.campo}>
					<span>Monto máx.</span>
					<input
						type='number'
						min='0'
						step='0.01'
						placeholder='Sin límite'
						value={filtros.montoMax}
						onChange={actualizarFiltro('montoMax')}
						className={styles.inputMonto}
					/>
				</label>

				{hayFiltrosActivos && (
					<button
						type='button'
						onClick={limpiarFiltros}
						className={styles.btnLimpiar}
					>
						Limpiar filtros
					</button>
				)}
			</div>

			{loading ? (
				<p className={styles.cargando}>Buscando movimientos...</p>
			) : resultados.length === 0 ? (
				<p className={styles.vacio}>
					No se encontraron movimientos con esos filtros.
				</p>
			) : (
				<>
					<p className={styles.contador}>
						{meta.total} resultado{meta.total === 1 ? '' : 's'}
					</p>
					<TablaMovimientos
						movimientos={resultados}
						onCategoriaChange={handleCategoriaChange}
						categorias={categorias}
						guardarCategoria={guardarCategoria}
						onGastoFijoChange={handleGastoFijoChange}
					/>
					<div className={styles.paginacion}>
						<button
							type='button'
							disabled={meta.current_page <= 1}
							onClick={() => setPage((p) => p - 1)}
							className={styles.btnPagina}
						>
							← Anterior
						</button>
						<span>
							Página {meta.current_page} de {meta.last_page}
						</span>
						<button
							type='button'
							disabled={meta.current_page >= meta.last_page}
							onClick={() => setPage((p) => p + 1)}
							className={styles.btnPagina}
						>
							Siguiente →
						</button>
					</div>
				</>
			)}
		</div>
	);
}
