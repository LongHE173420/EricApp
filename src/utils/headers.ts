type BuildHeadersOptions = {
  clientType?: string;
  includeAccept?: boolean;
  includeContentType?: boolean;
  includeForwardedProto?: boolean;
  includeUserAgent?: boolean;
};

export function buildHeaders(
  deviceId?: string,
  userAgent?: string,
  options: BuildHeadersOptions = {},
): Record<string, string> {
  const {
    clientType = 'web',
    includeAccept = true,
    includeContentType = true,
    includeForwardedProto = true,
    includeUserAgent = true,
  } = options;

  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(includeAccept ? { Accept: 'application/json' } : {}),
    'X-Client-Type': clientType,
    ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
    ...(includeForwardedProto ? { 'X-Forwarded-Proto': 'https' } : {}),
    ...(includeUserAgent && userAgent ? { 'User-Agent': userAgent } : {}),
    'Accept-Language': 'vi',
  };
}
