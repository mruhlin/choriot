import { ChoreInstance } from "./chore-schedule"
import { format } from "date-fns"

export interface ChoresByDateGroup {
  dateKey: string
  date: Date
  visibleChores: ChoreInstance[]
  hiddenRecurringChores: ChoreInstance[]
}

export interface CollapsedDateRange {
  startDate: Date
  endDate: Date
  dateGroups: ChoresByDateGroup[]
  totalHiddenChores: number
}

export type DateGroupWithCollapse = 
  | {
      type: 'visible'
      group: ChoresByDateGroup
    }
  | {
      type: 'collapsed'
      range: CollapsedDateRange
    }

/**
 * Group chores by date and separate visible from hidden recurring chores.
 * 
 * Rules:
 * - All completed chores are always visible
 * - All non-recurring chores are always visible
 * - For recurring chores: only the first uncompleted occurrence is visible,
 *   subsequent uncompleted occurrences are hidden
 */
export function groupChoresByDateWithRecurringCollapse(
  instances: ChoreInstance[]
): ChoresByDateGroup[] {
  // Group all instances by date
  const instancesByDateKey = instances.reduce((acc, instance) => {
    const dateKey = format(instance.dueDate, "yyyy-MM-dd")
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(instance)
    return acc
  }, {} as Record<string, ChoreInstance[]>)

  // Process each date group
  const dateGroups: ChoresByDateGroup[] = Object.entries(instancesByDateKey)
    .map(([dateKey, chores]) => {
      const visibleChores: ChoreInstance[] = []
      const hiddenRecurringChores: ChoreInstance[] = []

      for (const chore of chores) {
        // Always show completed chores
        if (chore.isCompleted) {
          visibleChores.push(chore)
          continue
        }

        // Always show non-recurring chores
        if (!chore.isRecurring) {
          visibleChores.push(chore)
          continue
        }

        // For recurring chores, show only if it's the first uncompleted occurrence
        if (chore.isFirstUncompletedOccurrence) {
          visibleChores.push(chore)
        } else {
          hiddenRecurringChores.push(chore)
        }
      }

      return {
        dateKey,
        date: new Date(dateKey),
        visibleChores,
        hiddenRecurringChores,
      }
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return dateGroups
}

/**
 * Further collapse date groups that have no visible chores or only hidden recurring chores.
 * Groups consecutive empty/hidden-only dates together into collapsed ranges.
 */
export function collapseEmptyDateRanges(
  dateGroups: ChoresByDateGroup[]
): DateGroupWithCollapse[] {
  const result: DateGroupWithCollapse[] = []
  let currentCollapseStart: ChoresByDateGroup | null = null
  let collapsedGroups: ChoresByDateGroup[] = []

  for (const group of dateGroups) {
    const hasVisibleChores = group.visibleChores.length > 0

    if (hasVisibleChores) {
      // This date has visible chores, so close any active collapse and add it as visible
      if (currentCollapseStart !== null) {
        // Add the collected collapsed groups
        result.push({
          type: 'collapsed',
          range: {
            startDate: currentCollapseStart.date,
            endDate: collapsedGroups[collapsedGroups.length - 1].date,
            dateGroups: collapsedGroups,
            totalHiddenChores: collapsedGroups.reduce(
              (sum, g) => sum + g.hiddenRecurringChores.length,
              0
            ),
          },
        })
        currentCollapseStart = null
        collapsedGroups = []
      }
      // Add this visible group
      result.push({
        type: 'visible',
        group,
      })
    } else {
      // This date has no visible chores, start or continue collecting
      if (currentCollapseStart === null) {
        currentCollapseStart = group
      }
      collapsedGroups.push(group)
    }
  }

  // Handle any remaining collapsed groups at the end
  if (currentCollapseStart !== null) {
    result.push({
      type: 'collapsed',
      range: {
        startDate: currentCollapseStart.date,
        endDate: collapsedGroups[collapsedGroups.length - 1].date,
        dateGroups: collapsedGroups,
        totalHiddenChores: collapsedGroups.reduce(
          (sum, g) => sum + g.hiddenRecurringChores.length,
          0
        ),
      },
    })
  }

  return result
}
