import React from 'react'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-[#2E7D32] text-white hover:bg-[#1B5E20] focus-visible:outline-[#2E7D32]',
    secondary: 'bg-[#12304A] text-white hover:bg-[#0d2237] focus-visible:outline-[#12304A]',
    outline: 'border border-[#2E7D32] text-[#2E7D32] hover:bg-[#E8F5E9] focus-visible:outline-[#2E7D32]',
    ghost: 'text-[#12304A] hover:bg-gray-100 focus-visible:outline-[#12304A]',
    danger: 'bg-[#C62828] text-white hover:bg-[#B71C1C] focus-visible:outline-[#C62828]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

// ── ButtonLink (a real <a> styled as a button — never nest <button> inside <Link>) ──
export function ButtonLink({
  to, variant = 'primary', size = 'md', className = '', children,
}: {
  to: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}) {
  const variants = {
    primary: 'bg-[#2E7D32] text-white hover:bg-[#1B5E20] focus-visible:outline-[#2E7D32]',
    secondary: 'bg-[#12304A] text-white hover:bg-[#0d2237] focus-visible:outline-[#12304A]',
    outline: 'border border-[#2E7D32] text-[#2E7D32] hover:bg-[#E8F5E9] focus-visible:outline-[#2E7D32]',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-[#12304A]">
        {label}
        {props.required && <span className="text-[#C62828] ml-1" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="text-xs text-[#5A6472]">{hint}</p>}
      <input
        id={inputId}
        className={`border rounded px-3 py-2 text-sm w-full transition-colors
          ${error ? 'border-[#C62828] bg-[#FFEBEE]' : 'border-[#DDE3E7] focus:border-[#2E7D32]'}
          focus:outline-none focus:ring-1 focus:ring-[#2E7D32] ${className}`}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[#C62828]" role="alert">{error}</p>
      )}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, hint, options, placeholder, id, className = '', ...props }: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium text-[#12304A]">
        {label}
        {props.required && <span className="text-[#C62828] ml-1" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="text-xs text-[#5A6472]">{hint}</p>}
      <select
        id={selectId}
        className={`border rounded px-3 py-2 text-sm w-full bg-white transition-colors
          ${error ? 'border-[#C62828] bg-[#FFEBEE]' : 'border-[#DDE3E7] focus:border-[#2E7D32]'}
          focus:outline-none focus:ring-1 focus:ring-[#2E7D32] ${className}`}
        aria-invalid={!!error}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-[#C62828]" role="alert">{error}</p>
      )}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, id, className = '', ...props }: TextareaProps) {
  const taId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={taId} className="text-sm font-medium text-[#12304A]">
        {label}
        {props.required && <span className="text-[#C62828] ml-1" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="text-xs text-[#5A6472]">{hint}</p>}
      <textarea
        id={taId}
        className={`border rounded px-3 py-2 text-sm w-full min-h-[100px] resize-y transition-colors
          ${error ? 'border-[#C62828] bg-[#FFEBEE]' : 'border-[#DDE3E7] focus:border-[#2E7D32]'}
          focus:outline-none focus:ring-1 focus:ring-[#2E7D32] ${className}`}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className="text-xs text-[#C62828]" role="alert">{error}</p>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#DDE3E7] rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'green' | 'navy' | 'gold' | 'gray' | 'red' | 'blue'

export function Badge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const styles: Record<BadgeVariant, string> = {
    green: 'bg-[#E8F5E9] text-[#1B5E20]',
    navy: 'bg-[#E3EBF0] text-[#12304A]',
    gold: 'bg-[#FFF8DC] text-[#7B5E00]',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-[#FFEBEE] text-[#C62828]',
    blue: 'bg-blue-50 text-blue-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export function Alert({ variant = 'info', title, children }: {
  variant?: AlertVariant; title?: string; children: React.ReactNode
}) {
  const styles: Record<AlertVariant, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-[#E8F5E9] border-[#A5D6A7] text-[#1B5E20]',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    error: 'bg-[#FFEBEE] border-[#EF9A9A] text-[#C62828]',
  }
  return (
    <div className={`border rounded-lg p-4 ${styles[variant]}`} role={variant === 'error' ? 'alert' : 'status'}>
      {title && <p className="font-semibold mb-1 text-sm">{title}</p>}
      <div className="text-sm">{children}</div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12" role="status" aria-label={label}>
      <Loader2 className="w-8 h-8 animate-spin text-[#2E7D32]" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

// ── Phase Status Badge ────────────────────────────────────────────────────────
export function PhaseStatusBadge({ state }: { state: 'not_open' | 'open' | 'closed' }) {
  if (state === 'open') return <Badge variant="green">Open</Badge>
  if (state === 'closed') return <Badge variant="red">Closed</Badge>
  return <Badge variant="gray">Not Open</Badge>
}
