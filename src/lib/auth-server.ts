import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"
import { redirect } from "next/navigation"

export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getServerAuthSession()
  if (!session) {
    redirect("/auth/signin")
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user?.role !== "ADMIN") {
    redirect("/")
  }
  return session
}
