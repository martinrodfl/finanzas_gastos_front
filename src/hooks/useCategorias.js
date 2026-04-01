import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { CATEGORIAS, CATEGORIA_OTROS } from '../utils/categorias';

// Mapa local para lookup rápido de color y palabras por nombre de categoría
const LOCAL_MAP = new Map(
	[...CATEGORIAS, CATEGORIA_OTROS].map((c) => [c.nombre.toLowerCase(), c]),
);

// Caché a nivel de módulo: evita múltiples fetches ante StrictMode o re-renders
let _cache = null;
let _inflight = null;

function fetchCategorias() {
	if (_cache) return Promise.resolve(_cache);
	if (_inflight) return _inflight;
	_inflight = api
		.get('/categorias-personalizadas')
		.then(({ data }) => {
			const backendCats = Array.isArray(data) ? data : [];
			const enriquecidas = backendCats.map((cat) => {
				const local = LOCAL_MAP.get(cat.nombre.toLowerCase());
				return {
					nombre: cat.nombre,
					icono: cat.icono,
					color: local?.color ?? 'var(--color-category-otros)',
					palabras: local?.palabras ?? [],
				};
			});
			if (enriquecidas.length > 0) _cache = enriquecidas;
			return _cache;
		})
		.finally(() => {
			_inflight = null;
		});
	return _inflight;
}

export function useCategorias() {
	// Inicializar con categorías locales como fallback inmediato (sin flash vacío)
	const [categorias, setCategorias] = useState(() => [
		...CATEGORIAS,
		CATEGORIA_OTROS,
	]);
	const [cargando, setCargando] = useState(true);

	const cargar = useCallback(async () => {
		try {
			setCargando(true);
			const resultado = await fetchCategorias();
			if (resultado) setCategorias(resultado);
		} catch {
			// Si falla la carga, se mantiene el fallback local ya inicializado
		} finally {
			setCargando(false);
		}
	}, []);

	// Guarda una categoría nueva (patron = null) en el backend
	const guardar = useCallback(
		async (nombre, icono) => {
			try {
				await api.post('/categorias-personalizadas', { nombre, icono });
				_cache = null; // invalida caché para forzar re-fetch
				await cargar();
			} catch (error) {
				console.error('Error guardando categoría:', error);
			}
		},
		[cargar],
	);

	useEffect(() => {
		cargar();
	}, [cargar]);

	return { categorias, cargando, guardar, recargar: cargar };
}
