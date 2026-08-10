import { useEffect, useMemo, useState } from 'react';
import { PrivacidadContext } from './privacidad-context';

const STORAGE_KEY = 'finanzas-ocultar-montos';

const getInicial = () => {
	if (typeof window === 'undefined') return false;
	return window.localStorage.getItem(STORAGE_KEY) === '1';
};

/**
 * Proveedor del contexto de privacidad de montos.
 *
 * Permite ocultar todos los valores monetarios del dashboard (por ejemplo,
 * al compartir pantalla o mostrarle la app a otra persona). La preferencia
 * se persiste en localStorage (clave: 'finanzas-ocultar-montos') para que
 * se mantenga entre sesiones.
 */
export function PrivacidadProvider({ children }) {
	const [ocultarMontos, setOcultarMontos] = useState(getInicial);

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEY, ocultarMontos ? '1' : '0');
	}, [ocultarMontos]);

	const value = useMemo(
		() => ({
			ocultarMontos,
			setOcultarMontos,
			toggleOcultarMontos: () => setOcultarMontos((v) => !v),
		}),
		[ocultarMontos],
	);

	return (
		<PrivacidadContext.Provider value={value}>
			{children}
		</PrivacidadContext.Provider>
	);
}
