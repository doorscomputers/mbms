import { auth } from "./auth"

export async function getSession() {
  return await auth()
}

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

// Check if user is SUPER_ADMIN (can access everything)
export async function isSuperAdmin() {
  const user = await getCurrentUser()
  return user?.role === "SUPER_ADMIN"
}

// Check if user is ROUTE_ADMIN (can manage their assigned route)
export async function isRouteAdmin() {
  const user = await getCurrentUser()
  return user?.role === "ROUTE_ADMIN"
}

// Legacy isAdmin - now checks for SUPER_ADMIN
export async function isAdmin() {
  return await isSuperAdmin()
}

// Check if user can manage routes (SUPER_ADMIN or ROUTE_ADMIN)
export async function canManageRoute() {
  const user = await getCurrentUser()
  return user?.role === "SUPER_ADMIN" || user?.role === "ROUTE_ADMIN"
}

export async function getOperatorId() {
  const user = await getCurrentUser()
  return user?.operatorId
}

export async function getRouteId() {
  const user = await getCurrentUser()
  return user?.routeId
}

// Get the route filter for queries based on user role
// Returns null if user can access all routes (SUPER_ADMIN)
// Returns routeId if user is ROUTE_ADMIN
// Returns undefined if user has no route access (OPERATOR without route)
export async function getRouteFilter() {
  const user = await getCurrentUser()
  if (!user) return undefined

  if (user.role === "SUPER_ADMIN") {
    return null // No filter, access all
  }

  if (user.role === "ROUTE_ADMIN" && user.routeId) {
    return user.routeId
  }

  return undefined
}
