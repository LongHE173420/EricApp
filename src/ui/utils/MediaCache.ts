// Try later frames first because many surf videos start with black intro frames.
export const THUMBNAIL_TIMESTAMPS = [6000, 9000, 12000, 2500, 4000, 1000];
export const GENERATED_THUMBNAIL_CACHE = new Map<string, string>();
export const FAILED_REMOTE_THUMBNAIL_URLS = new Set<string>();
