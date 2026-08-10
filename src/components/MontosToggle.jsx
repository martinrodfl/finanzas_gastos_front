import { usePrivacidad } from '../hooks/usePrivacidad';
import styles from './MontosToggle.module.css';

export default function MontosToggle() {
	const { ocultarMontos, toggleOcultarMontos } = usePrivacidad();

	return (
		<button
			type='button'
			className={styles.button}
			onClick={toggleOcultarMontos}
			aria-label={ocultarMontos ? 'Mostrar montos' : 'Ocultar montos'}
			title={ocultarMontos ? 'Mostrar montos' : 'Ocultar montos'}
		>
			<span aria-hidden='true'>{ocultarMontos ? '🙈' : '👁️'}</span>
			<span className={styles.label}>
				{ocultarMontos ? 'Mostrar montos' : 'Ocultar montos'}
			</span>
		</button>
	);
}
