import { useAuth } from '@/hooks/use-auth'
import { LoginDialog } from '@/components/auth/login-dialog'
import { UserMenu } from '@/components/auth/user-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { Shield } from 'lucide-react'

export function Header() {
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-7 w-7 text-blue-500" />
          <span className="font-bold text-lg">
            Block<span className="text-blue-500">Sky</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-blue-500/30" />
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <LoginDialog />
          )}
        </div>
      </div>
    </header>
  )
}
