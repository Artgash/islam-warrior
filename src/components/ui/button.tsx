import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-display text-sm font-semibold tracking-wide transition-all disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-gold text-night hover:bg-gold/90 shadow-gold',
        secondary: 'border border-edge bg-card text-bone hover:border-gold/50 hover:bg-card/70',
        ghost: 'text-muted hover:bg-card hover:text-bone',
        danger: 'bg-crimson text-bone hover:bg-crimson/80 shadow-crimson',
        emerald: 'bg-emerald text-night hover:bg-emerald/90 shadow-emerald',
        iblis: 'bg-iblis text-bone hover:bg-iblis/80 shadow-iblis',
        outline: 'border border-gold/50 text-gold hover:bg-gold/10',
        link: 'text-gold underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        block: 'h-12 w-full px-6 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
