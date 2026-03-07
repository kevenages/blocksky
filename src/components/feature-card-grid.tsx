import { features } from '@/lib/feature-registry'
import { FeatureCard } from '@/components/feature-card'

export function FeatureCardGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {features.map((feature) => (
        <FeatureCard key={feature.id} feature={feature} />
      ))}
    </div>
  )
}
