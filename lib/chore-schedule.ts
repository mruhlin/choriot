import { addDays, addWeeks, addMonths, startOfDay, isBefore, isAfter } from "date-fns"
import { RecurrenceType } from "@prisma/client"

export interface ChoreInstance {
  choreId: string
  title: string
  description: string | null
  dueDate: Date
  dueTime: string | null
  points: number
  groupId: string | null
  groupName: string | null
  assignedUser: {
    id: string
    name: string | null
    email: string
  } | null
  isCompleted: boolean
  completedBy: {
    id: string
    name: string | null
  } | null
  completedAt: Date | null
  isRecurring: boolean
  isFirstUncompletedOccurrence: boolean
}

interface Chore {
  id: string
  title: string
  description: string | null
  recurrenceType: RecurrenceType
  recurrenceValue: number | null
  startDate: Date
  dueTime: string | null
  points: number
  groupId: string | null
  group: { id: string; name: string } | null
  assignments: Array<{
    userId: string
    dueDate: Date
    user: { id: string; name: string | null; email: string }
  }>
  completions: Array<{
    userId: string
    completedAt: Date
    dueDate: Date
    user: { id: string; name: string | null }
  }>
}

export function generateChoreInstances(
  chores: Chore[],
  startDate: Date,
  endDate: Date
): ChoreInstance[] {
  const instances: ChoreInstance[] = []
  const isRecurringMap = new Map<string, boolean>()

  for (const chore of chores) {
    const isRecurring = chore.recurrenceType !== "NONE"
    isRecurringMap.set(chore.id, isRecurring)

    const choreDueDates = generateDueDates(
      chore.recurrenceType,
      chore.recurrenceValue,
      chore.startDate,
      startDate,
      endDate
    )

    for (const dueDate of choreDueDates) {
      // Find assignment for this date
      const assignment = chore.assignments.find(
        a => startOfDay(a.dueDate).getTime() === startOfDay(dueDate).getTime()
      )

      // Check if completed
      const completion = chore.completions.find(
        c => startOfDay(c.dueDate).getTime() === startOfDay(dueDate).getTime()
      )

      instances.push({
        choreId: chore.id,
        title: chore.title,
        description: chore.description,
        dueDate,
        dueTime: chore.dueTime,
        points: chore.points,
        groupId: chore.groupId,
        groupName: chore.group?.name || null,
        assignedUser: assignment ? assignment.user : null,
        isCompleted: !!completion,
        completedBy: completion ? completion.user : null,
        completedAt: completion ? completion.completedAt : null,
        isRecurring,
        isFirstUncompletedOccurrence: false, // Will be computed below
      })
    }
  }

  const sorted = instances.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  // Mark first uncompleted occurrence for each recurring chore
  const firstUncompletedByChore = new Map<string, ChoreInstance>()
  for (const instance of sorted) {
    if (instance.isRecurring && !instance.isCompleted && !firstUncompletedByChore.has(instance.choreId)) {
      firstUncompletedByChore.set(instance.choreId, instance)
    }
  }

  // Update instances with first uncompleted flag
  return sorted.map(instance => ({
    ...instance,
    isFirstUncompletedOccurrence: firstUncompletedByChore.get(instance.choreId) === instance,
  }))
}

function generateDueDates(
  recurrenceType: RecurrenceType,
  recurrenceValue: number | null,
  choreStartDate: Date,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = []
  const start = startOfDay(choreStartDate)

  if (recurrenceType === "NONE") {
    // One-time chore
    if (!isBefore(start, rangeStart) && !isAfter(start, rangeEnd)) {
      dates.push(start)
    }
    return dates
  }

  let currentDate = start

  // Move to first date in range
  while (isBefore(currentDate, rangeStart)) {
    currentDate = getNextOccurrence(currentDate, recurrenceType, recurrenceValue)
  }

  // Generate dates within range
  while (!isAfter(currentDate, rangeEnd)) {
    dates.push(currentDate)
    currentDate = getNextOccurrence(currentDate, recurrenceType, recurrenceValue)
  }

  return dates
}

function getNextOccurrence(
  date: Date,
  recurrenceType: RecurrenceType,
  _recurrenceValue: number | null
): Date {
  switch (recurrenceType) {
    case "DAILY":
      return addDays(date, 1)
    case "WEEKLY":
      return addWeeks(date, 1)
    case "BIWEEKLY":
      return addWeeks(date, 2)
    case "MONTHLY":
      return addMonths(date, 1)
    default:
      return date
  }
}
