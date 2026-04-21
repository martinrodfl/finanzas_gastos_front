import { Navigate } from 'react-router-dom';

/**
 * Guard de ruta privada. Verifica que exista un token en localStorage.
 * Si no hay token, redirige a /login sin agregar entrada al historial (replace).
 */
export default function PrivateRoute({ children }) {
	const token = localStorage.getItem('token');
	return token ? (
		children
	) : (
		<Navigate
			to='/login'
			replace
		/>
	);
}
