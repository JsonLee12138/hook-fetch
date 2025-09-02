import hookFetch from './base';

export * from './base';
export * from './enum';
export * from './error';
export * from './plugins';
export * from './types';
export default hookFetch;

globalThis && ((globalThis as any).hookFetch = hookFetch);
