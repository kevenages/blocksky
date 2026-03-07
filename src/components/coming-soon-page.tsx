import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Feature } from '@/lib/feature-registry'

interface ComingSoonPageProps {
  feature: Feature
}

export function ComingSoonPage({ feature }: ComingSoonPageProps) {
  const Icon = feature.icon

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <CardTitle>{feature.title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-3">
        <p className="text-muted-foreground">{feature.description}</p>
        <div className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
          {feature.status === 'premium' ? 'Premium — Coming Soon' : 'Coming Soon'}
        </div>
      </CardContent>
    </Card>
  )
}
