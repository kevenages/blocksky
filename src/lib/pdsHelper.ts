// src/lib/pdsHelper.ts
export async function resolvePDS(handle: string): Promise<string | null> {
  try {
    const response = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`);
    if (!response.ok) {
      throw new Error(`Failed to resolve PDS for handle: ${handle}`);
    }
    const data = await response.json();
    
    // Extract host information from the DID
    if (data.did) {
      const hostname = data.did.replace('did:plc:', '').replace(/\..*$/, '') + '.host.bsky.network';
      return `https://${hostname}`;
    }

    return null;
  } catch (error) {
    console.error('Error resolving PDS:', error);
    return null;
  }
}
