import type { BodyType, RequestConfig } from './types';

export interface ResponseErrorOptions<E = unknown> {
  name?: string;
  message: string;
  status?: number;
  statusText?: string;
  response?: Response;
  config?: RequestConfig<unknown, BodyType, E>;
}

// export class ResponseError<E = unknown> extends Error {
//   #message: string;
//   #name: string;
//   #status?: number | undefined;
//   #statusText?: string | undefined;
//   #response?: Response | undefined;
//   #config?: RequestConfig<unknown, BodyType, E> | undefined;

//   constructor({ message, status, statusText, response, config, name }: ResponseErrorOptions<E>) {
//     super(message);
//     this.#message = message;
//     this.#status = status;
//     this.#statusText = statusText;
//     this.#response = response;
//     this.#config = config;
//     this.#name = name ?? message;
//   }

//   override get message() {
//     return this.#message;
//   }

//   get status() {
//     return this.#status;
//   }

//   get statusText() {
//     return this.#statusText;
//   }

//   get response() {
//     return this.#response;
//   }

//   get config() {
//     return this.#config;
//   }

//   override get name() {
//     return this.#name;
//   }
// }
//
export class ResponseError<E = unknown> extends Error {
  override readonly message: string;
  override readonly name: string;
  readonly status?: number | undefined;
  readonly statusText?: string | undefined;
  readonly response?: Response | undefined;
  readonly config?: RequestConfig<unknown, BodyType, E> | undefined;

  constructor({ message, status, statusText, response, config, name }: ResponseErrorOptions<E>) {
    super(message);
    this.message = message;
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.config = config;
    this.name = name ?? message;

    Object.setPrototypeOf(this, ResponseError.prototype);
  }
}
