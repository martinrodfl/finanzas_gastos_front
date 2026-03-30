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

export default function VistaMensual() {
	const [datos, setDatos] = useState([]);
	const [loading, setLoading] = useState(true);

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

	const formatMes = (m) => {
		const [year, month] = m.split('-');
		const fecha = new Date(Number(year), Number(month) - 1);
		return fecha.toLocaleDateString('es-UY', {
			month: 'long',
			year: 'numeric',
		});
	};

	const datosAsc = [...datos].reverse();
	const { maxEscala, marcas } = construirEscala(maxValor);

	const totalEgresos = datos.reduce((s, d) => s + Number(d.total_debito), 0);
	const totalIngresos = datos.reduce((s, d) => s + Number(d.total_credito), 0);

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
				<h3 className={styles.graficoTitulo}>Evolución mensual</h3>
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
				<div className={styles.leyenda}>
					<span className={styles.leyendaEgreso}>■ Egresos</span>
					<span className={styles.leyendaIngreso}>■ Ingresos</span>
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
							<th>Proporción</th>
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
