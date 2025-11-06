import { Session } from 'next-auth'

export const mockPrismaClient = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  group: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  groupMembership: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  chore: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  choreAssignment: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  choreCompletion: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
}

export const createMockSession = (
  userId: string = 'test-user-id',
  email: string = 'test@example.com',
  name: string = 'Test User'
): Session => ({
  user: {
    id: userId,
    email,
    name,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

export const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  password: 'hashed_password',
  createdAt: new Date('2024-01-01'),
}

export const mockGroup = {
  id: 'group-1',
  name: 'Family',
  createdAt: new Date('2024-01-01'),
}

export const mockChore = {
  id: 'chore-1',
  title: 'Clean kitchen',
  description: 'Deep clean',
  recurrenceType: 'WEEKLY' as const,
  recurrenceValue: null,
  startDate: new Date('2024-01-01'),
  dueTime: '09:00',
  points: 10,
  groupId: 'group-1',
  userId: 'user-1',
  createdAt: new Date('2024-01-01'),
}

export const resetMocks = () => {
  Object.values(mockPrismaClient).forEach((model) => {
    Object.values(model).forEach((method) => {
      if (jest.isMockFunction(method)) {
        method.mockReset()
      }
    })
  })
}
