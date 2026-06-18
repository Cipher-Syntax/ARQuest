import { Upload, Edit3 } from 'lucide-react'
import { Button, Input, Modal } from '../ui'

export default function AssetModal({
	isOpen,
	onClose,
	onSave,
	editingAsset,
	newName,
	setNewName,
	newCategory,
	setNewCategory,
	newType,
	setNewType,
	selectedFile,
	fileInputRef,
	handleFileChange,
	categories
}) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={editingAsset ? 'Edit Asset' : 'Upload Asset'}
			footer={
				<>
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={onSave} className="gap-2">
						{editingAsset ? <Edit3 size={16} /> : <Upload size={16} />}
						{editingAsset ? 'Save Changes' : 'Upload Asset'}
					</Button>
				</>
			}
		>
			<div className="p-0 space-y-5">
				<Input
					label="Asset Name"
					placeholder="e.g. ccs_entrance_v1.glb"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
				/>

				<div className="space-y-2">
					<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
						Building
					</label>
					<select
						value={newCategory}
						onChange={(e) => setNewCategory(e.target.value)}
						className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
					>
						{categories.map((cat) => (
							<option key={cat.id} value={cat.name}>
								{cat.name}
							</option>
						))}
					</select>
				</div>

				<div className="space-y-2">
					<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
						Asset Type
					</label>
					<div className="flex gap-2">
						<button
							onClick={() => setNewType('3D Model')}
							className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all ${newType === '3D Model' ? 'bg-brand text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-brand-light'}`}
						>
							3D Model
						</button>
						<button
							onClick={() => setNewType('360° Panorama')}
							className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all ${newType === '360° Panorama' ? 'bg-brand text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-brand-light'}`}
						>
							360° Panorama
						</button>
					</div>
				</div>

				{!editingAsset && (
					<div
						onClick={() => fileInputRef.current?.click()}
						className="border-2 border-dashed border-brand-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 bg-brand-light/20 hover:bg-brand-light/40 transition-colors cursor-pointer group"
					>
						<input
							type="file"
							ref={fileInputRef}
							className="hidden"
							onChange={handleFileChange}
							accept={newType === '3D Model' ? '.glb,.gltf' : 'image/*'}
						/>
						<Upload
							size={24}
							className={
								selectedFile
									? 'text-brand'
									: 'text-gray-400 group-hover:text-brand transition-colors'
							}
						/>
						<p className="text-xs font-bold text-gray-500 text-center">
							{selectedFile ? (
								<span className="text-brand">Selected: {selectedFile.name}</span>
							) : (
								'Click to upload file'
							)}
						</p>
						{selectedFile && (
							<p className="text-[10px] text-gray-400">
								{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
							</p>
						)}
					</div>
				)}
			</div>
		</Modal>
	)
}
