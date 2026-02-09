import type { HookFetchPlugin } from '../types';

export interface SSETextDecoderPluginOptions {
  splitSeparator: string;
  lineSeparator: string | undefined;
  trim: boolean;
  json: boolean;
  prefix: string;
  doneSymbol: string;
}

export function sseTextDecoderPlugin({ splitSeparator = '\n\n', lineSeparator = void 0, trim = true, json = false, prefix = '', doneSymbol = void 0 }: Partial<SSETextDecoderPluginOptions> = {}): HookFetchPlugin<unknown, { sseAble: boolean }> {
  return {
    name: 'sse',
    async beforeStream({ body, config }) {
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
