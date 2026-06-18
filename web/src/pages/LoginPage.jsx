import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { theme } from '../theme'

const LoginPage = () => {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const { login, logout } = useAuth()
	const navigate = useNavigate()

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			const data = await login(username, password)

			// Extract the role, checking both flat and nested structures
			const role = data?.user?.role || data?.role

			if (role !== 'admin') {
				await logout()
				setError(
					'Access denied. Only admin users can access this dashboard. Please contact an administrator to upgrade your account.'
				)
				setLoading(false)
				return
			}
			navigate('/dashboard')
		} catch (err) {
			const errorMessage =
				err.response?.data?.message ||
				err.response?.data?.error ||
				'Invalid username or password'
			setError(errorMessage)
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex w-full bg-white">
			{/* Left Side - Branding (Hidden on mobile) */}
			<div className="hidden lg:flex lg:w-1/2 bg-brand flex-col p-12 relative overflow-hidden">
				<div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_100%)]"></div>

				<div className="z-10 flex flex-col w-full h-full">
					<div className="w-full h-80 bg-white/10 border-2 border-white/20 border-dashed rounded-md flex items-center justify-center mb-12 backdrop-blur-sm shadow-xl relative group transition-all duration-300 hover:bg-white/20 mt-4">
						<span className="text-white/60 font-bold uppercase tracking-widest text-lg absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
							Logo Here
						</span>
						<img
							src="/logo.png"
							alt="ARQuest Logo"
							className="w-40 h-40 object-contain opacity-50 group-hover:opacity-100 transition-opacity"
						/>
					</div>

					<div className="mt-auto mb-12">
						<h1 className="text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-md">
							ARQuest
						</h1>
						<p className="text-white/80 text-lg font-medium leading-relaxed max-w-lg">
							The ultimate campus exploration platform. Manage your 3D buildings,
							geofences, and trivia quests in one place.
						</p>
					</div>
				</div>

				{/* Decorative elements */}
				<div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
				<div className="absolute bottom-10 right-10 w-48 h-48 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-10"></div>
			</div>

			{/* Right Side - Login Form */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-brand-light/30">
				<div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
					<div className="text-center space-y-2">
						<div className="w-12 h-12 bg-brand/10 text-brand rounded-md flex items-center justify-center mx-auto mb-4 lg:hidden">
							<img src="/logo.png" alt="ARQuest" className="w-8 h-8 object-contain" />
						</div>
						<h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
							Welcome Back
						</h2>
						<p className="text-sm text-gray-500 font-medium">
							Please sign in to your admin account
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-6 mt-8">
						<div className="space-y-2">
							<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
								Username
							</label>
							<input
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								placeholder="Enter your username"
								className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all placeholder:text-gray-400"
							/>
						</div>

						<div className="space-y-2">
							<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
								Password
							</label>
							<div className="relative">
								<input
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									placeholder="Enter your password"
									className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all placeholder:text-gray-400"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-brand transition-colors rounded-md"
								>
									{showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
								</button>
							</div>
						</div>

						{error && (
							<div className="p-4 bg-red-50 border border-red-100 rounded-md flex items-start gap-3">
								<div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div>
								<p className="text-sm font-medium text-red-700 leading-snug">
									{error}
								</p>
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3.5 px-4 bg-brand hover:bg-brand/90 text-white font-bold rounded-md text-sm transition-all shadow-md shadow-brand/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
									Authenticating...
								</>
							) : (
								'Sign In to Admin Panel'
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	)
}

export default LoginPage
