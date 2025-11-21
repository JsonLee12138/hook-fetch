import type QueryString from 'qs';
import type { AnyObject } from 'typescript-api-pro';
import qs from 'qs';

export const DEFAULT_QS_CONFIG: QueryString.IStringifyOptions = {
  arrayFormat: 'repeat',
};

export function buildUrl(url: string, params?: AnyObject, qsConfig: QueryString.IStringifyOptions = {
  arrayFormat: 'repeat',
}): string {
  if (params) {
    const paramsStr = qs.stringify(params, qsConfig);
    if (paramsStr) {
      url = url.includes('?') ? `${url}&${paramsStr}` : `${url}?${paramsStr}`;
    }
  }
  return url;
}

export function mergeHeaders(_baseHeaders: HeadersInit | Headers = {}, _newHeaders: HeadersInit | Headers = {}): Headers {
  const _result = _baseHeaders instanceof Headers ? _baseHeaders : new Headers(_baseHeaders);
  const combineHeaders = (_headers: HeadersInit | Headers) => {
    if (!(_headers instanceof Headers)) {
      _headers = new Headers(_headers);
    }
    _headers.forEach((value, key) => {
      _result.set(key, value);
    });
  };
  combineHeaders(_newHeaders);
  return _result;
}
