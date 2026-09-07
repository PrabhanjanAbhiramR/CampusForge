import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Laptop, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '../context/theme'
import { Button } from './ui/Button'

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
]

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <Button variant="ghost" size="icon" aria-label={`Theme: ${theme}`}>
        {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="theme-menu" align="end" sideOffset={7}>
        {themes.map(({ value, label, icon: Icon }) => <DropdownMenu.Item className="theme-menu-item"
          onSelect={() => setTheme(value)} key={value}>
          <Icon size={15} /><span>{label}</span>{theme === value && <Check className="theme-check" size={15} />}
        </DropdownMenu.Item>)}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
}
