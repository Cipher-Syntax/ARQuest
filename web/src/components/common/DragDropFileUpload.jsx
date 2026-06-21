import React, { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { theme } from '../../theme'

const DragDropFileUpload = ({
	accept,
	onChange,
	value,
	placeholder = 'Drag & drop file here or click to browse',
	previewNode
}) => {
	const [isDragging, setIsDragging] = useState(false)

	const handleDragOver = (e) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = (e) => {
		e.preventDefault()
		setIsDragging(false)
	}

	const handleDrop = (e) => {
		e.preventDefault()
		setIsDragging(false)
		const file = e.dataTransfer.files[0]
		if (file) {
			onChange(file)
		}
	}

	const handleFileChange = (e) => {
		const file = e.target.files[0]
		if (file) {
			onChange(file)
		}
	}

	const handleRemove = (e) => {
		e.stopPropagation()
		onChange(null)
	}

	return (
		<div
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onClick={() => document.getElementById('file-input-' + accept).click()}
			style={{
				border: `2px dashed ${isDragging ? theme.colors.primary : theme.colors.border}`,
				borderRadius: theme.radius.md,
				padding: theme.spacing.lg,
				textAlign: 'center',
				cursor: 'pointer',
				backgroundColor: isDragging ? 'rgba(138, 21, 56, 0.05)' : '#fafafa',
				transition: 'all 0.2s',
				position: 'relative'
			}}
		>
			<input
				id={'file-input-' + accept}
				type="file"
				accept={accept}
				onChange={handleFileChange}
				style={{ display: 'none' }}
			/>

			{previewNode && (
				<div style={{ pointerEvents: 'none', marginBottom: value ? theme.spacing.md : 0 }}>
					{previewNode}
				</div>
			)}

			{value ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: theme.spacing.sm
					}}
				>
					<span
						style={{
							fontSize: '14px',
							color: theme.colors.text.primary,
							fontWeight: '500'
						}}
					>
						{value.name}
					</span>
					<button
						onClick={handleRemove}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: theme.colors.error,
							padding: '4px',
							display: 'flex',
							alignItems: 'center'
						}}
					>
						<X size={18} />
					</button>
				</div>
			) : (
				<>
					<Upload
						size={32}
						color={theme.colors.text.secondary}
						style={{ margin: '0 auto 8px' }}
					/>
					<div style={{ fontSize: '14px', color: theme.colors.text.secondary }}>
						{placeholder}
					</div>
					<div
						style={{
							fontSize: '12px',
							color: theme.colors.text.muted,
							marginTop: '4px'
						}}
					>
						{accept.split(',').join(', ')}
					</div>
				</>
			)}
		</div>
	)
}

export default DragDropFileUpload
