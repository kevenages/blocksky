import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { getProfile, searchActors } from '../lib/actorApi';

interface UserProfile {
  handle: string;
  displayName: string;
  avatar?: string;
  description?: string;
  followersCount?: number;
  followsCount?: number;
}

interface User {
  handle: string;
}

interface BlockResult {
  success: boolean;
  mutuals: User[];
  alreadyBlockedCount: number;
  blockedCount: number;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [blockProgress, setBlockProgress] = useState(0);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [alreadyBlockedCount, setAlreadyBlockedCount] = useState(0);

  // Data initialization is now handled server-side, so we just set the flag
  const initializeUserData = async (handle?: string) => {
    const userHandle = handle || user?.handle;
    if (!userHandle) return;
    setIsDataInitialized(true);
  };

  useEffect(() => {
    if (user?.handle) {
      setIsDataInitialized(true);
    }
  }, [user]);

  const processBlockStream = async (
    handle: string,
    type: 'followers' | 'follows',
    onProgress: (progress: number, count: number) => void,
    onStatusChange?: (status: string) => void
  ): Promise<BlockResult> => {
    setBlockProgress(0);

    try {
      const response = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetHandle: handle, type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Block API error:', errorData.error);
        return { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let result: BlockResult = { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'status':
                  onStatusChange?.(data.message);
                  break;

                case 'progress':
                  setBlockProgress(data.progress);
                  onProgress(data.progress, data.blockedCount);
                  break;

                case 'complete':
                  setBlockProgress(100);
                  onProgress(100, data.blockedCount);
                  setAlreadyBlockedCount(data.alreadyBlockedCount || 0);
                  result = {
                    success: true,
                    mutuals: data.mutuals || [],
                    alreadyBlockedCount: data.alreadyBlockedCount || 0,
                    blockedCount: data.blockedCount || 0,
                  };
                  break;

                case 'error':
                  console.error('Block stream error:', data.message);
                  result = { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };
                  break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error in block stream:', error);
      return { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };
    }
  };

  const startBlockUserFollowers = async (
    handle: string,
    onProgress: (progress: number, count: number) => void,
    onStatusChange?: (status: string) => void
  ): Promise<BlockResult> => {
    return processBlockStream(handle, 'followers', onProgress, onStatusChange);
  };

  const startBlockUserFollows = async (
    handle: string,
    onProgress: (progress: number, count: number) => void,
    onStatusChange?: (status: string) => void
  ): Promise<BlockResult> => {
    return processBlockStream(handle, 'follows', onProgress, onStatusChange);
  };

  const loadUserProfile = async (handle: string) => {
    try {
      const profile = await getProfile(handle);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchSuggestions = async (query: string) => {
    try {
      const results = await searchActors(query);
      setSuggestions(results);
      return results;
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  const clearUserProfile = () => {
    setUserProfile(null);
  };

  return {
    userProfile,
    suggestions,
    loadUserProfile,
    fetchSuggestions,
    clearSuggestions,
    clearUserProfile,
    setSuggestions,
    blockProgress,
    isDataInitialized,
    startBlockUserFollowers,
    startBlockUserFollows,
    alreadyBlockedCount,
    initializeUserData,
  };
}
