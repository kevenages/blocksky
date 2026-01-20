import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { searchProfiles } from '@/lib/auth.server'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, Search } from 'lucide-react'

interface Profile {
  did: string
  handle: string
  displayName: string
  avatar: string
  description: string
}

interface ProfileSearchProps {
  onSelect: (profile: Profile) => void
  placeholder?: string
}

export function ProfileSearch({ onSelect, placeholder = "Search by name or handle..." }: ProfileSearchProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2 || !user?.handle) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await searchProfiles({ data: { query } })
        setResults(response.profiles)
        setIsOpen(response.profiles.length > 0)
        setHighlightedIndex(-1)
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, user?.handle])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleSelect = (profile: Profile) => {
    setQuery('')
    setIsOpen(false)
    setResults([])
    onSelect(profile)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="max-h-72 overflow-auto py-1">
            {results.map((profile, index) => (
              <li
                key={profile.did}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
                  index === highlightedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
                onClick={() => handleSelect(profile)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar} alt={profile.handle} />
                  <AvatarFallback>
                    {profile.handle.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium truncate">
                    {profile.displayName || profile.handle}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    @{profile.handle}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
