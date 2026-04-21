import { useContext } from 'react';
import { ThemeContext } from '../context/theme-context';

/**
 * Hook para acceder al contexto de tema desde cualquier componente.
 * Debe usarse dentro del árbol de ThemeProvider; lanza un error si no es así.
 *
 * @returns {{ theme: 'light'|'dark', setTheme: Function, toggleTheme: Function }}
 */
export function useTheme() {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error('useTheme debe usarse dentro de ThemeProvider');
	}

	return context;
}
