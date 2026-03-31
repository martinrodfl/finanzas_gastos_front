import { useState, useEffect } from 'react';

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
