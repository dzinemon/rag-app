import { prisma } from "../src/lib/prisma"
import { hashPassword } from "../src/lib/auth"

async function createAdminUser() {
  const email = "admin@example.com"
  const password = "admin123"
  const name = "Admin User"

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email }
  })

  if (existingAdmin) {
    console.log("Admin user already exists")
    if (existingAdmin.role !== "ADMIN") {
      // Update role to ADMIN
      await prisma.user.update({
        where: { email },
        data: { role: "ADMIN" }
      })
      console.log("Updated existing user to ADMIN role")
    }
    return
  }

  // Create admin user
  const hashedPassword = await hashPassword(password)
  
  const admin = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "ADMIN"
    }
  })

  console.log("Admin user created:", {
    id: admin.id,
    email: admin.email,
    role: admin.role
  })
  console.log("Login credentials:")
  console.log("Email:", email)
  console.log("Password:", password)
}

createAdminUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
