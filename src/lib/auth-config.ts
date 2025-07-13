import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { NextAuthOptions } from "next-auth"
import type { Adapter } from "next-auth/adapters"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("🔐 Authorize called with:", { email: credentials?.email })
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials")
          return null
        }

        console.log("🔍 About to query database...")
        
        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user || !user.password) {
            console.log("❌ User not found or no password")
            return null
          }

          console.log("✅ User found, verifying password...")

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.log("❌ Invalid password")
            return null
          }

          console.log("✅ Authentication successful for:", user.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.log("❌ Database error:", error instanceof Error ? error.message : 'Unknown error')
          return null
        }
      }
    }),
    // OAuth providers - only add if environment variables are present
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET 
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []
    ),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [GitHubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })]
      : []
    ),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, ensure user has a role
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          // Check if this is a new user (first time signing in with OAuth)
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (!existingUser) {
            // This is handled by the PrismaAdapter, but we need to ensure role is set
            // The adapter will create the user, but we'll update it to add the role
            console.log("🔄 New OAuth user detected, will set default role")
          }
        } catch (error) {
          console.error("Error in signIn callback:", error)
        }
      }
      return true
    },
    async jwt({ token, user }) {
      // Include user role in the token
      if (user) {
        token.role = user.role
        token.userId = user.id
      } else if (token.userId && !token.role) {
        // If we have a userId but no role, fetch it from the database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.userId as string },
            select: { role: true }
          })
          if (dbUser) {
            token.role = dbUser.role
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
        }
      }
      return token
    },
    async session({ session, token }) {
      // Include user role in the session
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as "USER" | "ADMIN"
        
        // If role is missing, fetch it from database and ensure user has default role
        if (!session.user.role && session.user.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: session.user.email },
              select: { id: true, role: true }
            })
            
            if (dbUser) {
              session.user.id = dbUser.id
              session.user.role = dbUser.role || "USER"
              
              // If no role is set, update the user with default role
              if (!dbUser.role) {
                await prisma.user.update({
                  where: { id: dbUser.id },
                  data: { role: "USER" }
                })
                session.user.role = "USER"
              }
            }
          } catch (error) {
            console.error("Error in session callback:", error)
            session.user.role = "USER" // Default fallback
          }
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}
