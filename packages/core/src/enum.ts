export enum ContentType {
  JSON = 'application/json',
  FORM_URLENCODED = 'application/x-www-form-urlencoded',
  FORM_DATA = 'multipart/form-data',
  TEXT = 'text/plain',
  HTML = 'text/html',
  XML = 'text/xml',
  CSV = 'text/csv',
  STREAM = 'application/octet-stream',
}

export enum StatusCode {
  TIME_OUT = 408,
  ABORTED = 499,
  NETWORK_ERROR = 599,
  BODY_NULL = 502,
  UNKNOWN = 601,
}

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}
