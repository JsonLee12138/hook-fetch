import type { HookFetchPlugin } from '../types';

export interface SSETextDecoderPluginOptions {
  splitSeparator: string;
  lineSeparator: string | undefined;
  trim: boolean;
  json: boolean;
  prefix: string;
  doneSymbol: string;
}

/**
 * SSE 文本解码插件 | A SSE (Server-Sent Events) response text decoder plugin.
 *
 * 用于处理服务端推送事件(SSE)的响应流,提供以下功能:
 * - 将二进制Buffer解码为文本
 * - 按指定分隔符拆分事件块
 * - 去除首尾空白字符
 * - 自动JSON解析
 * - 移除特定前缀
 *
 * Processes Server-Sent Events (SSE) response streams with the following features:
 * - Decodes binary buffer to text
 * - Splits event chunks by specified separator
 * - Trims whitespace
 * - Automatic JSON parsing
 * - Removes specified prefix
 *
 * @param {object} [options] 配置选项 | Plugin options
 * @param {string} [options.splitSeparator] 分割符,用于拆分事件块(默认 '\n\n') | Separator for splitting events (default '\n\n')
 * @param {string} [options.lineSeparator] 行分割符,用于拆分每行(可选) | Line separator for splitting each line (optional)
 * @param {boolean} [options.trim] 是否去除首尾空白(默认 true) | Whether to trim whitespace (default true)
 * @param {boolean} [options.json] 是否解析JSON(默认 false) | Whether to parse JSON (default false)
 * @param {string} [options.prefix] 要移除的前缀,如 "data: "(默认为空) | Prefix to remove, e.g. "data: " (default '')
 * @param {string} [options.doneSymbol] 结束标记,收到此标记时结束流(可选) | Symbol indicating stream end (optional)
 * @returns {HookFetchPlugin} 返回 HookFetch 插件实例 | Returns a HookFetch plugin instance
 * @example
 * request.use(sseTextDecoderPlugin({
 *   json: true,
 *   prefix: 'data:',
 *   splitSeparator: '\n\n',
 *   doneSymbol: '[DONE]'
 * }));
 */
export function sseTextDecoderPlugin({ splitSeparator = '\n\n', lineSeparator = void 0, trim = true, json = false, prefix = '', doneSymbol = void 0 }: Partial<SSETextDecoderPluginOptions> = {}): HookFetchPlugin<unknown, { sseAble: boolean }> {
  return {
    name: 'sse',
    async beforeStream(body, config) {
      if (!(config.extra?.sseAble ?? true)) {
        return body;
      }
      const decoderThrough = new TextDecoderStream();
      const splitStream = new SplitStream({ splitSeparator });
      const transformPartStream = new TransformPartStream({ splitSeparator: lineSeparator ?? '', trim, json, prefix, doneSymbol: doneSymbol ?? '' });
      return body.pipeThrough(decoderThrough).pipeThrough(splitStream).pipeThrough(transformPartStream);
    },
  };
}

const isValidString = (str: string) => (str ?? '').trim() !== '';

interface SplitThroughOptions {
  splitSeparator: string;
}

class SplitStream extends TransformStream<string, string> {
  constructor({ splitSeparator = '\n\n' }: Partial<SplitThroughOptions> = {}) {
    let buffer = '';
    const params: Transformer<string, string> = {
      transform(chunk, controller) {
        buffer += chunk;
        const parts = buffer.split(splitSeparator);
        parts.slice(0, -1).forEach((part) => {
          if (isValidString(part))
            controller.enqueue(part);
        });
        buffer = parts[parts.length - 1] as string;
      },
      flush(controller) {
        if (isValidString(buffer))
          controller.enqueue(buffer);
      },
    };
    super(params);
  }
}

type TransformPartStreamOptions = Omit<SSETextDecoderPluginOptions, 'lineSeparator'> & {
  splitSeparator: SSETextDecoderPluginOptions['lineSeparator'];
};

class TransformPartStream extends TransformStream<string, string> {
  constructor({ splitSeparator = void 0, trim = true, json = false, prefix = '', doneSymbol = void 0 }: Partial<TransformPartStreamOptions> = {}) {
    const dealLineTrim = (line: string, _trim_: boolean): string => {
      if (_trim_) {
        return line.trim();
      }
      return line;
    };
    const isDone = (line: string) => !!doneSymbol && line.slice(prefix.length).trim() === doneSymbol;
    const params: Transformer<string, string> = {
      transform(chunk, controller) {
        const lines = splitSeparator ? chunk.split(splitSeparator) : [chunk];
        for (const line of lines) {
          if (json) {
            try {
              const r = JSON.parse(line.slice(prefix.length).trim());
              controller.enqueue(r);
            }
            catch {
              if (isDone(line)) {
                controller.terminate();
              }
              else {
                controller.enqueue((dealLineTrim(line, trim)));
              }
            }
          }
          else {
            if (isDone(line)) {
              controller.terminate();
            }
            else {
              controller.enqueue(dealLineTrim(line, trim));
            }
          }
        }
      },
    };
    super(params);
  }
}
