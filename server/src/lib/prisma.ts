// Prisma客户端单例
import { PrismaClient } from '@prisma/client'

// 全局单例，避免开发模式下重复创建连接
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
