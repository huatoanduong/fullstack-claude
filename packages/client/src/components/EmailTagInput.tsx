import { useState, useRef, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecipientTag } from '@/types'

interface EmailTagInputProps {
  value: RecipientTag[]
  onChange: (tags: RecipientTag[]) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function EmailTagInput({
  value,
  onChange,
  className,
  placeholder = 'Type email and press Enter',
  disabled = false,
}: EmailTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string) => {
    const email = raw.trim().replace(/,$/, '').trim().toLowerCase()
    if (!email) return
    if (value.some((t) => t.email === email)) {
      setError(`"${email}" is already added`)
      return
    }
    const name = email.split('@')[0] ?? email
    setError(null)
    onChange([...value, { email, name }])
    setInputValue('')
  }

  const removeTag = (email: string) => onChange(value.filter((t) => t.email !== email))

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) addTag(inputValue)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn(
          'flex min-h-[42px] w-full flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag.email}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {tag.email}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag.email)
                }}
                className="ml-0.5 rounded-full hover:text-destructive focus:outline-none"
                aria-label={`Remove ${tag.email}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[160px] bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
