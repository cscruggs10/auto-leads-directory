import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helper, options, placeholder, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={props.id} className="text-sm font-semibold text-text-primary mb-2 block">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <select
          className={cn(
            'flex h-12 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary',
            'focus:border-text-primary focus:outline-none focus:ring-0',
            'hover:border-text-secondary transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'appearance-none bg-no-repeat bg-right bg-[length:16px_16px] bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")]',
            error && 'border-error focus:border-error',
            className
          )}
          style={{
            paddingRight: '3rem',
            backgroundPosition: 'right 1rem center'
          }}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-error">{error}</p>
        )}
        {helper && !error && (
          <p className="text-sm text-text-secondary">{helper}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };