import { Save } from 'lucide-react'
import { Card, Toggle, Button, Input } from '../components/ui'
import { useState, useEffect } from 'react'
import { settingsService } from '../services/settingsService'

export default function Settings() {
	const [isSaving, setIsSaving] = useState(false)
	const [settings, setSettings] = useState({
		app_name: 'ARQuest',
		maintenance_mode: false,
		contact_email: 'support@arquest.edu',
		enable_gps: true,
		enable_qr: true,
		enable_ar_selfie: true,
		enable_accreditation: false,
		enable_trivia: true,
		enable_leaderboard: true,
		default_quest_reward: 50
	})

	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const data = await settingsService.getSettings()
				setSettings(data)
			} catch (error) {
				console.error('Failed to load settings', error)
			}
		}
		fetchSettings()
	}, [])

	const handleChange = (key, value) => {
		setSettings((prev) => ({ ...prev, [key]: value }))
	}

	const handleSave = async () => {
		try {
			setIsSaving(true)
			await settingsService.updateSettings(settings)
			alert('Settings saved successfully!')
		} catch (error) {
			console.error('Failed to save settings', error)
			alert('Failed to save settings. Please try again.')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="space-y-6 max-w-2xl">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
				<p className="text-gray-500 mt-1">
					Configure and update system features and behaviors.
				</p>
			</div>

			{/* General Settings */}
			<Card>
				<h3 className="text-sm font-bold text-gray-900 mb-5">General Settings</h3>
				<div className="space-y-5">
					<div className="space-y-2">
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
							App Name
						</label>
						<input
							type="text"
							value={settings.app_name}
							onChange={(e) => handleChange('app_name', e.target.value)}
							className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
							Contact Email
						</label>
						<input
							type="email"
							value={settings.contact_email}
							onChange={(e) => handleChange('contact_email', e.target.value)}
							className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
						/>
					</div>
					<div className="h-px bg-brand-border" />
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-sm font-bold text-gray-900 text-red-600">
								Maintenance Mode
							</p>
							<p className="text-xs text-gray-500 mt-0.5">
								Disable access to the mobile app for maintenance.
							</p>
						</div>
						<Toggle
							checked={settings.maintenance_mode}
							onChange={() =>
								handleChange('maintenance_mode', !settings.maintenance_mode)
							}
						/>
					</div>
				</div>
			</Card>

			{/* App Features */}
			<Card>
				<h3 className="text-sm font-bold text-gray-900 mb-5">App Features</h3>
				<div className="space-y-5">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-sm font-bold text-gray-900">GPS Geofencing</p>
							<p className="text-xs text-gray-500 mt-0.5">
								Enable location-based building detection.
							</p>
						</div>
						<Toggle
							checked={settings.enable_gps}
							onChange={() => handleChange('enable_gps', !settings.enable_gps)}
						/>
					</div>
					<div className="h-px bg-brand-border" />
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-sm font-bold text-gray-900">QR Verification</p>
							<p className="text-xs text-gray-500 mt-0.5">
								Allow QR code scanning for building check-in.
							</p>
						</div>
						<Toggle
							checked={settings.enable_qr}
							onChange={() => handleChange('enable_qr', !settings.enable_qr)}
						/>
					</div>
					<div className="h-px bg-brand-border" />
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-sm font-bold text-gray-900">AR Selfie Mode</p>
							<p className="text-xs text-gray-500 mt-0.5">
								Let students take AR-enhanced selfies on campus.
							</p>
						</div>
						<Toggle
							checked={settings.enable_ar_selfie}
							onChange={() =>
								handleChange('enable_ar_selfie', !settings.enable_ar_selfie)
							}
						/>
					</div>
					<div className="h-px bg-brand-border" />
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-sm font-bold text-gray-900">Accreditation Access</p>
							<p className="text-xs text-gray-500 mt-0.5">
								Show accreditation data within building pages.
							</p>
						</div>
						<Toggle
							checked={settings.enable_accreditation}
							onChange={() =>
								handleChange('enable_accreditation', !settings.enable_accreditation)
							}
						/>
					</div>
					<div className="h-px bg-brand-border" />
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-sm font-bold text-gray-900">Trivia System</p>
							<p className="text-xs text-gray-500 mt-0.5">
								Display trivia facts to students on building entry.
							</p>
						</div>
						<Toggle
							checked={settings.enable_trivia}
							onChange={() => handleChange('enable_trivia', !settings.enable_trivia)}
						/>
					</div>
				</div>
			</Card>

			{/* Gamification */}
			<Card>
				<h3 className="text-sm font-bold text-gray-900 mb-5">Gamification</h3>
				<div className="space-y-5">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-sm font-bold text-gray-900">Leaderboard System</p>
							<p className="text-xs text-gray-500 mt-0.5">
								Enable student rankings and XP scoring.
							</p>
						</div>
						<Toggle
							checked={settings.enable_leaderboard}
							onChange={() =>
								handleChange('enable_leaderboard', !settings.enable_leaderboard)
							}
						/>
					</div>
					<div className="h-px bg-brand-border" />
					<div className="space-y-2">
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
							Default Quest Reward (XP)
						</label>
						<input
							type="number"
							value={settings.default_quest_reward}
							onChange={(e) =>
								handleChange('default_quest_reward', parseInt(e.target.value) || 0)
							}
							className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium max-w-[150px]"
						/>
					</div>
				</div>
			</Card>

			<div className="flex justify-end pb-8">
				<Button onClick={handleSave} className="gap-2 px-8" disabled={isSaving}>
					<Save size={18} />
					{isSaving ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
		</div>
	)
}
