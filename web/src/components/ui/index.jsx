import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { X } from 'lucide-react'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading, 
  children, 
  ...props 
}) {
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand/90 shadow-sm active:scale-95',
    secondary: 'bg-white text-gray-700 border border-brand-border hover:bg-brand-light active:scale-95',
    ghost: 'text-gray-500 hover:bg-brand-light hover:text-brand active:scale-95',
    danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 active:scale-95'
  }

  const sizes = {
    xs: 'px-2 py-1 text-[10px]',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  )
}

export function Input({ label, error, icon: Icon, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </span>
        )}
        <input
          className={cn(
            'w-full border rounded-md bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all py-3',
            Icon ? 'pl-10 pr-4' : 'px-4',
            error ? 'border-red-400' : 'border-brand-border',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  )
}

export function Card({ children, className, noPadding = false, ...props }) {
  return (
    <div className={cn(
      'bg-white border border-brand-border rounded-lg shadow-sm',
      !noPadding && 'p-6',
      className
    )} {...props}>
      {children}
    </div>
  )
}

export function Badge({ children, variant = 'gray', className }) {
  const variants = {
    gray: 'bg-gray-100 text-gray-600',
    brand: 'bg-brand-light text-brand',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-orange-50 text-orange-600',
    danger: 'bg-red-50 text-red-600'
  }

  return (
    <span className={cn(
      'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={onChange} 
        />
        <div className={cn(
          "w-11 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-brand" : "bg-gray-200 group-hover:bg-gray-300"
        )}></div>
        <div className={cn(
          "absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}></div>
      </div>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
    </label>
  )
}

export function Modal({ isOpen, onClose, title, children, footer, variant = 'default' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn(
        "bg-white rounded-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200",
        variant === 'danger' ? 'max-w-sm' : 'max-w-md w-full'
      )}>
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-brand-light rounded-lg text-gray-400 hover:text-brand transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-gray-50 border-t border-brand-border flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title = "Confirm Delete", message = "Are you sure you want to delete this item? This action cannot be undone." }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="danger"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white border-none">Delete</Button>
        </>
      )}
    >
      <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
    </Modal>
  )
}
