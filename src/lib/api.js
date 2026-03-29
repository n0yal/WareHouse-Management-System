const rawApiUrl = (import.meta.env.VITE_API_URL || "/api").trim()

export const API_URL = rawApiUrl.endsWith("/")
  ? rawApiUrl.slice(0, -1)
  : rawApiUrl
