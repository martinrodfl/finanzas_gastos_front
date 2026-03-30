import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import TablaMovimientos from '../components/TablaMovimientos';
import ThemeToggle from '../components/ThemeToggle';
import VistaCategorias from '../components/VistaCategorias';
import VistaMensual from '../components/VistaMensual';
import { getCategorias } from '../utils/categorias';
import styles from './Dashboard.module.css';

const normalizeMeses = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.meses)) return payload.meses;
	if (Array.isArray(payload?.data)) return payload.data;
	return [];
};

export default function Dashboard() {
	const [movimientos, setMovimientos] = useState([]);
	const [meses, setMeses] = useState([]);
	const [mesSeleccionado, setMesSeleccionado] = useState('');
	const [loading, setLoading] = useState(true);
	const [archivoExcel, setArchivoExcel] = useState(null);
	const [importandoExcel, setImportandoExcel] = useState(false);
	const [mensajeImport, setMensajeImport] = useState('');
	const [errorImport, setErrorImport] = useState('');
	const [resumenImport, setResumenImport] = useState(null);
	const [guardandoManual, setGuardandoManual] = useState(false);
	const [mensajeManual, setMensajeManual] = useState('');
	const [errorManual, setErrorManual] = useState('');
	const [abiertaCargas, setAbiertaCargas] = useState(false);
	const [manualForm, setManualForm] = useState(() => {
		const hoy = new Date().toISOString().slice(0, 10);
		return {
			fecha: hoy,
			tipo: 'egreso',
			descripcion: '',
			dependencia: '',
			documento: '',
			categoria: 'Otros',
			monto: '',
		};
	});
	const [vista, setVista] = useState('tabla');
	const navigate = useNavigate();
	const categorias = getCategorias();

	const totalDebito = movimientos.reduce((s, m) => s + Number(m.debito), 0);
	const totalCredito = movimientos.reduce((s, m) => s + Number(m.credito), 0);

	const cargarMeses = async ({ mesPreferido = '' } = {}) => {
		const { data } = await api.get('/movimientos/meses');
		const mesesNormalizados = normalizeMeses(data);
		setMeses(mesesNormalizados);

		if (mesesNormalizados.length === 0) {
			setMesSeleccionado('');
			setMovimientos([]);
			setLoading(false);
			return;
		}

		const siguienteMes =
			mesPreferido && mesesNormalizados.includes(mesPreferido)
				? mesPreferido
				: mesesNormalizados[0];

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

	useEffect(() => {
		cargarMeses().catch(() => {
			setLoading(false);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!mesSeleccionado) return;
		api
			.get('/movimientos', { params: { mes: mesSeleccionado } })
			.then(({ data }) => setMovimientos(data))
			.finally(() => setLoading(false));
	}, [mesSeleccionado]);

	const salir = () => {
		localStorage.removeItem('token');
		navigate('/login');
	};

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

	const formatMes = (m) => {
		const [year, month] = m.split('-');
		const fecha = new Date(Number(year), Number(month) - 1);
		return fecha.toLocaleDateString('es-UY', {
			month: 'long',
			year: 'numeric',
		});
	};

	const handleMesChange = (e) => {
		setLoading(true);
		setMesSeleccionado(e.target.value);
	};

	const handleArchivoChange = (e) => {
		const archivo = e.target.files?.[0] ?? null;
		setArchivoExcel(archivo);
		setMensajeImport('');
		setErrorImport('');
		setResumenImport(null);
	};

	const handleImportarExcel = async () => {
		if (!archivoExcel) {
			setErrorImport('Seleccioná un archivo Excel antes de importar.');
			return;
		}

		setImportandoExcel(true);
		setMensajeImport('');
		setErrorImport('');
		setResumenImport(null);

		try {
			const formData = new FormData();
			formData.append('file', archivoExcel);

			const { data } = await api.post('/movimientos/import', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			});

			setMensajeImport(data?.message ?? 'Importación completada.');
			setResumenImport(data?.resumen ?? null);
			setArchivoExcel(null);
			await cargarMeses({ mesPreferido: mesSeleccionado });
		} catch (error) {
			const mensaje =
				error?.response?.data?.error ??
				error?.response?.data?.message ??
				'No se pudo importar el archivo.';
			setErrorImport(mensaje);
		} finally {
			setImportandoExcel(false);
		}
	};

	const handleManualChange = (e) => {
		const { name, value } = e.target;
		setManualForm((prev) => ({ ...prev, [name]: value }));
		setMensajeManual('');
		setErrorManual('');
	};

	const handleGuardarManual = async (e) => {
		e.preventDefault();

		if (
			!manualForm.fecha ||
			!manualForm.descripcion.trim() ||
			!manualForm.monto
		) {
			setErrorManual('Completá fecha, descripción y monto.');
			return;
		}

		setGuardandoManual(true);
		setMensajeManual('');
		setErrorManual('');

		try {
			const payload = {
				fecha: manualForm.fecha,
				tipo: manualForm.tipo,
				descripcion: manualForm.descripcion.trim(),
				dependencia: manualForm.dependencia.trim() || null,
				documento: manualForm.documento.trim() || null,
				categoria: manualForm.categoria || null,
				monto: Number(manualForm.monto),
			};

			await api.post('/movimientos', payload);
			setMensajeManual('Movimiento manual guardado correctamente.');
			setManualForm((prev) => ({
				...prev,
				descripcion: '',
				dependencia: '',
				documento: '',
				monto: '',
			}));

			const mesNuevo = manualForm.fecha.slice(0, 7);
			await cargarMeses({ mesPreferido: mesNuevo || mesSeleccionado });
		} catch (error) {
			const mensaje =
				error?.response?.data?.message ??
				'No se pudo guardar el movimiento manual.';
			setErrorManual(mensaje);
		} finally {
			setGuardandoManual(false);
		}
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
							{/* Panel: Importar Excel */}
							<div className={styles.importadorExcel}>
								<h3 className={styles.panelTitulo}>Importar desde Excel</h3>
								<div className={styles.importadorControles}>
									<input
										id='archivo-excel-input'
										type='file'
										accept='.xlsx,.xls'
										onChange={handleArchivoChange}
										className={styles.fileInput}
									/>
									<label
										htmlFor='archivo-excel-input'
										className={`${styles.btnAccion} ${styles.btnExaminar}`}
									>
										<span className={styles.iconoBoton}>📁</span>
										<span>Examinar</span>
									</label>
									<input
										type='text'
										className={styles.archivoInputPreview}
										value={archivoExcel?.name ?? 'Ningún archivo seleccionado'}
										readOnly
										aria-label='Archivo seleccionado'
									/>
									<button
										type='button'
										onClick={handleImportarExcel}
										disabled={importandoExcel}
										className={`${styles.btnAccion} ${styles.btnImportar}`}
									>
										<span className={styles.iconoBoton}>⬆</span>
										<span>
											{importandoExcel ? 'Importando...' : 'Cargar Excel'}
										</span>
									</button>
								</div>
								{archivoExcel && (
									<p className={styles.archivoSeleccionado}>
										Archivo: {archivoExcel.name}
									</p>
								)}
								{mensajeImport && (
									<p className={styles.mensajeImport}>{mensajeImport}</p>
								)}
								{resumenImport && (
									<div className={styles.resumenImport}>
										<span>
											Total filas: <strong>{resumenImport.total_filas}</strong>
										</span>
										<span>
											Guardados:{' '}
											<strong>
												{resumenImport.guardados > 0 ? (
													resumenImport.guardados
												) : (
													<span>0</span>
												)}
											</strong>
										</span>
										<span>
											Duplicados: <strong>{resumenImport.duplicados}</strong>
										</span>
										<span>
											Vacíos omitidos:{' '}
											<strong>{resumenImport.omitidos_vacios}</strong>
										</span>
										{resumenImport.periodo?.desde && (
											<span>
												Período: <strong>{resumenImport.periodo.desde}</strong>{' '}
												→ <strong>{resumenImport.periodo.hasta}</strong>
											</span>
										)}
									</div>
								)}
								{errorImport && (
									<p className={styles.errorImport}>{errorImport}</p>
								)}
							</div>

							{/* Panel: Carga manual */}
							<div className={styles.cargaManual}>
								<h3 className={styles.panelTitulo}>Cargar gasto manual</h3>
								<form
									onSubmit={handleGuardarManual}
									className={styles.manualForm}
								>
									<div className={styles.manualRow3}>
										<label>
											Fecha
											<input
												type='date'
												name='fecha'
												value={manualForm.fecha}
												onChange={handleManualChange}
												required
											/>
										</label>
										<label>
											Tipo
											<select
												name='tipo'
												value={manualForm.tipo}
												onChange={handleManualChange}
											>
												<option value='egreso'>Egreso</option>
												<option value='ingreso'>Ingreso</option>
											</select>
										</label>
										<label>
											Monto
											<input
												type='number'
												name='monto'
												value={manualForm.monto}
												onChange={handleManualChange}
												min='0.01'
												step='0.01'
												placeholder='0.00'
												required
											/>
										</label>
									</div>

									<label>
										Descripción
										<input
											type='text'
											name='descripcion'
											value={manualForm.descripcion}
											onChange={handleManualChange}
											placeholder='Ej: Almacen barrio'
											required
										/>
									</label>

									<div className={styles.manualRow2}>
										<label>
											Dependencia
											<input
												type='text'
												name='dependencia'
												value={manualForm.dependencia}
												onChange={handleManualChange}
												placeholder='Opcional'
											/>
										</label>
										<label>
											Documento
											<input
												type='text'
												name='documento'
												value={manualForm.documento}
												onChange={handleManualChange}
												placeholder='Opcional'
											/>
										</label>
									</div>

									<label>
										Categoría
										<select
											name='categoria'
											value={manualForm.categoria}
											onChange={handleManualChange}
										>
											{categorias.map((cat) => (
												<option
													key={cat.nombre}
													value={cat.nombre}
												>
													{cat.icono} {cat.nombre}
												</option>
											))}
										</select>
									</label>

									<button
										type='submit'
										disabled={guardandoManual}
										className={styles.btnGuardarManual}
									>
										{guardandoManual ? 'Guardando...' : 'Guardar movimiento'}
									</button>
									{mensajeManual && (
										<p className={styles.mensajeImport}>{mensajeManual}</p>
									)}
									{errorManual && (
										<p className={styles.errorImport}>{errorManual}</p>
									)}
								</form>
							</div>
						</div>
					)}
				</div>

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

				{vista === 'mensual' ? (
					<VistaMensual />
				) : loading ? (
					<p className={styles.cargando}>Cargando movimientos...</p>
				) : vista === 'tabla' ? (
					<TablaMovimientos
						movimientos={movimientos}
						onCategoriaChange={handleCategoriaChange}
					/>
				) : (
					<VistaCategorias
						movimientos={movimientos}
						onCategoriaChange={handleCategoriaChange}
					/>
				)}
			</main>
		</div>
	);
}
