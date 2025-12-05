import { auth } from "./auth"

export async function getSession() {
  return await auth()
}

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === "ADMIN"
}

export async function getOperatorId() {
  const user = await getCurrentUser()
  return user?.operatorId
}
