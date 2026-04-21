import { useState } from 'react';
import api from '../api/client';
import styles from '../pages/Dashboard.module.css';

/**
 * Panel de importación de movimientos desde un archivo Excel (.xlsx/.xls).
 *
 * Gestiona la selección del archivo, el envío al backend como multipart/form-data
 * y la presentación del resumen de resultados (filas procesadas, guardadas,
 * duplicadas y vacías omitidas).
 *
 * @param {{ onImportado: (opts: { mesPreferido: string }) => void }} props
 *   - onImportado: callback que se invoca tras una importación exitosa para que
 *     el padre recargue la lista de meses y seleccione el período importado.
 */
export default function ImportadorExcel({ onImportado }) {
	const [archivoExcel, setArchivoExcel] = useState(null);
	const [importando, setImportando] = useState(false);
	const [mensaje, setMensaje] = useState('');
	const [error, setError] = useState('');
	const [resumen, setResumen] = useState(null);

	/** Almacena el archivo elegido y limpia mensajes de resultados anteriores. */
	const handleArchivoChange = (e) => {
		const archivo = e.target.files?.[0] ?? null;
		setArchivoExcel(archivo);
		setMensaje('');
		setError('');
		setResumen(null);
	};

	/**
	 * Envía el archivo al endpoint POST /movimientos/import como multipart/form-data.
	 * El backend devuelve { message, resumen: { total_filas, guardados, duplicados,
	 * omitidos_vacios, periodo: { desde, hasta } } }.
	 * Si tiene éxito, notifica al padre con el mes del último movimiento importado.
	 */
	const handleImportarExcel = async () => {
		if (!archivoExcel) {
			setError('Seleccioná un archivo Excel antes de importar.');
			return;
		}

		setImportando(true);
		setMensaje('');
		setError('');
		setResumen(null);

		try {
			const formData = new FormData();
			formData.append('file', archivoExcel);

			const { data } = await api.post('/movimientos/import', formData, {
				// Content-Type multipart/form-data con boundary lo establece el navegador automáticamente
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			setMensaje(data?.message ?? 'Importación completada.');
			setResumen(data?.resumen ?? null);
			setArchivoExcel(null);

			// Deriva el mes del período importado para que el padre lo seleccione
			const mesImportado = data?.resumen?.periodo?.hasta?.slice(0, 7) ?? '';
			onImportado({ mesPreferido: mesImportado });
		} catch (err) {
			const mensajeError =
				err?.response?.data?.error ??
				err?.response?.data?.message ??
				'No se pudo importar el archivo.';
			setError(mensajeError);
		} finally {
			setImportando(false);
		}
	};

	return (
		<div className={styles.importadorExcel}>
			<h3 className={styles.panelTitulo}>Importar desde Excel</h3>
			<div className={styles.importadorControles}>
				{/* Input nativo oculto — se activa mediante el label "Examinar" para estilizar el botón */}
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
					disabled={importando}
					className={`${styles.btnAccion} ${styles.btnImportar}`}
				>
					<span className={styles.iconoBoton}>⬆</span>
					<span>{importando ? 'Importando...' : 'Cargar Excel'}</span>
				</button>
			</div>

			{archivoExcel && (
				<p className={styles.archivoSeleccionado}>
					Archivo: {archivoExcel.name}
				</p>
			)}

			{mensaje && <p className={styles.mensajeImport}>{mensaje}</p>}

			{/* Resumen detallado con los contadores devueltos por el backend */}
			{resumen && (
				<div className={styles.resumenImport}>
					<span>
						Total filas: <strong>{resumen.total_filas}</strong>
					</span>
					<span>
						Guardados: <strong>{resumen.guardados}</strong>
					</span>
					<span>
						Duplicados: <strong>{resumen.duplicados}</strong>
					</span>
					<span>
						Vacíos omitidos: <strong>{resumen.omitidos_vacios}</strong>
					</span>
					{resumen.periodo?.desde && (
						<span>
							Período: <strong>{resumen.periodo.desde}</strong> →{' '}
							<strong>{resumen.periodo.hasta}</strong>
						</span>
					)}
				</div>
			)}

			{error && <p className={styles.errorImport}>{error}</p>}
		</div>
	);
}
