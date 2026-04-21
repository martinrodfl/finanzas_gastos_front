import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import CargaManual from '../components/CargaManual';
import GastosFijos from '../components/GastosFijos';
import ImportadorExcel from '../components/ImportadorExcel';
import TablaMovimientos from '../components/TablaMovimientos';
import ThemeToggle from '../components/ThemeToggle';
import VistaCategorias from '../components/VistaCategorias';
import VistaMensual from '../components/VistaMensual';
import { useCategorias } from '../hooks/useCategorias';
import styles from './Dashboard.module.css';

/**
 * Normaliza la respuesta del endpoint GET /movimientos/meses.
 * El backend puede devolver el array directamente, o envuelto en { meses } o { data }.
 *
 * @param {unknown} payload
 * @returns {string[]} Array de meses en formato YYYY-MM
 */
const normalizeMeses = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.meses)) return payload.meses;
	if (Array.isArray(payload?.data)) return payload.data;
	return [];
};

/**
 * Panel principal de la aplicación. Orquesta la carga de datos, el selector
 * de mes, las vistas de movimientos y los sub-paneles de importación, carga
 * manual y gastos fijos.
 */
export default function Dashboard() {
	// -- Estado de datos --
	const [movimientos, setMovimientos] = useState([]);
	const [meses, setMeses] = useState([]);
	const [mesSeleccionado, setMesSeleccionado] = useState('');
	const [loading, setLoading] = useState(true);        // Carga inicial del primer mes
	const [loadingMes, setLoadingMes] = useState(false); // Carga al cambiar de mes

	// -- Estado de UI --
	const [vista, setVista] = useState('tabla'); // 'tabla' | 'categorias' | 'mensual'
	const [abiertaCargas, setAbiertaCargas] = useState(false);

	const navigate = useNavigate();
	const { categorias, guardar: guardarCategoria } = useCategorias();

	// Totales del mes actual derivados de los movimientos cargados
	const totalDebito = movimientos.reduce((s, m) => s + Number(m.debito), 0);
	const totalCredito = movimientos.reduce((s, m) => s + Number(m.credito), 0);

	/**
	 * Obtiene la lista de meses con movimientos desde el backend y carga los
	 * movimientos del mes elegido (o el último disponible si no se especifica).
	 * Se usa tanto en el montaje inicial como después de importar o guardar.
	 *
	 * @param {{ mesPreferido?: string }} [opts]
	 */

	const cargarMeses = async ({ mesPreferido = '' } = {}) => {
		const { data } = await api.get('/movimientos/meses');
		const mesesNormalizados = normalizeMeses(data).sort();
		setMeses(mesesNormalizados);

		if (mesesNormalizados.length === 0) {
			setMesSeleccionado('');
			setMovimientos([]);
			setLoading(false);
			return;
		}

		const ultimoMes = mesesNormalizados[mesesNormalizados.length - 1];
		const siguienteMes =
			mesPreferido && mesesNormalizados.includes(mesPreferido)
				? mesPreferido
				: ultimoMes;

		// Si el mes a mostrar ya está seleccionado, el useEffect de mesSeleccionado
		// no se disparará (el valor no cambia), así que forzamos la recarga aquí.
		if (siguienteMes === mesSeleccionado) {
			setLoading(true);
			api
				.get('/movimientos', { params: { mes: siguienteMes } })
				.then(({ data: dataMovimientos }) => setMovimientos(dataMovimientos))
				.finally(() => setLoading(false));
			return;
		}

		setMesSeleccionado(siguienteMes);
	};

	// Carga inicial de meses al montar el componente
	useEffect(() => {
		cargarMeses().catch(() => {
			setLoading(false);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Cada vez que cambia el mes seleccionado, carga sus movimientos
	useEffect(() => {
		if (!mesSeleccionado) return;
		api
			.get('/movimientos', { params: { mes: mesSeleccionado } })
			.then(({ data }) => setMovimientos(data))
			.finally(() => {
				setLoading(false);
				setLoadingMes(false);
			});
	}, [mesSeleccionado]);

	/** Cierra la sesión eliminando el token y redirige al login. */
	const salir = () => {
		localStorage.removeItem('token');
		navigate('/login');
	};

	/**
	 * Actualiza el estado local de un movimiento cuando el usuario cambia su categoría.
	 *
	 * Si la nueva categoría no es null (es decir, fue asignada manualmente), la propaga
	 * como `categoria_regla` a todos los demás movimientos con la misma descripción.
	 * Esto permite categorizar en batch movimientos repetidos (mismo comercio).
	 *
	 * @param {number} id - ID del movimiento modificado
	 * @param {string | { categoria_manual: string | null, debito?: number, credito?: number }} payload
	 *   Puede recibir la categoría como string simple o como objeto con la respuesta del backend.
	 */
	const handleCategoriaChange = (id, payload) => {
		const categoria =
			typeof payload === 'string'
				? payload
				: (payload?.categoria_manual ?? null);

		setMovimientos((prev) => {
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

	/**
	 * Actualiza el campo `gasto_fijo` de un movimiento en el estado local
	 * después de que el PATCH al backend fue exitoso.
	 *
	 * @param {number} id - ID del movimiento
	 * @param {string | null} gastoFijo - Nombre del gasto fijo asignado, o null para limpiar
	 */
	const handleGastoFijoChange = (id, gastoFijo) => {
		setMovimientos((prev) =>
			prev.map((m) => (m.id === id ? { ...m, gasto_fijo: gastoFijo } : m)),
		);
	};

	/** Formatea un mes YYYY-MM a nombre legible en español (ej: "abril 2026"). */
	const formatMes = (m) => {
		const [year, month] = m.split('-');
		const fecha = new Date(Number(year), Number(month) - 1);
		return fecha.toLocaleDateString('es-UY', {
			month: 'long',
			year: 'numeric',
		});
	};

	const handleMesChange = (e) => {
		setLoadingMes(true);
		setMesSeleccionado(e.target.value);
	};

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<h1>Finanzas Gastos</h1>
				<div className={styles.headerAcciones}>
					<ThemeToggle />
					<button
						onClick={salir}
						className={styles.btnSalir}
					>
						Salir
					</button>
				</div>
			</header>

			<main className={styles.main}>
				{/* Acordeón único: Importar y cargar */}
				<div className={styles.bloqueCargas}>
					<button
						type='button'
						className={styles.bloqueTitulo}
						onClick={() => setAbiertaCargas((v) => !v)}
					>
						<span>Importar y cargar movimientos</span>
						<span className={styles.chevronBloque}>
							{abiertaCargas ? '▲' : '▼'}
						</span>
					</button>
					{abiertaCargas && (
						<div className={styles.cargasGrid}>
							<ImportadorExcel
								onImportado={({ mesPreferido }) =>
									cargarMeses({ mesPreferido })
								}
							/>
							<CargaManual
								categorias={categorias}
								onGuardado={(mesNuevo) =>
									cargarMeses({ mesPreferido: mesNuevo || mesSeleccionado })
								}
							/>
						</div>
					)}
				</div>

				{/* Acordeón de gastos fijos: detecta pagos automáticamente y por campo BD */}
				<GastosFijos
					movimientos={movimientos}
					mesSeleccionado={mesSeleccionado}
				/>

				{/* Selector de vista y período */}
				<div className={styles.controles}>
					<div className={styles.toggleVista}>
						<button
							className={
								vista === 'tabla' ? styles.toggleActivo : styles.toggleBtn
							}
							onClick={() => setVista('tabla')}
						>
							Gastos Mensuales
						</button>
						<button
							className={
								vista === 'categorias' ? styles.toggleActivo : styles.toggleBtn
							}
							onClick={() => setVista('categorias')}
						>
							Gastos Por Categoría
						</button>
						<button
							className={
								vista === 'mensual' ? styles.toggleActivo : styles.toggleBtn
							}
							onClick={() => setVista('mensual')}
						>
							Gastos Por Año
						</button>
					</div>

					{vista !== 'mensual' && (
						<div className={styles.filtroMes}>
							<label>Período</label>
							<select
								value={mesSeleccionado}
								onChange={handleMesChange}
							>
								{meses.map((m) => (
									<option
										key={m}
										value={m}
									>
										{formatMes(m)}
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				{/* Panel: Cards de totales */}
				{/* Tarjetas de resumen del mes (ocultas en vista anual porque VistaMensual tiene las suyas) */}
				{vista !== 'mensual' && (
					<div className={styles.resumen}>
						<div className={`${styles.tarjeta} ${styles.debito}`}>
							<span>Total egresos</span>
							<strong>
								${' '}
								{totalDebito.toLocaleString('es-UY', {
									minimumFractionDigits: 2,
								})}
							</strong>
						</div>
						<div className={`${styles.tarjeta} ${styles.credito}`}>
							<span>Total ingresos</span>
							<strong>
								${' '}
								{totalCredito.toLocaleString('es-UY', {
									minimumFractionDigits: 2,
								})}
							</strong>
						</div>
						<div className={`${styles.tarjeta} ${styles.saldo}`}>
							<span>Diferencia</span>
							<strong>
								${' '}
								{(totalCredito - totalDebito).toLocaleString('es-UY', {
									minimumFractionDigits: 2,
								})}
							</strong>
						</div>
					</div>
				)}

				{/* Contenido dinámico según la vista activa */}
				{vista === 'mensual' ? (
					<VistaMensual />
				) : loading ? (
					<p className={styles.cargando}>Cargando movimientos...</p>
				) : (
					<div
						style={{
							opacity: loadingMes ? 0.4 : 1,
							transition: 'opacity 0.2s ease',
							pointerEvents: loadingMes ? 'none' : 'auto',
						}}
					>
						{vista === 'tabla' ? (
							<TablaMovimientos
								movimientos={movimientos}
								onCategoriaChange={handleCategoriaChange}
								categorias={categorias}
								guardarCategoria={guardarCategoria}
								onGastoFijoChange={handleGastoFijoChange}
							/>
						) : (
							<VistaCategorias
								movimientos={movimientos}
								onCategoriaChange={handleCategoriaChange}
								categorias={categorias}
								guardarCategoria={guardarCategoria}
							/>
						)}
					</div>
				)}
			</main>
		</div>
	);
}
