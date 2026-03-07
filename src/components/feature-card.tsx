import { Link, useLocation } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Feature } from '@/lib/feature-registry'

interface FeatureCardProps {
  feature: Feature
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const location = useLocation()
  const isActive = location.pathname === feature.route
  const Icon = feature.icon

  if (feature.status === 'available') {
    return (
      <Link to={feature.route}>
        <Card className={cn(
          'h-full transition-all hover:shadow-md cursor-pointer',
          isActive && 'ring-2 ring-blue-500 shadow-md',
        )}>
          <CardHeader className="pb-2">
            <Icon className="h-8 w-8 text-blue-500 mb-2" />
            <CardTitle className="text-lg">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Coming soon / Premium cards — not clickable
  return (
    <Card className="h-full opacity-60 relative">
      <CardHeader className="pb-2">
        <Icon className="h-8 w-8 text-muted-foreground mb-2" />
        <CardTitle className="text-lg text-muted-foreground">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{feature.description}</p>
      </CardContent>
      {feature.badge && (
        <div className={cn(
          'absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full',
          feature.status === 'premium'
            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            : 'bg-muted text-muted-foreground',
        )}>
          {feature.badge}
        </div>
      )}
    </Card>
  )
}
