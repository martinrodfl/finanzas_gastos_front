import { useState } from 'react';
import api from '../api/client';
import styles from '../pages/Dashboard.module.css';

/**
 * Formulario para agregar un movimiento de forma manual (sin importar Excel).
 *
 * Gestiona su propio estado de formulario internamente. Al guardar con éxito,
 * notifica al padre con el mes derivado de la fecha ingresada para que pueda
 * seleccionar ese período.
 *
 * @param {{
 *   categorias: Array<{ nombre: string, icono: string }>,
 *   onGuardado: (mesNuevo: string) => void
 * }} props
 *   - categorias: lista de categorías disponibles para el select.
 *   - onGuardado: callback invocado tras guardar exitosamente, recibe el mes
 *     en formato YYYY-MM derivado de la fecha del movimiento.
 */
export default function CargaManual({ categorias, onGuardado }) {
	const hoy = new Date().toISOString().slice(0, 10);

	const [form, setForm] = useState({
		fecha: hoy,
		tipo: 'egreso',
		descripcion: '',
		dependencia: '',
		documento: '',
		categoria: 'Otros',
		monto: '',
	});
	const [guardando, setGuardando] = useState(false);
	const [mensaje, setMensaje] = useState('');
	const [error, setError] = useState('');

	/** Actualiza un campo del formulario y limpia mensajes de estado anteriores. */
	const handleChange = (e) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
		setMensaje('');
		setError('');
	};

	/**
	 * Valida y envía el nuevo movimiento al backend vía POST /movimientos.
	 *
	 * Campos requeridos: fecha, descripción y monto. El resto es opcional.
	 * Tras guardar, limpia los campos variables (descripción, dependencia,
	 * documento, monto) conservando fecha, tipo y categoría para facilitar
	 * ingresos consecutivos.
	 *
	 * @param {React.FormEvent} e
	 */
	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!form.fecha || !form.descripcion.trim() || !form.monto) {
			setError('Completá fecha, descripción y monto.');
			return;
		}

		setGuardando(true);
		setMensaje('');
		setError('');

		try {
			const payload = {
				fecha: form.fecha,
				tipo: form.tipo,
				descripcion: form.descripcion.trim(),
				dependencia: form.dependencia.trim() || null,
				documento: form.documento.trim() || null,
				categoria: form.categoria || null,
				monto: Number(form.monto),
			};

			await api.post('/movimientos', payload);
			setMensaje('Movimiento manual guardado correctamente.');

			// Limpia solo los campos que varían entre movimientos
			setForm((prev) => ({
				...prev,
				descripcion: '',
				dependencia: '',
				documento: '',
				monto: '',
			}));

			// Notifica al padre el mes del movimiento guardado para que lo seleccione
			onGuardado(form.fecha.slice(0, 7));
		} catch (err) {
			setError(
				err?.response?.data?.message ??
					'No se pudo guardar el movimiento manual.',
			);
		} finally {
			setGuardando(false);
		}
	};

	return (
		<div className={styles.cargaManual}>
			<h3 className={styles.panelTitulo}>Cargar gasto manual</h3>
			<form
				onSubmit={handleSubmit}
				className={styles.manualForm}
			>
				<div className={styles.manualRow3}>
					<label>
						Fecha
						<input
							type='date'
							name='fecha'
							value={form.fecha}
							onChange={handleChange}
							required
						/>
					</label>
					<label>
						Tipo
						<select
							name='tipo'
							value={form.tipo}
							onChange={handleChange}
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
							value={form.monto}
							onChange={handleChange}
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
						value={form.descripcion}
						onChange={handleChange}
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
							value={form.dependencia}
							onChange={handleChange}
							placeholder='Opcional'
						/>
					</label>
					<label>
						Documento
						<input
							type='text'
							name='documento'
							value={form.documento}
							onChange={handleChange}
							placeholder='Opcional'
						/>
					</label>
				</div>

				<label>
					Categoría
					<select
						name='categoria'
						value={form.categoria}
						onChange={handleChange}
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
					disabled={guardando}
					className={styles.btnGuardarManual}
				>
					{guardando ? 'Guardando...' : 'Guardar movimiento'}
				</button>

				{mensaje && <p className={styles.mensajeImport}>{mensaje}</p>}
				{error && <p className={styles.errorImport}>{error}</p>}
			</form>
		</div>
	);
}
