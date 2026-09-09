import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '../../lib/utils'

export function Separator({ className, orientation = 'horizontal', decorative = true, ...props }:
  React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root decorative={decorative} orientation={orientation}
    className={cn('ui-separator', orientation === 'vertical' && 'ui-separator-vertical', className)} {...props} />
}
