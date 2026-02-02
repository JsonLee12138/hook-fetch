import hookFetch from './base';

export * from './base';
export * from './enum';
export * from './errors';
export * from './plugins';
export * from './types';
export default hookFetch;

globalThis && ((globalThis as any).hookFetch = hookFetch);
