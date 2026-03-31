import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import styles from './Login.module.css';

const ENV_USERNAME = import.meta.env.VITE_LOGIN_USERNAME ?? 'admin';
const ENV_PASSWORD = import.meta.env.VITE_LOGIN_PASSWORD ?? '';

export default function Login() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			if (!ENV_PASSWORD) {
				setError('Configurá VITE_LOGIN_PASSWORD en el archivo .env');
				return;
			}

			const userOk = username.trim() === ENV_USERNAME;
			const passOk = password === ENV_PASSWORD;

			if (!userOk || !passOk) {
				setError('Usuario o contraseña incorrectos');
				return;
			}

			localStorage.setItem('token', 'local-env-auth');
			navigate('/dashboard');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.card}>
				<h1 className={styles.titulo}>Finanzas Gastos</h1>
				<p className={styles.subtitulo}>
					Iniciá sesión para ver tus movimientos
				</p>

				<form
					onSubmit={handleSubmit}
					className={styles.form}
					autoComplete='on'
				>
					<div className={styles.campo}>
						<label>Usuario</label>
						<input
							type='text'
							name='username'
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder='admin'
							autoComplete='username'
							required
							autoFocus
						/>
					</div>

					<div className={styles.campo}>
						<label>Contraseña</label>
						<input
							type='password'
							name='password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder='••••••••'
							autoComplete='current-password'
							required
						/>
					</div>

					{error && <p className={styles.error}>{error}</p>}

					<button
						type='submit'
						className={styles.boton}
						disabled={loading}
					>
						{loading ? 'Ingresando...' : 'Ingresar'}
					</button>
				</form>
			</div>
		</div>
	);
}
