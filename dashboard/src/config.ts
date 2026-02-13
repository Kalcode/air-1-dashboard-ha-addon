/**
 * Get API base URL from environment or use default
 * In production (Home Assistant addon), APIs are served from same origin
 * In development, use mock server on port 8099
 *
 * Returns base URL with trailing slash if set, or empty string for production
 * This allows concatenation like: `${API_BASE_URL}api/config`
 * - Development: "http://localhost:8099/" + "api/config"
 * - Production: "" + "api/config" (relative path, no leading slash)
 */
export function getApiBaseUrl(): string {
  // @ts-ignore - Astro env vars
  const envBaseUrl = import.meta.env.PUBLIC_API_BASE_URL;

  if (envBaseUrl) {
    // Ensure trailing slash for proper concatenation
    return envBaseUrl.endsWith('/') ? envBaseUrl : `${envBaseUrl}/`;
  }

  // Default: empty string for production (relative paths, no leading slash)
  return '';
}

export const API_BASE_URL = getApiBaseUrl();
