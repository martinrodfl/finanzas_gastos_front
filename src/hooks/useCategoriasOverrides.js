import { useState } from 'react';

const KEY = 'finanzas_cat_overrides';

export function useCategoriasOverrides() {
	const [overrides, setOverrides] = useState(() => {
		try {
			const raw = localStorage.getItem(KEY);
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	});

	const setOverride = (id, categoria) => {
		setOverrides((prev) => {
			const next = { ...prev, [id]: categoria };
			localStorage.setItem(KEY, JSON.stringify(next));
			return next;
		});
	};

	const removeOverride = (id) => {
		setOverrides((prev) => {
			const next = { ...prev };
			delete next[id];
			localStorage.setItem(KEY, JSON.stringify(next));
			return next;
		});
	};

	return [overrides, setOverride, removeOverride];
}
