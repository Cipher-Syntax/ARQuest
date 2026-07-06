import { useState } from 'react'
import { Plus, Edit3 } from 'lucide-react'
import { Button, Modal } from '../ui'
import { validateForm, validateString, validateRequired, validateNumber } from '../../utils/validation'

export default function GeofenceModal({
	isOpen,
	onClose,
	onSave,
	editingGeo,
	newName,
	setNewName,
	newRadius,
	setNewRadius,
	newFullBuilding,
	setNewFullBuilding,
	newLat,
	setNewLat,
	newLng,
	setNewLng
}) {
	const [errors, setErrors] = useState({})

	const handleSave = () => {
		const formData = {
			newName,
			newRadius,
			newFullBuilding,
			newLat,
			newLng
		}

		const schema = {
			newName: (val) => validateString(val, 1),
			newRadius: (val) => {
				const req = validateRequired(val)
				if (req) return req
				const match = String(val).match(/([0-9]*\.?[0-9]+)/)
				if (!match) return 'Must contain a valid number'
				return validateNumber(match[1], 1)
			},
			newFullBuilding: (val) => validateString(val, 1),
			newLat: (val) => {
				const req = validateRequired(val)
				if (req) return req
				const match = String(val).match(/([-+]?[0-9]*\.?[0-9]+)/)
				if (!match) return 'Must contain a valid coordinate'
				return validateNumber(match[1], -90, 90)
			},
			newLng: (val) => {
				const req = validateRequired(val)
				if (req) return req
				const match = String(val).match(/([-+]?[0-9]*\.?[0-9]+)/)
				if (!match) return 'Must contain a valid coordinate'
				return validateNumber(match[1], -180, 180)
			}
		}

		const validationErrors = validateForm(formData, schema)
		setErrors(validationErrors)
		if (Object.keys(validationErrors).length > 0) return

		onSave()
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={editingGeo ? 'Edit Boundary' : 'Define Boundary'}
			footer={
				<>
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSave} className="gap-2">
						{editingGeo ? <Edit3 size={16} /> : <Plus size={16} />}
						{editingGeo ? 'Save Changes' : 'Define Boundary'}
					</Button>
				</>
			}
		>
			<div className="space-y-5">
				<div className="grid grid-cols-2 gap-4">
					<div className="col-span-1">
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
							Building Code
						</label>
						<input
							type="text"
							value={newName}
							onChange={(e) => {
								setNewName(e.target.value)
								if (errors.newName) setErrors({ ...errors, newName: null })
							}}
							placeholder="e.g. CCS"
							className={`w-full border ${errors.newName ? 'border-red-500' : 'border-brand-border'} rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold`}
						/>
						{errors.newName && <p className="text-xs text-red-500 mt-1">{errors.newName}</p>}
					</div>
					<div className="col-span-1">
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
							Radius
						</label>
						<input
							type="text"
							value={newRadius}
							onChange={(e) => {
								setNewRadius(e.target.value)
								if (errors.newRadius) setErrors({ ...errors, newRadius: null })
							}}
							placeholder="e.g. 50m"
							className={`w-full border ${errors.newRadius ? 'border-red-500' : 'border-brand-border'} rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold`}
						/>
						{errors.newRadius && <p className="text-xs text-red-500 mt-1">{errors.newRadius}</p>}
					</div>
				</div>

				<div>
					<label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
						Full Building Name
					</label>
					<input
						type="text"
						value={newFullBuilding}
						onChange={(e) => {
							setNewFullBuilding(e.target.value)
							if (errors.newFullBuilding) setErrors({ ...errors, newFullBuilding: null })
						}}
						placeholder="e.g. College of Computer Studies"
						className={`w-full border ${errors.newFullBuilding ? 'border-red-500' : 'border-brand-border'} rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium`}
					/>
					{errors.newFullBuilding && <p className="text-xs text-red-500 mt-1">{errors.newFullBuilding}</p>}
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
							Latitude
						</label>
						<input
							type="text"
							value={newLat}
							onChange={(e) => {
								setNewLat(e.target.value)
								if (errors.newLat) setErrors({ ...errors, newLat: null })
							}}
							placeholder="14.5547° N"
							className={`w-full border ${errors.newLat ? 'border-red-500' : 'border-brand-border'} rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono`}
						/>
						{errors.newLat && <p className="text-xs text-red-500 mt-1">{errors.newLat}</p>}
					</div>
					<div>
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
							Longitude
						</label>
						<input
							type="text"
							value={newLng}
							onChange={(e) => {
								setNewLng(e.target.value)
								if (errors.newLng) setErrors({ ...errors, newLng: null })
							}}
							placeholder="121.0244° E"
							className={`w-full border ${errors.newLng ? 'border-red-500' : 'border-brand-border'} rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono`}
						/>
						{errors.newLng && <p className="text-xs text-red-500 mt-1">{errors.newLng}</p>}
					</div>
				</div>
			</div>
		</Modal>
	)
}
