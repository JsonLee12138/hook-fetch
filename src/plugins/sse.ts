import type { HookFetchPlugin } from "../types";

const decoder = new TextDecoder('utf-8');

export const sseTextDecoderPlugin = (): HookFetchPlugin => {
  return {
    name: 'sse',
    async transformStreamChunk(chunk) {
      if (!chunk.error) {
        chunk.result = decoder.decode(chunk.result as AllowSharedBufferSource, { stream: true });
      }
      return chunk;
    }
  }
}
