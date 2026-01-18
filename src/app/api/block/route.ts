import { NextRequest } from 'next/server';
import { AtpAgent } from '@atproto/api';
import { getAuthenticatedAgent, getServerUserInfo, getServerAccessToken } from '@/lib/serverAuth';

const BATCH_SIZE = 200;
const PUBLIC_AGENT = new AtpAgent({ service: 'https://public.api.bsky.app' });

interface User {
  handle: string;
  did: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isWhitelisted = (handle: string): boolean => {
  return handle.endsWith('.bsky.app') || handle.endsWith('.bsky.team') || handle === 'bsky.app';
};

async function getFollowers(handle: string): Promise<User[]> {
  const followers: User[] = [];
  let cursor: string | undefined;

  do {
    const response = await PUBLIC_AGENT.getFollowers({ actor: handle, cursor, limit: 100 });
    if (response.data.followers) {
      followers.push(...response.data.followers.map(f => ({ handle: f.handle, did: f.did })));
    }
    cursor = response.data.cursor;
  } while (cursor);

  return followers;
}

async function getFollows(handle: string): Promise<User[]> {
  const follows: User[] = [];
  let cursor: string | undefined;

  do {
    const response = await PUBLIC_AGENT.getFollows({ actor: handle, cursor, limit: 100 });
    if (response.data.follows) {
      follows.push(...response.data.follows.map(f => ({ handle: f.handle, did: f.did })));
    }
    cursor = response.data.cursor;
  } while (cursor);

  return follows;
}

async function getBlockedHandles(agent: AtpAgent): Promise<Set<string>> {
  const blocked = new Set<string>();
  let cursor: string | undefined;

  do {
    const response = await agent.app.bsky.graph.getBlocks({ cursor, limit: 100 });
    if (response.data.blocks) {
      response.data.blocks.forEach(b => blocked.add(b.handle));
    }
    cursor = response.data.cursor;
  } while (cursor);

  return blocked;
}

async function getUserFollowersAndFollows(handle: string): Promise<{ followers: Set<string>; follows: Set<string> }> {
  const [followers, follows] = await Promise.all([
    getFollowers(handle),
    getFollows(handle),
  ]);

  return {
    followers: new Set(followers.map(f => f.handle)),
    follows: new Set(follows.map(f => f.handle)),
  };
}

export async function POST(request: NextRequest) {
  const { targetHandle, type } = await request.json();

  if (!targetHandle || !type) {
    return new Response(JSON.stringify({ error: 'targetHandle and type are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!['followers', 'follows'].includes(type)) {
    return new Response(JSON.stringify({ error: 'type must be "followers" or "follows"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get authenticated agent
  const agent = await getAuthenticatedAgent();
  if (!agent) {
    return new Response(JSON.stringify({ error: 'Not authenticated. Please log in.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userInfo = await getServerUserInfo();
  if (!userInfo) {
    return new Response(JSON.stringify({ error: 'User info not found' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a streaming response
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (data: object) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Start the blocking process in the background
  (async () => {
    try {
      await sendEvent({ type: 'status', message: `Fetching ${type}...` });

      // Fetch target's followers or follows
      const targetList = type === 'followers'
        ? await getFollowers(targetHandle)
        : await getFollows(targetHandle);

      await sendEvent({ type: 'status', message: 'Analyzing users...' });

      // Fetch user's followers/follows for mutual detection
      const { followers: userFollowers, follows: userFollows } = await getUserFollowersAndFollows(userInfo.handle);

      // Fetch already blocked users
      const blockedHandles = await getBlockedHandles(agent);

      // Identify mutuals (people user follows AND who follow user back)
      const mutuals = targetList.filter(
        u => userFollowers.has(u.handle) && userFollows.has(u.handle)
      );
      const mutualHandles = new Set(mutuals.map(m => m.handle));

      // Filter users to block
      const usersToBlock = targetList.filter(
        user =>
          user.handle !== userInfo.handle &&
          !isWhitelisted(user.handle) &&
          !mutualHandles.has(user.handle) &&
          !blockedHandles.has(user.handle)
      );

      const alreadyBlockedCount = targetList.length - usersToBlock.length - mutuals.length;

      if (usersToBlock.length === 0) {
        await sendEvent({
          type: 'complete',
          blockedCount: 0,
          alreadyBlockedCount,
          mutuals: mutuals.map(m => ({ handle: m.handle })),
          totalProcessed: targetList.length,
        });
        await writer.close();
        return;
      }

      await sendEvent({
        type: 'status',
        message: `Blocking ${usersToBlock.length} users...`,
        total: usersToBlock.length
      });

      // Block in batches
      let blockedCount = 0;
      const failedUsers: User[] = [];

      for (let i = 0; i < usersToBlock.length; i += BATCH_SIZE) {
        const batch = usersToBlock.slice(i, i + BATCH_SIZE);
        const createdAt = new Date().toISOString();

        const writes = batch.map(user => ({
          $type: 'com.atproto.repo.applyWrites#create' as const,
          collection: 'app.bsky.graph.block',
          value: {
            subject: user.did,
            createdAt,
            $type: 'app.bsky.graph.block',
          },
        }));

        let success = false;
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            // Refresh token if needed before each batch
            const freshToken = await getServerAccessToken();
            if (freshToken) {
              agent.setHeader('Authorization', `Bearer ${freshToken}`);
            }

            await agent.com.atproto.repo.applyWrites({
              repo: userInfo.did,
              writes,
            });

            blockedCount += batch.length;
            success = true;

            // Send progress update
            const progress = (blockedCount / usersToBlock.length) * 100;
            await sendEvent({
              type: 'progress',
              progress,
              blockedCount,
              total: usersToBlock.length,
            });
          } catch (error) {
            const typedError = error as { status?: number; message?: string };

            if (typedError.status === 429) {
              await sleep(3000);
              continue;
            }

            if (typedError.status === 502 || typedError.message === 'UpstreamFailure') {
              await sleep(1000);
              continue;
            }

            // If batch fails, try individual blocks
            if (attempt === 2) {
              for (const user of batch) {
                try {
                  await agent.app.bsky.graph.block.create(
                    { repo: userInfo.did },
                    { subject: user.did, createdAt: new Date().toISOString() }
                  );
                  blockedCount++;
                } catch {
                  failedUsers.push(user);
                }
              }
              success = true;

              // Send progress update after individual blocks
              const progress = (blockedCount / usersToBlock.length) * 100;
              await sendEvent({
                type: 'progress',
                progress,
                blockedCount,
                total: usersToBlock.length,
              });
            }
          }
        }

        // Small delay between batches
        if (i + BATCH_SIZE < usersToBlock.length) {
          await sleep(100);
        }
      }

      await sendEvent({
        type: 'complete',
        blockedCount,
        alreadyBlockedCount,
        failedCount: failedUsers.length,
        mutuals: mutuals.map(m => ({ handle: m.handle })),
        totalProcessed: targetList.length,
      });

      await writer.close();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Block error:', errorMessage, error);
      try {
        await sendEvent({ type: 'error', message: errorMessage });
      } catch {
        // Writer may already be closed
      }
      try {
        await writer.close();
      } catch {
        // Ignore close errors
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
