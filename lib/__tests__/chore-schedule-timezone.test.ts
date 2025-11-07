import { generateChoreInstances } from '../chore-schedule'
import { RecurrenceType } from '@prisma/client'

describe('chore-schedule with timezone support', () => {
  describe('generateChoreInstances with timezone', () => {
    it('should generate instances in user timezone (Pacific)', () => {
      // Test for Pacific timezone - 8 hours behind UTC
      const pacificTimezone = 'America/Los_Angeles'
      
      // Start date: Jan 1, 2024 at midnight Pacific Time
      const startDate = new Date('2024-01-01T08:00:00.000Z') // Midnight PST
      const endDate = new Date('2024-01-04T08:00:00.000Z')   // 3 days later at midnight PST

      const chores = [
        {
          id: 'chore-1',
          title: 'Morning chore',
          description: 'Test chore',
          recurrenceType: 'DAILY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T08:00:00.000Z'),
          dueTime: '09:00',
          points: 10,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, pacificTimezone)

      expect(instances).toHaveLength(4) // Jan 1, 2, 3, 4 (inclusive range)
      expect(instances[0].dueTime).toBe('09:00')
    })

    it('should generate instances in user timezone (Eastern)', () => {
      // Test for Eastern timezone - 5 hours behind UTC
      const easternTimezone = 'America/New_York'
      
      // Start date: Jan 1, 2024 at midnight Eastern Time
      const startDate = new Date('2024-01-01T05:00:00.000Z') // Midnight EST
      const endDate = new Date('2024-01-04T05:00:00.000Z')   // 3 days later at midnight EST

      const chores = [
        {
          id: 'chore-1',
          title: 'Evening chore',
          description: 'Test chore',
          recurrenceType: 'DAILY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T05:00:00.000Z'),
          dueTime: '21:00',
          points: 5,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, easternTimezone)

      expect(instances).toHaveLength(4) // Jan 1, 2, 3, 4 (inclusive range)
      expect(instances[0].dueTime).toBe('21:00')
    })

    it('should handle weekly recurring chores correctly across timezones', () => {
      const timezone = 'America/Chicago'
      
      // Start: Monday Jan 1, 2024 at midnight CT
      const startDate = new Date('2024-01-01T06:00:00.000Z')
      const endDate = new Date('2024-01-22T06:00:00.000Z') // 3 weeks later

      const chores = [
        {
          id: 'chore-weekly',
          title: 'Weekly chore',
          description: null,
          recurrenceType: 'WEEKLY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T06:00:00.000Z'),
          dueTime: '10:00',
          points: 20,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances).toHaveLength(4) // 4 weeks (Jan 1, 8, 15, 22)
      // Check that all instances are 7 days apart
      expect(instances[1].dueDate.getTime() - instances[0].dueDate.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
      expect(instances[2].dueDate.getTime() - instances[1].dueDate.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('should handle DST transitions correctly', () => {
      // In 2024, DST begins on March 10 in US timezones
      const timezone = 'America/Los_Angeles'
      
      // Start a week before DST change
      const startDate = new Date('2024-03-05T08:00:00.000Z')
      const endDate = new Date('2024-03-15T07:00:00.000Z') // After DST change (note: UTC offset changes)

      const chores = [
        {
          id: 'chore-dst',
          title: 'Daily during DST',
          description: null,
          recurrenceType: 'DAILY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-03-05T08:00:00.000Z'),
          dueTime: '09:00',
          points: 5,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      // Should still generate daily instances correctly across DST boundary
      expect(instances.length).toBeGreaterThanOrEqual(10)
      expect(instances.every(i => i.dueTime === '09:00')).toBe(true)
    })

    it('should match completions correctly in different timezones', () => {
      const timezone = 'America/Denver'
      
      const startDate = new Date('2024-01-01T07:00:00.000Z')
      const endDate = new Date('2024-01-07T07:00:00.000Z')

      const chores = [
        {
          id: 'chore-1',
          title: 'Test chore',
          description: null,
          recurrenceType: 'DAILY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T07:00:00.000Z'),
          dueTime: '12:00',
          points: 10,
          groupId: null,
          group: null,
          assignments: [],
          completions: [
            {
              userId: 'user-1',
              completedAt: new Date('2024-01-03T19:00:00.000Z'), // Noon Denver time = 7pm UTC
              dueDate: new Date('2024-01-03T07:00:00.000Z'), // Midnight Denver time
              user: { id: 'user-1', name: 'Test User' },
            },
          ],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      const completedInstance = instances.find(
        i => i.dueDate.getTime() === new Date('2024-01-03T07:00:00.000Z').getTime()
      )
      
      expect(completedInstance).toBeDefined()
      expect(completedInstance?.isCompleted).toBe(true)
      expect(completedInstance?.completedBy?.name).toBe('Test User')
    })

    it('should handle monthly recurrence in timezone-aware manner', () => {
      const timezone = 'Europe/London'
      
      // Start: Jan 1, 2024 at midnight GMT
      const startDate = new Date('2024-01-01T00:00:00.000Z')
      const endDate = new Date('2024-04-30T23:59:59.999Z')

      const chores = [
        {
          id: 'chore-monthly',
          title: 'Monthly bills',
          description: null,
          recurrenceType: 'MONTHLY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          dueTime: '09:00',
          points: 15,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      const instances = generateChoreInstances(chores, startDate, endDate, timezone)

      expect(instances).toHaveLength(4) // Jan, Feb, Mar, Apr
      expect(instances.every(i => i.dueTime === '09:00')).toBe(true)
    })

    it('should default to Pacific timezone when not specified', () => {
      const startDate = new Date('2024-01-01T08:00:00.000Z')
      const endDate = new Date('2024-01-03T08:00:00.000Z')

      const chores = [
        {
          id: 'chore-1',
          title: 'Test',
          description: null,
          recurrenceType: 'DAILY' as RecurrenceType,
          recurrenceValue: null,
          startDate: new Date('2024-01-01T08:00:00.000Z'),
          dueTime: '09:00',
          points: 5,
          groupId: null,
          group: null,
          assignments: [],
          completions: [],
        },
      ]

      // Call without timezone parameter - should default to Pacific
      const instances = generateChoreInstances(chores, startDate, endDate)

      expect(instances).toHaveLength(3) // Jan 1, 2, 3 (inclusive range)
    })
  })
})
