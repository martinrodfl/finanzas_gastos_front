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

/**
 * Obtiene las categorías personalizadas del backend y las enriquece con
 * los datos locales (color, palabras clave) usando LOCAL_MAP.
 *
 * Implementa un patrón de caché + inflight para evitar llamadas duplicadas
 * en StrictMode: si ya hay una petición en vuelo (_inflight), devuelve
 * la misma promesa; si ya hay resultado cacheado (_cache), lo devuelve directo.
 */
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

/**
 * Hook que provee la lista de categorías disponibles.
 *
 * Combina las categorías locales predefinidas (CATEGORIAS + CATEGORIA_OTROS)
 * con las personalizadas almacenadas en el backend. Las locales se usan
 * como fallback inmediato para evitar un flash vacío en el render inicial.
 *
 * Usa un caché a nivel de módulo (_cache/_inflight) para evitar múltiples
 * peticiones en paralelo, lo que ocurre en React StrictMode por el doble
 * montaje de componentes en desarrollo.
 *
 * @returns {{ categorias: Array, cargando: boolean, guardar: Function, recargar: Function }}
 */
export function useCategorias() {
	// Inicializar con categorías locales como fallback inmediato (sin flash vacío)
	const [categorias, setCategorias] = useState(() => [
		...CATEGORIAS,
		CATEGORIA_OTROS,
	]);
	const [cargando, setCargando] = useState(true);

	/**
	 * Dispara fetchCategorias() y actualiza el estado local.
	 * Si falla, el fallback local (inicializado en useState) permanece.
	 */
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
	/**
	 * Crea o actualiza una categoría personalizada en el backend.
	 * Invalida el caché de módulo para forzar un re-fetch en el próximo uso.
	 *
	 * @param {string} nombre
	 * @param {string} icono
	 */
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
