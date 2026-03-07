import { useEffect } from 'react'
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { FeatureCardGrid } from '@/components/feature-card-grid'
import { trackPageView } from '@/lib/analytics'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const location = useLocation()

  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center space-y-8">
        <div className="w-full max-w-lg">
          <Outlet />
        </div>
        <div className="w-full max-w-4xl">
          <FeatureCardGrid />
        </div>
      </div>
    </div>
  )
}
