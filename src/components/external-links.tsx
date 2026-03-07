import { Heart, MessageSquare } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ExternalLinks() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-8 w-full max-w-4xl bg-muted/30 rounded-lg px-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://bsky.app/profile/blocksky.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-blue-500 transition-colors"
              onClick={() => analytics.clickExternalLink('https://bsky.app/profile/blocksky.app')}
            >
              <svg className="h-5 w-5" viewBox="0 0 600 530" fill="currentColor">
                <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"/>
              </svg>
              @blocksky.app
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Follow us on Bluesky for updates</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://ko-fi.com/blockskyapp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-pink-500 transition-colors"
              onClick={() => analytics.clickExternalLink('https://ko-fi.com/blockskyapp')}
            >
              <Heart className="h-5 w-5" />
              Support us on Ko-fi
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Help keep BlockSky free for everyone</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://forms.gle/2AEBdooVL12AjgLN8"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-green-500 transition-colors"
              onClick={() => analytics.clickExternalLink('https://forms.gle/2AEBdooVL12AjgLN8')}
            >
              <MessageSquare className="h-5 w-5" />
              Send Feedback
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Help us improve BlockSky</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
