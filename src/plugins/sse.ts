import type { HookFetchPlugin } from "../types";

const decoder = new TextDecoder('utf-8');

export interface SSETextDecoderPluginOptions {
  splitSeparator: string;
  trim: boolean;
  json: boolean;
  prefix: string;
}

/**
 * SSE 文本解码插件
 *
 * A SSE (Server-Sent Events) response text decoder plugin.
 *
 * 用于对服务端推送消息（SSE）响应流中的 Buffer 进行解码、分割、trim、JSON-parsing，以及可选前缀剥离。
 *
 * Decodes SSE response stream buffer, splits by separator, trims, JSON-parses and optionally removes prefix.
 *
 * @param {Object} [options] 配置选项
 * @param {Object} [options] Plugin options
 * @param {string} [options.splitSeparator='\n\n'] 分割符，用于拆分事件块（默认 '\n\n'）
 * @param {string} [options.splitSeparator='\n\n'] Separator to split SSE events (default '\n\n')
 * @param {boolean} [options.trim=true] 是否对分块做 trim 去除首尾空白（默认 true）
 * @param {boolean} [options.trim=true] Whether to trim leading/trailing spaces (default true)
 * @param {boolean} [options.json=false] 是否尝试将每块内容解析为 JSON（默认 false）
 * @param {boolean} [options.json=false] Whether to parse each chunk as JSON (default false)
 * @param {string} [options.prefix=''] 去除每块内容的特定前缀（如 "data: "，默认无）
 * @param {string} [options.prefix=''] Prefix to be removed from every chunk (like "data: ", default '')
 * @returns {HookFetchPlugin} 返回 HookFetch 插件实例
 * @returns {HookFetchPlugin} Returns a HookFetch plugin instance.
 * @example
 * request.use(sseTextDecoderPlugin({
 *   json: true,
 *   prefix: 'data:',
 *   splitSeparator: '\n\n'
 * }));
 */
export const sseTextDecoderPlugin = ({ splitSeparator = '\n\n', trim = true, json = false, prefix = '' }: Partial<SSETextDecoderPluginOptions> = {}): HookFetchPlugin => {
  return {
    name: 'sse',
    async transformStreamChunk(chunk) {
      if (!chunk.error) {
        const result = decoder.decode(chunk.result as AllowSharedBufferSource, { stream: true });
        const chunks = result.split(splitSeparator).map(item => item.trim()).filter(Boolean);
        if (chunks.length > 1) {
          function* items() {
            for (const item of chunks) {
              if (json) {
                try {
                  const r = JSON.parse(item.trim().slice(prefix.length).trim());
                  yield r;
                } catch (error) {
                  if(trim){
                  yield item.trim();
                }else{
                  yield item;
                }
                }
              }else{
                if(trim){
                  yield item.trim();
                }else{
                  yield item;
                }
              }
            }
          }
          chunk.result = items();
        } else {
          if(json){
            try {
              const r = JSON.parse(result.trim().slice(prefix.length).trim());
              chunk.result = r;
            } catch (error) {
              chunk.result = result;
            }
          }else{
            if(trim){
              chunk.result = result.trim();
            }else{
              chunk.result = result;
            }
          }
          return chunk;
        }
      }
      return chunk;
    }
  }
}
