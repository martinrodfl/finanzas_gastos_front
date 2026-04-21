/**
 * Cliente HTTP para comunicarse con el backend Laravel.
 *
 * - Agrega automáticamente el header Authorization con el token de localStorage.
 * - Maneja FormData (multipart) y JSON transparentemente.
 * - En respuestas 401, elimina el token y redirige a /login.
 * - Normaliza los errores HTTP en objetos con .response.status y .response.data.
 */

const rawBaseUrl =
	import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
const baseURL = rawBaseUrl.replace(/\/+$/, '');

const isFormData = (value) =>
	typeof FormData !== 'undefined' && value instanceof FormData;

/**
 * Construye la URL completa a partir del path y los query params.
 * Ignora parámetros null, undefined o string vacío para no ensuciar la URL.
 *
 * @param {string} path - Ruta relativa (ej: '/movimientos')
 * @param {object} [params] - Query params a agregar
 * @returns {string} URL absoluta
 */
const buildUrl = (path, params) => {
	const safePath = path.startsWith('/') ? path : `/${path}`;
	const url = new URL(`${baseURL}${safePath}`);

	if (params && typeof params === 'object') {
		Object.entries(params).forEach(([key, value]) => {
			if (value === null || value === undefined || value === '') return;
			url.searchParams.append(key, String(value));
		});
	}

	return url.toString();
};

/**
 * Normaliza una respuesta HTTP errónea en un Error con .response adjunto.
 * Intenta parsear el cuerpo como JSON; si no puede, lo trata como texto plano.
 *
 * @param {Response} response - Respuesta fetch con status >= 400
 * @returns {Promise<Error>}
 */
const buildError = async (response) => {
	let data = null;

	try {
		const contentType = response.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			data = await response.json();
		} else {
			const text = await response.text();
			data = text ? { message: text } : null;
		}
	} catch {
		data = null;
	}

	const error = new Error(
		data?.message ?? data?.error ?? `HTTP error ${response.status}`,
	);
	error.response = {
		status: response.status,
		data,
	};

	return error;
};

/**
 * Función base para todos los métodos HTTP.
 *
 * - Si el body es FormData, deja que el navegador establezca el Content-Type
 *   (multipart/form-data con boundary correcto).
 * - Si es un objeto, lo serializa como JSON y agrega el header correspondiente.
 * - En respuesta 204 (No Content), devuelve { data: null }.
 * - En respuesta 401, limpia el token y fuerza redirect a /login.
 *
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {string} path
 * @param {object|FormData|null} [body]
 * @param {{ params?: object, headers?: object }} [config]
 * @returns {Promise<{ data: unknown }>}
 */
const request = async (method, path, body, config = {}) => {
	const token = localStorage.getItem('token');
	const headers = {
		...(config.headers ?? {}),
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const options = {
		method,
		headers,
	};

	if (body !== undefined && body !== null) {
		if (isFormData(body)) {
			// El navegador define multipart boundary automáticamente.
			delete options.headers['Content-Type'];
			delete options.headers['content-type'];
			options.body = body;
		} else {
			if (
				!options.headers['Content-Type'] &&
				!options.headers['content-type']
			) {
				options.headers['Content-Type'] = 'application/json';
			}
			options.body = JSON.stringify(body);
		}
	}

	const url = buildUrl(path, config.params);
	const response = await fetch(url, options);

	if (!response.ok) {
		if (response.status === 401) {
			localStorage.removeItem('token');
			window.location.href = '/login';
		}

		throw await buildError(response);
	}

	if (response.status === 204) {
		return { data: null };
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		return { data: await response.json() };
	}

	return { data: await response.text() };
};

const api = {
	get(path, config = {}) {
		return request('GET', path, null, config);
	},
	delete(path, config = {}) {
		return request('DELETE', path, null, config);
	},
	post(path, body, config = {}) {
		return request('POST', path, body, config);
	},
	put(path, body, config = {}) {
		return request('PUT', path, body, config);
	},
	patch(path, body, config = {}) {
		return request('PATCH', path, body, config);
	},
};

export default api;
