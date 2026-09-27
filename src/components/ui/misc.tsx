/**
 * Small primitives that do not warrant a file each: progress bars, badges,
 * switches, sliders, separators, empty states and skeletons.
 */

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-1. */
  value: number;
  barClassName?: string;
  height?: string;
}

export function Progress({ value, className, barClassName, height = 'h-2', ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('overflow-hidden rounded-full border border-edge bg-night', height, className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full bg-gold transition-all duration-500 ease-out', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'border-edge bg-night/60 text-muted',
        gold: 'border-gold/50 bg-gold/10 text-gold',
        emerald: 'border-emerald/50 bg-emerald/10 text-emerald',
        danger: 'border-danger/50 bg-danger/10 text-danger',
        iblis: 'border-iblis/60 bg-iblis/20 text-[#C4B5FD]',
        legendary: 'border-legendary/60 bg-legendary/10 text-legendary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ------------------------------------------------------------------ */
/* Switch + slider + separator                                         */
/* ------------------------------------------------------------------ */

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-edge transition-colors',
      'data-[state=checked]:bg-gold data-[state=unchecked]:bg-night',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block size-4 rounded-full bg-bone shadow transition-transform',
        'data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-night">
      <SliderPrimitive.Range className="absolute h-full bg-gold" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-gold bg-night transition-colors focus-visible:outline-none" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-edge',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-w-xs rounded-lg border border-edge bg-card px-3 py-2 text-xs text-bone shadow-lg',
        'animate-in fade-in-0 zoom-in-95',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/* ------------------------------------------------------------------ */
/* Empty state + skeleton                                              */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-edge/70 px-6 py-12 text-center">
      {icon && <div className="text-muted/60">{icon}</div>}
      <h3 className="font-display text-base text-bone">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-card/70', className)} />;
}
