import 'express'

declare module 'express' {
  interface Request {
    user?: {
      id: string
      email: string
      name: string
      image?: string | null
      emailVerified: boolean
      createdAt: Date
      updatedAt: Date
    }
  }
}
