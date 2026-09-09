import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const badgeVariants = cva('ui-badge', {
  variants: {
    variant: {
      default: 'ui-badge-default', outline: 'ui-badge-outline', success: 'ui-badge-success',
      warning: 'ui-badge-warning', direct: 'ui-badge-direct', supporting: 'ui-badge-supporting',
    },
  },
  defaultVariants: { variant: 'default' },
})

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { asChild?: boolean }
export function Badge({ asChild, className, variant, ...props }: BadgeProps) {
  const Component = asChild ? Slot : 'span'
  return <Component className={cn(badgeVariants({ variant }), className)} {...props} />
}
