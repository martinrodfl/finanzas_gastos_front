import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './router/PrivateRoute';

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route
					path='/login'
					element={<Login />}
				/>
				<Route
					path='/dashboard'
					element={
						<PrivateRoute>
							<Dashboard />
						</PrivateRoute>
					}
				/>
				<Route
					path='*'
					element={
						<Navigate
							to='/dashboard'
							replace
						/>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
}
