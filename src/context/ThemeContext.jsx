import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './theme-context';

const STORAGE_KEY = 'finanzas-theme';
const DEFAULT_THEME = 'light';

const getThemeFromSystem = () => {
	if (typeof window === 'undefined' || !window.matchMedia) {
		return DEFAULT_THEME;
	}

	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light';
};

const getInitialTheme = () => {
	if (typeof window === 'undefined') {
		return DEFAULT_THEME;
	}

	const storedTheme = window.localStorage.getItem(STORAGE_KEY);
	if (storedTheme === 'light' || storedTheme === 'dark') {
		return storedTheme;
	}

	return getThemeFromSystem();
};

const applyTheme = (theme) => {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
};

export function ThemeProvider({ children }) {
	const [theme, setTheme] = useState(() => {
		const initialTheme = getInitialTheme();
		applyTheme(initialTheme);
		return initialTheme;
	});

	useEffect(() => {
		applyTheme(theme);
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [theme]);

	const value = useMemo(
		() => ({
			theme,
			setTheme,
			toggleTheme: () =>
				setTheme((currentTheme) =>
					currentTheme === 'dark' ? 'light' : 'dark',
				),
		}),
		[theme],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}
