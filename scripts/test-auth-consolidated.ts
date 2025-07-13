#!/usr/bin/env node

/**
 * Consolidated Authentication Testing Script
 * Combines OAuth config, direct auth, and user creation tests
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authOptions } from "../src/lib/auth-config"

interface CSRFResponse {
  csrfToken: string;
}

interface ProvidersResponse {
  credentials?: {
    id: string;
    name: string;
    type: string;
  };
}

async function testOAuthConfiguration() {
  console.log("🔍 Testing OAuth Configuration...")
  
  // Check environment variables
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  const githubClientId = process.env.GITHUB_CLIENT_ID
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET
  
  console.log("\n📋 Environment Variables Status:")
  console.log(`✅ GOOGLE_CLIENT_ID: ${googleClientId ? "Set" : "❌ Not set"}`)
  console.log(`✅ GOOGLE_CLIENT_SECRET: ${googleClientSecret ? "Set" : "❌ Not set"}`)
  console.log(`✅ GITHUB_CLIENT_ID: ${githubClientId ? "Set" : "❌ Not set"}`)
  console.log(`✅ GITHUB_CLIENT_SECRET: ${githubClientSecret ? "Set" : "❌ Not set"}`)
  
  // Check providers in auth configuration
  console.log("\n🔧 Providers Configuration:")
  const providers = authOptions.providers
  
  const credentialsProvider = providers.find(p => p.id === "credentials")
  const googleProvider = providers.find(p => p.id === "google")
  const githubProvider = providers.find(p => p.id === "github")
  
  console.log(`✅ Credentials Provider: ${credentialsProvider ? "Configured" : "❌ Not configured"}`)
  console.log(`✅ Google Provider: ${googleProvider ? "Configured" : "❌ Not configured"}`)
  console.log(`✅ GitHub Provider: ${githubProvider ? "Configured" : "❌ Not configured"}`)
  
  return googleClientId && googleClientSecret && githubClientId && githubClientSecret
}

async function testDirectAuthentication() {
  console.log("\n🔧 Testing Direct Authentication Components...")
  const prisma = new PrismaClient()
  
  try {
    // Test database connection
    console.log("\n📋 Database connection test...")
    const user = await prisma.user.findUnique({
      where: { email: "admin@example.com" }
    })
    
    if (!user) {
      console.log("❌ Admin user not found")
      return false
    }
    
    console.log("✅ Admin user found:", {
      id: user.id,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password
    })
    
    // Test password verification
    console.log("\n📋 Password verification test...")
    const testPassword = "admin123"
    
    if (!user.password) {
      console.log("❌ User has no password set")
      return false
    }
    
    const isValid = await bcrypt.compare(testPassword, user.password)
    console.log(`✅ Password verification: ${isValid}`)
    
    return isValid
  } catch (error) {
    console.log("❌ Direct auth test failed:", error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

async function testOAuthUserCreation() {
  console.log("\n🔍 Testing OAuth User Creation Flow...")
  const prisma = new PrismaClient()
  
  try {
    const testEmail = "test.oauth@example.com"
    const testName = "Test OAuth User"
    
    // Clean up any existing test user
    console.log("🧹 Cleaning up existing test user...")
    await prisma.user.deleteMany({
      where: { email: testEmail }
    })
    
    // Create OAuth user
    console.log("👤 Creating new OAuth user...")
    const newUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: testName,
        emailVerified: new Date(),
        // No password for OAuth users
      }
    })
    
    console.log("✅ OAuth user created:", {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      hasPassword: !!newUser.password,
      emailVerified: newUser.emailVerified
    })
    
    // Clean up
    await prisma.user.delete({ where: { id: newUser.id } })
    console.log("🧹 Test user cleaned up")
    
    return true
  } catch (error) {
    console.log("❌ OAuth user creation test failed:", error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

async function testNextAuthAPI() {
  console.log("\n🧪 Testing NextAuth API Endpoints...")
  
  const BASE_URL = "http://localhost:3000"

  try {
    // Test CSRF endpoint
    console.log("📋 Testing CSRF endpoint...")
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
    const csrfData: CSRFResponse = await csrfResponse.json()
    
    if (csrfData.csrfToken) {
      console.log("✅ CSRF endpoint working")
    } else {
      console.log("❌ CSRF endpoint failed")
      return false
    }

    // Test providers endpoint
    console.log("📋 Testing providers endpoint...")
    const providersResponse = await fetch(`${BASE_URL}/api/auth/providers`)
    const providersData: ProvidersResponse = await providersResponse.json()
    
    if (providersData.credentials) {
      console.log("✅ Credentials provider accessible")
    } else {
      console.log("❌ Credentials provider not found")
      return false
    }

    return true
  } catch (error) {
    console.log("❌ NextAuth API test failed:", error)
    console.log("ℹ️  Make sure the dev server is running: yarn dev")
    return false
  }
}

async function main() {
  console.log("🚀 Consolidated Authentication Testing\n")
  
  const results = {
    oauth: await testOAuthConfiguration(),
    direct: await testDirectAuthentication(),
    oauthUsers: await testOAuthUserCreation(),
    nextAuthAPI: await testNextAuthAPI()
  }
  
  console.log("\n📊 Test Results Summary:")
  console.log(`✅ OAuth Configuration: ${results.oauth ? "PASS" : "FAIL"}`)
  console.log(`✅ Direct Authentication: ${results.direct ? "PASS" : "FAIL"}`)
  console.log(`✅ OAuth User Creation: ${results.oauthUsers ? "PASS" : "FAIL"}`)
  console.log(`✅ NextAuth API: ${results.nextAuthAPI ? "PASS" : "FAIL"}`)
  
  const allPassed = Object.values(results).every(result => result)
  
  if (allPassed) {
    console.log("\n🎉 All authentication tests passed!")
  } else {
    console.log("\n⚠️  Some authentication tests failed.")
    console.log("📝 Please check the specific failures above.")
  }
}

main()
  .catch(console.error)
