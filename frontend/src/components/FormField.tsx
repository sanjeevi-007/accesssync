import React from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox';
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string | null;
  required?: boolean;
  options?: Option[];
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  options = [],
  rows = 3,
  disabled = false,
  placeholder,
  helpText,
  className = '',
}) => {
  const id = `field-${name}`;

  if (type === 'checkbox') {
    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <div className="flex h-5 items-center">
          <input
            id={id}
            name={name}
            type="checkbox"
            checked={!!value}
            onChange={onChange}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
        </div>
        <div className="text-sm">
          <label htmlFor={id} className="font-medium text-[var(--color-text)]">
            {label} {required && <span className="text-[var(--color-danger)]">*</span>}
          </label>
          {helpText && <p className="text-xs text-[var(--color-muted)]">{helpText}</p>}
          {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text)]">
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </label>

      {type === 'select' ? (
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`block w-full rounded border ${
            error ? 'border-[var(--color-danger)]' : 'border-gray-300'
          } bg-white px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-100`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          rows={rows}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={`block w-full rounded border ${
            error ? 'border-[var(--color-danger)]' : 'border-gray-300'
          } bg-white px-3 py-2 text-sm text-[var(--color-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-100`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={`block w-full rounded border ${
            error ? 'border-[var(--color-danger)]' : 'border-gray-300'
          } bg-white px-3 py-2 text-sm text-[var(--color-text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-100`}
        />
      )}

      {helpText && !error && <p className="text-xs text-[var(--color-muted)]">{helpText}</p>}
      {error && <p className="text-xs text-[var(--color-danger)] mt-1 font-medium">{error}</p>}
    </div>
  );
};
