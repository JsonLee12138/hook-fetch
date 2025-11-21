export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function isGenerator(v: any) {
  return v[Symbol.toStringTag] === 'Generator' && typeof v.next === 'function' && typeof v.return === 'function' && typeof v.throw === 'function' && typeof v[Symbol.iterator] === 'function';
}

export function isAsyncGenerator(v: any) {
  return v[Symbol.toStringTag] === 'AsyncGenerator' && typeof v.next === 'function' && typeof v.return === 'function' && typeof v.throw === 'function' && typeof v[Symbol.asyncIterator] === 'function';
}
