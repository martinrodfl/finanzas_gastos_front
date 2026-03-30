import { useTheme } from '../hooks/useTheme';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const isDark = theme === 'dark';

	return (
		<button
			type='button'
			className={styles.button}
			onClick={toggleTheme}
			aria-label={`Activar modo ${isDark ? 'claro' : 'oscuro'}`}
			title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
		>
			<span
				className={`${styles.track} ${isDark ? styles.trackDark : ''}`}
				aria-hidden='true'
			>
				<span className={`${styles.thumb} ${isDark ? styles.thumbDark : ''}`} />
			</span>
			<span className={styles.label}>{isDark ? 'Oscuro' : 'Claro'}</span>
		</button>
	);
}
