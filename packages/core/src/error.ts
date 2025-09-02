import type { RequestConfig } from './types';

export interface ResponseErrorOptions<E = unknown> {
  name?: string;
  message: string;
  status?: number;
  statusText?: string;
  response?: Response;
  config?: RequestConfig<unknown, unknown, E>;
}

export class ResponseError<E = unknown> extends Error {
  #message: string;
  #name: string;
  #status?: number;
  #statusText?: string;
  #response?: Response;
  #config?: RequestConfig<unknown, unknown, E>;

  constructor({ message, status, statusText, response, config, name }: ResponseErrorOptions<E>) {
    super(message);
    this.#message = message;
    this.#status = status;
    this.#statusText = statusText;
    this.#response = response;
    this.#config = config;
    this.#name = name ?? message;
  }

  get message() {
    return this.#message;
  }

  get status() {
    return this.#status;
  }

  get statusText() {
    return this.#statusText;
  }

  get response() {
    return this.#response;
  }

  get config() {
    return this.#config;
  }

  get name() {
    return this.#name;
  }
}
