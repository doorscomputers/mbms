/**
 * Safe fetch utility with proper error handling
 * Ensures HTTP status is checked before parsing JSON
 */

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Safely fetch JSON from an API endpoint
 * - Checks HTTP status before parsing
 * - Handles non-JSON error responses
 * - Returns typed response
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, options)

  // Try to parse the response body
  const text = await res.text()
  let json: ApiResponse<T>

  try {
    json = JSON.parse(text)
  } catch {
    // Response is not JSON - this is likely an error page
    if (!res.ok) {
      throw new ApiError(
        `Server error: ${res.status} ${res.statusText}`,
        res.status
      )
    }
    // Somehow got non-JSON success response
    throw new ApiError('Invalid response format from server', res.status)
  }

  // Check HTTP status
  if (!res.ok) {
    throw new ApiError(
      json.error || `HTTP ${res.status}: ${res.statusText}`,
      res.status
    )
  }

  // Check API success flag
  if (!json.success) {
    throw new ApiError(
      json.error || 'Request failed',
      res.status
    )
  }

  return json
}

/**
 * POST JSON to an API endpoint
 */
export async function postJson<T = unknown>(
  url: string,
  data: unknown
): Promise<ApiResponse<T>> {
  return safeFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/**
 * PUT JSON to an API endpoint
 */
export async function putJson<T = unknown>(
  url: string,
  data: unknown
): Promise<ApiResponse<T>> {
  return safeFetch<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/**
 * DELETE request to an API endpoint
 */
export async function deleteRequest<T = unknown>(
  url: string
): Promise<ApiResponse<T>> {
  return safeFetch<T>(url, {
    method: 'DELETE',
  })
}
