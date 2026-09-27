import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border border-edge bg-night/60 px-3 py-2 text-sm text-bone',
        'placeholder:text-muted/60 transition-colors',
        'focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-edge bg-night/60 px-3 py-2 text-sm text-bone',
      'placeholder:text-muted/60 transition-colors',
      'focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('mb-1.5 block text-xs uppercase tracking-wider text-muted', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

const FieldError = ({ children }: { children?: React.ReactNode }) =>
  children ? <p className="mt-1 text-xs text-danger">{children}</p> : null;

export { Input, Textarea, Label, FieldError };
