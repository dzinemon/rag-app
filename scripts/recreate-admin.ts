#!/usr/bin/env node

/**
 * Remove existing admin user and create a fresh one
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function recreateAdminUser(): Promise<void> {
  console.log("🗑️  Removing existing admin user...")

  try {
    // Delete existing admin user
    const deletedUser = await prisma.user.deleteMany({
      where: { email: "admin@example.com" }
    })
    
    console.log(`✅ Deleted ${deletedUser.count} admin user(s)`)

    // Create new admin user
    console.log("\n👤 Creating fresh admin user...")
    
    const email = "admin@example.com"
    const password = "admin123"
    const name = "Admin User"

    // Hash the password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
    console.log(`🔐 Password hash created (length: ${hashedPassword.length})`)

    // Create the user
    const newAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "ADMIN",
      }
    })

    console.log("✅ Admin user created successfully!")
    console.log(`   - ID: ${newAdmin.id}`)
    console.log(`   - Email: ${newAdmin.email}`)
    console.log(`   - Name: ${newAdmin.name}`)
    console.log(`   - Role: ${newAdmin.role}`)
    console.log(`   - Created: ${newAdmin.createdAt}`)

    // Test password verification immediately
    console.log("\n🔍 Testing password verification...")
    const isValid = await bcrypt.compare(password, hashedPassword)
    console.log(`   - Password verification: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`)

    console.log("\n🎉 Admin user recreation completed!")
    console.log("\n📝 Login Credentials:")
    console.log("   Email: admin@example.com")
    console.log("   Password: admin123")

  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : 'Unknown error')
  } finally {
    await prisma.$disconnect()
  }
}

recreateAdminUser()
