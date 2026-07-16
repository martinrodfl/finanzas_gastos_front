import { useEffect, useMemo, useState } from 'react';
import { GASTOS_FIJOS } from '../utils/gastosFijos';
import styles from '../pages/Dashboard.module.css';

/**
 * Acordeón que muestra el estado de pago de los gastos fijos del mes actual.
 *
 * Para cada gasto fijo definido en GASTOS_FIJOS, determina si fue pagado
 * usando dos estrategias en orden de prioridad:
 *   1. Campo `gasto_fijo` asignado explícitamente en BD (vía PATCH /movimientos/{id}/gasto-fijo).
 *   2. Fallback automático: búsqueda de keywords en descripción y dependencia.
 *
 * El usuario puede marcar un gasto como "No aplica este mes" con el botón ×.
 * Ese estado se persiste en localStorage con clave `gastos_fijos_disabled_{YYYY-MM}`.
 *
 * @param {{
 *   movimientos: Array,
 *   mesSeleccionado: string  // formato YYYY-MM
 * }} props
 */
export default function GastosFijos({ movimientos, mesSeleccionado }) {
	const [abierta, setAbierta] = useState(true);

	// Lista de nombres de gastos marcados como "no aplica" para el mes actual
	const [desactivados, setDesactivados] = useState([]);

	// Recarga los gastos desactivados de localStorage cuando cambia el mes
	useEffect(() => {
		if (!mesSeleccionado) return;
		try {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setDesactivados(
				JSON.parse(
					localStorage.getItem(`gastos_fijos_disabled_${mesSeleccionado}`) ??
						'[]',
				),
			);
		} catch {
			setDesactivados([]);
		}
	}, [mesSeleccionado]);

	/**
	 * Alterna el estado "no aplica este mes" de un gasto fijo y persiste
	 * el listado actualizado en localStorage con clave por mes.
	 *
	 * @param {string} nombre - Nombre exacto del gasto fijo (ej: 'Alquiler')
	 */
	const toggleDesactivar = (nombre) => {
		setDesactivados((prev) => {
			const siguiente = prev.includes(nombre)
				? prev.filter((n) => n !== nombre)
				: [...prev, nombre];
			localStorage.setItem(
				`gastos_fijos_disabled_${mesSeleccionado}`,
				JSON.stringify(siguiente),
			);
			return siguiente;
		});
	};

	/**
	 * Calcula el estado de cada gasto fijo para los movimientos del mes.
	 *
	 * Prioridad 1: si algún movimiento tiene `gasto_fijo === gasto.nombre`
	 *   (asignado manualmente por el usuario), se considera pagado y se suma el débito.
	 * Prioridad 2: si no hay coincidencia por campo, busca por keywords en la
	 *   descripción y dependencia del movimiento (detección automática).
	 */
	/** Fecha (YYYY-MM-DD) más temprana entre un listado de movimientos. */
	const fechaMasTemprana = (movs) =>
		movs.reduce((min, m) => (!min || m.fecha < min ? m.fecha : min), null);

	const estadoGastosFijos = useMemo(() => {
		return GASTOS_FIJOS.map((gasto) => {
			const desactivado = desactivados.includes(gasto.nombre);

			// Prioridad 1: campo gasto_fijo guardado explícitamente en BD
			const movsPorCampo = movimientos.filter(
				(m) => Number(m.debito) > 0 && m.gasto_fijo === gasto.nombre,
			);
			if (movsPorCampo.length > 0) {
				return {
					nombre: gasto.nombre,
					pagado: true,
					monto: movsPorCampo.reduce((s, m) => s + Number(m.debito), 0),
					fecha: fechaMasTemprana(movsPorCampo),
					porCampo: true,
					desactivado,
				};
			}

			// Prioridad 2: fallback por keywords en descripción y dependencia
			const movsPorKeyword = movimientos.filter((m) => {
				if (Number(m.debito) <= 0) return false;
				const desc = (' ' + (m.descripcion ?? '') + ' ').toLowerCase();
				const dep = (' ' + (m.dependencia ?? '') + ' ').toLowerCase();
				return gasto.keywords.some(
					(kw) => desc.includes(kw) || dep.includes(kw),
				);
			});

			return {
				nombre: gasto.nombre,
				pagado: movsPorKeyword.length > 0,
				monto:
					movsPorKeyword.length > 0
						? movsPorKeyword.reduce((s, m) => s + Number(m.debito), 0)
						: null,
				fecha:
					movsPorKeyword.length > 0 ? fechaMasTemprana(movsPorKeyword) : null,
				porCampo: false,
				desactivado,
			};
		});
	}, [movimientos, desactivados]);

	// Contadores para el resumen del header (solo considera los gastos activos)
	const activos = estadoGastosFijos.filter((g) => !g.desactivado);
	const pagados = activos.filter((g) => g.pagado).length;
	const totalActivos = activos.length;
	const montoTotal = activos
		.filter((g) => g.pagado && g.monto !== null)
		.reduce((s, g) => s + g.monto, 0);

	/** Formatea un mes YYYY-MM a nombre legible (ej: "abril 2026"). */
	const formatMes = (m) => {
		if (!m) return '';
		const [year, month] = m.split('-');
		const fecha = new Date(Number(year), Number(month) - 1);
		return fecha.toLocaleDateString('es-UY', {
			month: 'long',
			year: 'numeric',
		});
	};

	// Cantidad de días del mes seleccionado, para ubicar cada chip en la línea temporal.
	const diasEnMes = useMemo(() => {
		if (!mesSeleccionado) return 30;
		const [year, month] = mesSeleccionado.split('-').map(Number);
		return new Date(year, month, 0).getDate();
	}, [mesSeleccionado]);

	// Día del mes actual, solo si el mes seleccionado es el mes en curso (para marcar "hoy").
	const diaHoy = useMemo(() => {
		const hoy = new Date();
		const hoyMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
		return hoyMes === mesSeleccionado ? hoy.getDate() : null;
	}, [mesSeleccionado]);

	/** Convierte un día del mes (1-31) en un porcentaje de posición horizontal. */
	const posicionPct = (dia) =>
		diasEnMes > 1 ? ((dia - 1) / (diasEnMes - 1)) * 100 : 0;

	// Gastos con fecha de pago detectada y activos: se ubican sobre la línea temporal.
	const conFecha = estadoGastosFijos
		.filter((g) => g.pagado && g.fecha && !g.desactivado)
		.sort((a, b) => a.fecha.localeCompare(b.fecha));

	// El resto (pendientes, desactivados o sin fecha detectada) se muestra debajo, como antes.
	const sinFecha = estadoGastosFijos.filter(
		(g) => !(g.pagado && g.fecha) || g.desactivado,
	);

	// Marcas de referencia en el eje: todos los días del mes seleccionado.
	const marcasEje = Array.from({ length: diasEnMes }, (_, i) => i + 1);

	/** Renderiza el contenido interno de un chip (icono, nombre, monto/badge, botón). */
	const renderChipContenido = (g) => (
		<>
			<span className={styles.gastoFijoIcono}>{g.pagado ? '✅' : '⚠️'}</span>
			<span
				className={`${styles.gastoFijoNombre} ${
					g.desactivado ? styles.gastoFijoNombreTachado : ''
				}`}
			>
				{g.nombre}
			</span>
			{g.pagado && g.monto !== null && (
				<span className={styles.gastoFijoMonto}>
					${g.monto.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
				</span>
			)}
			{!g.pagado && (
				<span className={styles.gastoFijoBadge}>
					{g.desactivado ? 'No aplica' : 'Pendiente'}
				</span>
			)}
			<button
				type='button'
				title={g.desactivado ? 'Activar este mes' : 'No aplica este mes'}
				className={styles.gastoFijoToggle}
				onClick={() => toggleDesactivar(g.nombre)}
			>
				{g.desactivado ? '+' : '×'}
			</button>
		</>
	);

	return (
		<div className={`${styles.bloqueCargas} ${styles.bloqueGastosFijos}`}>
			<button
				type='button'
				className={styles.bloqueTitulo}
				onClick={() => setAbierta((v) => !v)}
			>
				<span>Gastos fijos — {formatMes(mesSeleccionado)}</span>
				<span className={styles.gastosFijosResumenHeader}>
					{/* Contador pagados/total con color según estado */}
					<span
						className={
							pagados === totalActivos
								? styles.gastosFijosContadorOk
								: styles.gastosFijosContadorPendiente
						}
					>
						{pagados}/{totalActivos} pagados
					</span>
					{montoTotal > 0 && (
						<span className={styles.gastosFijosMontoTotal}>
							$
							{montoTotal.toLocaleString('es-UY', {
								minimumFractionDigits: 2,
							})}
						</span>
					)}
					<span className={styles.chevronBloque}>{abierta ? '▲' : '▼'}</span>
				</span>
			</button>

			{abierta && (
				<div className={styles.gastosFijosTimelineWrap}>
					{/* Línea temporal: chips de gastos pagados ubicados en el día que se pagaron */}
					{conFecha.length > 0 && (
						<div className={styles.timelineTrack}>
							<div className={styles.timelineAxis} />
							{marcasEje.map((dia) => (
								<div
									key={dia}
									className={styles.timelineTick}
									style={{ left: `${posicionPct(dia)}%` }}
								>
									<span
										className={`${styles.timelineTickLabel} ${
											dia % 2 === 0 ? styles.timelineTickLabelAlt : ''
										}`}
									>
										{dia}
									</span>
								</div>
							))}
							{diaHoy && (
								<div
									className={styles.timelineHoy}
									style={{ left: `${posicionPct(diaHoy)}%` }}
									title='Hoy'
								/>
							)}
							{conFecha.map((g, i) => (
								<div
									key={g.nombre}
									className={`${styles.timelineItem} ${
										i % 2 === 0
											? styles.timelineItemArriba
											: styles.timelineItemAbajo
									}`}
									style={{
										left: `${posicionPct(Number(g.fecha.split('-')[2]))}%`,
									}}
								>
									<div
										className={`${styles.gastoFijoChip} ${styles.gastoFijoChipTimeline} ${styles.gastoFijoPagado}`}
									>
										{renderChipContenido(g)}
									</div>
									<span className={styles.timelineConnector} />
									<span className={styles.timelineFecha}>
										{Number(g.fecha.split('-')[2])}
									</span>
									<span className={styles.timelineDot} />
								</div>
							))}
						</div>
					)}

					{/* Pendientes, desactivados o sin fecha detectada: grilla debajo de la línea */}
					{sinFecha.length > 0 && (
						<div className={styles.gastosFijosGrid}>
							{sinFecha.map((g) => (
								<div
									key={g.nombre}
									className={`${styles.gastoFijoChip} ${
										g.desactivado
											? styles.gastoFijoDesactivado
											: g.pagado
												? styles.gastoFijoPagado
												: styles.gastoFijoPendiente
									}`}
								>
									{renderChipContenido(g)}
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
