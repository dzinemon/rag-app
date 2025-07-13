#!/usr/bin/env node

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function deleteAdmin(): Promise<void> {
  try {
    const result = await prisma.user.deleteMany({
      where: { email: "admin@example.com" }
    })
    console.log(`Deleted ${result.count} admin user(s)`)
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : 'Unknown error')
  } finally {
    await prisma.$disconnect()
  }
}

deleteAdmin()
