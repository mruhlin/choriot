import { generateChoreInstances } from '../chore-schedule'
import { RecurrenceType } from '@/generated/prisma/index'

describe('chore-schedule', () => {
  describe('generateChoreInstances', () => {
    // Use UTC as timezone for tests to have predictable behavior
    const timezone = 'UTC'
    const startDate = new Date('2024-01-01T00:00:00.000Z')
    const endDate = new Date('2024-01-14T00:00:00.000Z')

    it('should generate a one-time chore instance', () => {
      const chores = [
        {
          id: 'chore-1',
          title: 'Clean garage',
          description: 'Deep clean',
          recurrenceType: 'NONE' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-05T00:00:00.000Z'),
          dueTime: '09:00',
          points: 10,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances).toHaveLength(1)
      expect(instances[0]).toMatchObject({
        choreId: 'chore-1',
        title: 'Clean garage',
        dueDate: new Date('2024-01-05T00:00:00.000Z'),
        points: 10,
        isRecurring: false,
        isCompleted: false,
      })
    })

    it('should not include one-time chore outside date range', () => {
      const chores = [
        {
          id: 'chore-1',
          title: 'Clean garage',
          description: null,
          recurrenceType: 'NONE' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-02-01T00:00:00.000Z'),
          dueTime: null,
          points: 10,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances).toHaveLength(0)
    })

    it('should generate daily recurring chore instances', () => {
      const chores = [
        {
          id: 'chore-daily',
          title: 'Take out trash',
          description: null,
          recurrenceType: 'DAILY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          dueTime: '20:00',
          points: 5,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances).toHaveLength(14) // 14 days
      expect(instances[0].dueDate).toEqual(new Date('2024-01-01T00:00:00.000Z'))
      expect(instances[13].dueDate).toEqual(new Date('2024-01-14T00:00:00.000Z'))
      expect(instances.every(i => i.isRecurring)).toBe(true)
    })

    it('should generate weekly recurring chore instances', () => {
      const chores = [
        {
          id: 'chore-weekly',
          title: 'Mow lawn',
          description: null,
          recurrenceType: 'WEEKLY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          dueTime: null,
          points: 20,
          groupId: 'group-1',
          group: { id: 'group-1', name: 'Family' },
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances).toHaveLength(2) // 2 weeks
      expect(instances[0].dueDate).toEqual(new Date('2024-01-01T00:00:00.000Z'))
      expect(instances[1].dueDate).toEqual(new Date('2024-01-08T00:00:00.000Z'))
      expect(instances[0].groupName).toBe('Family')
    })

    it('should generate biweekly recurring chore instances', () => {
      const chores = [
        {
          id: 'chore-biweekly',
          title: 'Deep clean house',
          description: null,
          recurrenceType: 'BIWEEKLY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          dueTime: null,
          points: 50,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances).toHaveLength(1)
      expect(instances[0].dueDate).toEqual(new Date('2024-01-01T00:00:00.000Z'))
    })

    it('should generate monthly recurring chore instances', () => {
      const chores = [
        {
          id: 'chore-monthly',
          title: 'Pay bills',
          description: null,
          recurrenceType: 'MONTHLY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          dueTime: null,
          points: 10,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const rangeStart = new Date('2024-01-01T00:00:00.000Z')
      const rangeEnd = new Date('2024-03-31T00:00:00.000Z')
      const instances = generateChoreInstances(chores, rangeStart, rangeEnd, timezone)

      expect(instances).toHaveLength(3) // Jan, Feb, Mar
      expect(instances[0].dueDate).toEqual(new Date('2024-01-01T00:00:00.000Z'))
      expect(instances[1].dueDate).toEqual(new Date('2024-02-01T00:00:00.000Z'))
      expect(instances[2].dueDate).toEqual(new Date('2024-03-01T00:00:00.000Z'))
    })

    it('should mark completed instances', () => {
      const chores = [
        {
          id: 'chore-1',
          title: 'Water plants',
          description: null,
          recurrenceType: 'DAILY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          dueTime: null,
          points: 5,
          groupId: null,
          group: null,
          assignments: [],
          completions: [
            {
              userId: 'user-1',
              completedAt: new Date('2024-01-02T10:00:00Z'),
              dueDate: new Date('2024-01-02T00:00:00.000Z'),
              user: { id: 'user-1', name: 'Alice' },
            },
          ],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      const completedInstance = instances.find(
        i => i.dueDate.toISOString().startsWith('2024-01-02')
      )
      expect(completedInstance?.isCompleted).toBe(true)
      expect(completedInstance?.completedBy).toEqual({ id: 'user-1', name: 'Alice' })

      const uncompletedInstance = instances.find(
        i => i.dueDate.toISOString().startsWith('2024-01-03')
      )
      expect(uncompletedInstance?.isCompleted).toBe(false)
      expect(uncompletedInstance?.completedBy).toBeNull()
    })

    it('should include assigned user information', () => {
      const chores = [
        {
          id: 'chore-1',
          title: 'Wash dishes',
          description: null,
          recurrenceType: 'NONE' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-05T00:00:00.000Z'),
          dueTime: null,
          points: 5,
          groupId: null,
          group: null,
          assignments: [
            {
              userId: 'user-2',
              dueDate: new Date('2024-01-05T00:00:00.000Z'),
              user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' },
            },
          ],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances[0].assignedUser).toEqual({
        id: 'user-2',
        name: 'Bob',
        email: 'bob@example.com',
      })
    })

    it('should mark first uncompleted occurrence for recurring chores', () => {
      const chores = [
        {
          id: 'chore-1',
          title: 'Feed pet',
          description: null,
          recurrenceType: 'DAILY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          dueTime: null,
          points: 5,
          groupId: null,
          group: null,
          assignments: [],
          completions: [
            {
              userId: 'user-1',
              completedAt: new Date('2024-01-01T10:00:00Z'),
              dueDate: new Date('2024-01-01T00:00:00.000Z'),
              user: { id: 'user-1', name: 'Alice' },
            },
            {
              userId: 'user-1',
              completedAt: new Date('2024-01-02T10:00:00Z'),
              dueDate: new Date('2024-01-02T00:00:00.000Z'),
              user: { id: 'user-1', name: 'Alice' },
            },
          ],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      // First two are completed, third should be marked as first uncompleted
      expect(instances[0].isFirstUncompletedOccurrence).toBe(false)
      expect(instances[1].isFirstUncompletedOccurrence).toBe(false)
      expect(instances[2].isFirstUncompletedOccurrence).toBe(true)
      expect(instances[3].isFirstUncompletedOccurrence).toBe(false)
    })

    it('should handle multiple chores and sort by due date', () => {
      const chores = [
        {
          id: 'chore-2',
          title: 'Chore B',
          description: null,
          recurrenceType: 'NONE' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-10T00:00:00.000Z'),
          dueTime: null,
          points: 5,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
        {
          id: 'chore-1',
          title: 'Chore A',
          description: null,
          recurrenceType: 'NONE' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-05T00:00:00.000Z'),
          dueTime: null,
          points: 5,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances).toHaveLength(2)
      expect(instances[0].title).toBe('Chore A')
      expect(instances[1].title).toBe('Chore B')
    })

    it('should handle recurring chore starting before the range', () => {
      const chores = [
        {
          id: 'chore-1',
          title: 'Old recurring chore',
          description: null,
          recurrenceType: 'WEEKLY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2023-12-01T00:00:00.000Z'),
          dueTime: null,
          points: 10,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances.length).toBeGreaterThan(0)
      expect(instances[0].dueDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
      expect(instances.every(i => i.dueDate.getTime() <= endDate.getTime())).toBe(true)
    })
  })
})
