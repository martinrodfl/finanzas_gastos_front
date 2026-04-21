import { useState, useEffect } from 'react';

/**
 * Hook que expone el ancho actual de la ventana y lo actualiza en cada resize.
 * Se usa para aplicar layouts responsivos dinámicamente desde el componente
 * sin depender solo de media queries CSS.
 *
 * @returns {{ width: number }}
 */
export const useViewport = () => {
	const [width, setWidth] = useState(window.innerWidth);

	useEffect(() => {
		const handleResize = () => {
			setWidth(window.innerWidth);
		};

		window.addEventListener('resize', handleResize);

		// limpieza como corresponde (a la vieja escuela bien hecha)
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return { width };
};
