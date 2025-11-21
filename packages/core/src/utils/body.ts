import type QueryString from 'qs';
import type { AnyObject } from 'typescript-api-pro';
import type { BodyType, RequestMethod, RequestMethodWithBody, RequestMethodWithParams } from '../types';
import { ContentType } from '../enum';

const withBodyArr: RequestMethodWithBody[] = ['PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const withoutBodyArr: RequestMethodWithParams[] = ['GET', 'HEAD'];

export function getBody(body: BodyType, method: RequestMethod, headers?: HeadersInit, qsConfig: QueryString.IStringifyOptions = {
  arrayFormat: 'repeat',
}): BodyInit | null {
  if (!body)
    return null;
  if (body instanceof FormData)
    return body;
  let res: BodyInit | null = null;
  if (withBodyArr.includes(method.toUpperCase() as RequestMethodWithBody)) {
    const _headers_: Headers = new Headers(headers || {});
    const _contentType = _headers_.get('Content-Type') || ContentType.JSON;
    if (_contentType.includes(ContentType.JSON)) {
      res = JSON.stringify(body);
    }
    else if (_contentType.includes(ContentType.FORM_URLENCODED)) {
      res = qs.stringify(body, qsConfig);
    }
    else if (_contentType.includes(ContentType.FORM_DATA)) {
      const formData = new FormData();
      if (!(body instanceof FormData) && typeof body === 'object') {
        const _data = body as AnyObject;
        Object.keys(_data).forEach((key) => {
          if (_data['prototype'].hasOwnProperty.call(key)) {
            formData.append(key, _data[key]);
          }
        });
        res = formData;
      }
    }
    else if (
      typeof body === 'string'
      || body instanceof URLSearchParams
      || body instanceof Blob
      || body instanceof ArrayBuffer
      || ArrayBuffer.isView(body)
      || (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
    ) {
      res = body as BodyInit;
    }
  }
  if (withoutBodyArr.includes(method.toUpperCase() as RequestMethodWithParams)) {
    res = null;
  }
  return res;
}

export function body2FormData(body: AnyObject | FormData): FormData {
  if (body instanceof FormData)
    return body;
  const formData = new FormData();
  for (const key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const value = (body as AnyObject)[key];
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      }
      else {
        formData.append(key, String(value));
      }
    }
  }
  return formData;
}
