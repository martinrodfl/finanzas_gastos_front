import { useContext } from 'react';
import { PrivacidadContext } from '../context/privacidad-context';

/**
 * Hook para acceder al contexto de privacidad de montos desde cualquier componente.
 * Debe usarse dentro del árbol de PrivacidadProvider; lanza un error si no es así.
 *
 * @returns {{ ocultarMontos: boolean, setOcultarMontos: Function, toggleOcultarMontos: Function }}
 */
export function usePrivacidad() {
	const context = useContext(PrivacidadContext);

	if (!context) {
		throw new Error('usePrivacidad debe usarse dentro de PrivacidadProvider');
	}

	return context;
}
