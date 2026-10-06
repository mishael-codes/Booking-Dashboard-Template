import React from 'react';

interface MoneyInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function MoneyInput({
  id,
  name,
  value,
  onChange,
  currency = 'NGN',
  placeholder = '0.00',
  disabled = false,
  required = false,
  className = '',
}: MoneyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize input to only permit numbers and a single decimal point
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      // More than one dot, keep only the first
      const corrected = parts[0] + '.' + parts.slice(1).join('');
      onChange(corrected);
    } else {
      onChange(sanitized);
    }
  };

  return (
    <div className={`relative rounded-md shadow-xs ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <span className="text-neutral-500 font-mono text-sm">{currency}</span>
      </div>
      <input
        type="text"
        inputMode="decimal"
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className="block w-full rounded-md border border-neutral-300 pl-14 pr-3 py-2 text-sm font-mono tabular-nums text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-500"
      />
    </div>
  );
}
