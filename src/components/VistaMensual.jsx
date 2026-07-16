import { useEffect, useState } from 'react';
import api from '../api/client';
import styles from './VistaMensual.module.css';

const normalizeResumen = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.resumen)) return payload.resumen;
	if (Array.isArray(payload?.data)) return payload.data;
	return [];
};

const construirEscala = (maxValor, segmentos = 5) => {
	if (maxValor <= 0) {
		return { maxEscala: 1, marcas: [1, 0.8, 0.6, 0.4, 0.2, 0] };
	}

	const bruto = maxValor / segmentos;
	const base = 10 ** Math.floor(Math.log10(bruto));
	const normalizado = bruto / base;

	let factor = 1;
	if (normalizado > 5) factor = 10;
	else if (normalizado > 2) factor = 5;
	else if (normalizado > 1) factor = 2;

	const paso = factor * base;
	const maxEscala = Math.ceil(maxValor / paso) * paso;
	const marcas = Array.from({ length: segmentos + 1 }, (_, i) => {
		const valor = maxEscala - i * paso;
		const normalizado = Math.max(0, valor);
		return Number(normalizado.toFixed(6));
	});

	return { maxEscala, marcas };
};

const TIPOS_GRAFICO = [
	{ id: 'barras', label: 'Barras' },
	{ id: 'lineas', label: 'L\u00edneas' },
	{ id: 'area', label: '\u00c1rea' },
];

// Dimensiones del SVG (unidades de viewBox)
const SVG_W = 700;
const SVG_H = 240;
const AXIS_W = 50;
const PAD_R = 10;
const PAD_T = 8;
const PAD_B = 28;
const PLOT_H = SVG_H - PAD_T - PAD_B;

export default function VistaMensual() {
	const [datos, setDatos] = useState([]);
	const [loading, setLoading] = useState(true);
	const [tipoGrafico, setTipoGrafico] = useState('barras');

	useEffect(() => {
		api
			.get('/movimientos/resumen')
			.then(({ data }) => setDatos(normalizeResumen(data)))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <p className={styles.cargando}>Cargando...</p>;
	if (datos.length === 0) {
		return <p className={styles.cargando}>No hay datos disponibles.</p>;
	}

	const maxValor = Math.max(
		...datos.flatMap((d) => [Number(d.total_debito), Number(d.total_credito)]),
		1,
	);

	const fmt = (n) => {
		const saneado = Math.abs(Number(n)) < 1e-6 ? 0 : Number(n);
		return `$ ${saneado.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
	};

	/** Formato compacto para etiquetas del eje Y en SVG (evita textos muy largos). */
	const fmtEje = (n) => {
		const v = Math.abs(Number(n)) < 1e-6 ? 0 : Number(n);
		if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
		if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
		return v.toLocaleString('es-UY', { maximumFractionDigits: 0 });
	};

	const formatMes = (m) => {
		const [year, month] = m.split('-');
		const fecha = new Date(Number(year), Number(month) - 1);
		return fecha.toLocaleDateString('es-UY', {
			month: 'long',
			year: 'numeric',
		});
	};

	const fmtShort = (m) => {
		const [y, mo] = m.split('-');
		return new Date(Number(y), Number(mo) - 1)
			.toLocaleDateString('es-UY', { month: 'short' })
			.replace('.', '');
	};

	const datosAsc = [...datos].reverse();
	const { maxEscala, marcas } = construirEscala(maxValor);
	const n = datosAsc.length;

	const totalEgresos = datos.reduce((s, d) => s + Number(d.total_debito), 0);
	const totalIngresos = datos.reduce((s, d) => s + Number(d.total_credito), 0);

	// Helpers de coordenadas SVG
	const plotW = SVG_W - AXIS_W - PAD_R;
	const xOf = (i) => AXIS_W + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
	const yOf = (val) => PAD_T + PLOT_H - (Math.max(0, val) / maxEscala) * PLOT_H;
	const baseline = PAD_T + PLOT_H;

	const egresoPoints = datosAsc
		.map((d, i) => `${xOf(i)},${yOf(Number(d.total_debito))}`)
		.join(' ');
	const ingresoPoints = datosAsc
		.map((d, i) => `${xOf(i)},${yOf(Number(d.total_credito))}`)
		.join(' ');
	const egresoArea = `${xOf(0)},${baseline} ${egresoPoints} ${xOf(n - 1)},${baseline}`;
	const ingresoArea = `${xOf(0)},${baseline} ${ingresoPoints} ${xOf(n - 1)},${baseline}`;

	const renderSvgChart = (filled) => (
		<svg
			viewBox={`0 0 ${SVG_W} ${SVG_H}`}
			className={styles.svgGrafico}
			aria-label="Gr\u00e1fico de evoluci\u00f3n mensual"
		>
			{/* L\u00edneas gu\u00eda y etiquetas del eje Y */}
			{marcas.map((valor, i) => {
				const y = PAD_T + (i / (marcas.length - 1)) * PLOT_H;
				return (
					<g key={i}>
						<line
							x1={AXIS_W}
							y1={y}
							x2={SVG_W - PAD_R}
							y2={y}
							className={styles.svgGuia}
						/>
						<text
							x={AXIS_W - 4}
							y={y + 3}
							textAnchor="end"
							fontSize={8}
							className={styles.svgYLabel}
						>
							{fmtEje(valor)}
						</text>
					</g>
				);
			})}

			{/* L\u00ednea base */}
			<line
				x1={AXIS_W}
				y1={baseline}
				x2={SVG_W - PAD_R}
				y2={baseline}
				className={styles.svgBaseline}
			/>

			{filled ? (
				<>
					<polygon points={egresoArea} className={styles.svgAreaEgreso} />
					<polygon points={ingresoArea} className={styles.svgAreaIngreso} />
					<polyline
						points={egresoPoints}
						className={styles.svgLineEgreso}
						fill="none"
					/>
					<polyline
						points={ingresoPoints}
						className={styles.svgLineIngreso}
						fill="none"
					/>
				</>
			) : (
				<>
					<polyline
						points={egresoPoints}
						className={styles.svgLineEgreso}
						fill="none"
					/>
					<polyline
						points={ingresoPoints}
						className={styles.svgLineIngreso}
						fill="none"
					/>
				</>
			)}

			{/* Puntos de datos */}
			{datosAsc.map((d, i) => (
				<g key={d.mes}>
					<circle
						cx={xOf(i)}
						cy={yOf(Number(d.total_debito))}
						r={4}
						className={styles.svgDotEgreso}
					>
						<title>{`${fmtShort(d.mes)} \u2014 Egresos: ${fmt(Number(d.total_debito))}`}</title>
					</circle>
					<circle
						cx={xOf(i)}
						cy={yOf(Number(d.total_credito))}
						r={4}
						className={styles.svgDotIngreso}
					>
						<title>{`${fmtShort(d.mes)} \u2014 Ingresos: ${fmt(Number(d.total_credito))}`}</title>
					</circle>
				</g>
			))}

			{/* Etiquetas de mes */}
			{datosAsc.map((d, i) => (
				<text
					key={`lbl-${d.mes}`}
					x={xOf(i)}
					y={SVG_H - 5}
					textAnchor="middle"
					fontSize={9}
					className={styles.svgLabel}
				>
					{fmtShort(d.mes)}
				</text>
			))}
		</svg>
	);

	const renderGrafico = () => {
		if (tipoGrafico === 'barras') {
			return (
				<div className={styles.graficoLayout}>
					<div className={styles.ejeY}>
						{marcas.map((valor, indice) => (
							<span key={`${valor}-${indice}`}>{fmt(valor)}</span>
						))}
					</div>
					<div className={styles.graficoArea}>
						<div className={styles.lineasGuia}>
							{marcas.map((valor, indice) => (
								<div
									key={`linea-${valor}-${indice}`}
									className={styles.lineaGuia}
								/>
							))}
						</div>
						<div className={styles.grafico}>
							{datosAsc.map((d) => {
								const egreso = Math.max(0, Number(d.total_debito));
								const ingreso = Math.max(0, Number(d.total_credito));
								const pctEgreso = (egreso / maxEscala) * 100;
								const pctIngreso = (ingreso / maxEscala) * 100;
								const [year, month] = d.mes.split('-');
								const label = new Date(Number(year), Number(month) - 1)
									.toLocaleDateString('es-UY', { month: 'short' })
									.replace('.', '');
								return (
									<div
										key={d.mes}
										className={styles.columna}
									>
										<div className={styles.barras}>
											<div className={styles.barraWrap}>
												<div
													className={`${styles.barra} ${styles.barraEgreso}`}
													style={{ height: `${pctEgreso}%` }}
													title={`Egresos: ${fmt(egreso)}`}
												/>
											</div>
											<div className={styles.barraWrap}>
												<div
													className={`${styles.barra} ${styles.barraIngreso}`}
													style={{ height: `${pctIngreso}%` }}
													title={`Ingresos: ${fmt(ingreso)}`}
												/>
											</div>
										</div>
										<span className={styles.labelMes}>{label}</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			);
		}
		if (tipoGrafico === 'lineas') return renderSvgChart(false);
		return renderSvgChart(true);
	};

	return (
		<div className={styles.contenedor}>
			<div className={styles.resumenGlobal}>
				<div className={`${styles.pill} ${styles.pillEgreso}`}>
					<span>Total egresos (todos los meses)</span>
					<strong>{fmt(totalEgresos)}</strong>
				</div>
				<div className={`${styles.pill} ${styles.pillIngreso}`}>
					<span>Total ingresos (todos los meses)</span>
					<strong>{fmt(totalIngresos)}</strong>
				</div>
				<div className={`${styles.pill} ${styles.pillSaldo}`}>
					<span>Balance general</span>
					<strong
						className={
							totalIngresos - totalEgresos >= 0
								? styles.balancePositivo
								: styles.balanceNegativo
						}
					>
						{fmt(totalIngresos - totalEgresos)}
					</strong>
				</div>
			</div>

			<div className={styles.graficoCard}>
				<div className={styles.graficoHeader}>
					<h3 className={styles.graficoTitulo}>Evoluci\u00f3n mensual</h3>
					<div className={styles.toggleGrafico}>
						{TIPOS_GRAFICO.map((t) => (
							<button
								key={t.id}
								className={
									tipoGrafico === t.id
										? styles.toggleGraficoActivo
										: styles.toggleGraficoBtn
								}
								onClick={() => setTipoGrafico(t.id)}
							>
								{t.label}
							</button>
						))}
					</div>
				</div>
				{renderGrafico()}
				<div className={styles.leyenda}>
					<span className={styles.leyendaEgreso}>&#9632; Egresos</span>
					<span className={styles.leyendaIngreso}>&#9632; Ingresos</span>
				</div>
			</div>

			<div className={styles.tablaCard}>
				<table className={styles.tabla}>
					<thead>
						<tr>
							<th>Mes</th>
							<th className={styles.monto}>Egresos</th>
							<th className={styles.monto}>Ingresos</th>
							<th className={styles.monto}>Balance</th>
							<th>Proporci\u00f3n</th>
						</tr>
					</thead>
					<tbody>
						{datos.map((d) => {
							const egreso = Number(d.total_debito);
							const ingreso = Number(d.total_credito);
							const balance = ingreso - egreso;
							const total = egreso + ingreso || 1;
							const pctEgreso = (egreso / total) * 100;
							return (
								<tr key={d.mes}>
									<td className={styles.mesTd}>{formatMes(d.mes)}</td>
									<td className={`${styles.monto} ${styles.colorEgreso}`}>
										{fmt(egreso)}
									</td>
									<td className={`${styles.monto} ${styles.colorIngreso}`}>
										{fmt(ingreso)}
									</td>
									<td
										className={`${styles.monto} ${
											balance >= 0
												? styles.balancePositivo
												: styles.balanceNegativo
										}`}
									>
										{fmt(balance)}
									</td>
									<td>
										<div className={styles.propWrapper}>
											<div
												className={styles.propEgreso}
												style={{ width: `${pctEgreso}%` }}
												title={`Egresos ${pctEgreso.toFixed(0)}%`}
											/>
											<div
												className={styles.propIngreso}
												style={{ width: `${100 - pctEgreso}%` }}
												title={`Ingresos ${(100 - pctEgreso).toFixed(0)}%`}
											/>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
