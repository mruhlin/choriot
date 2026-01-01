# Recurring Chores UI Redesign

## Overview
Reduce visual redundancy by showing only the first uncompleted occurrence of each recurring chore on each date, with subsequent occurrences hidden in a collapsible section per date.

## Requirements

### Functional Requirements

1. **Main View Display (Grouped by Date)**
   - Group chores by due date
   - For each date, show:
     - All completed chores for that day
     - All non-recurring chores for that day
     - ONLY the first uncompleted occurrence of each recurring chore
   - Date headers: "Today", "Tomorrow", "Saturday", etc.

2. **Collapsible Recurring Section Per Date**
   - One collapsible section per date labeled "[+N recurring]"
   - Contains all subsequent uncompleted occurrences for that date
   - Only appears if there are hidden recurring chores for that date
   - Default state: collapsed

3. **Interaction Model**
   - Click "[+N recurring]" to expand/collapse for that specific date
   - Expanding shows list of upcoming occurrences (chore title + due date or just title if same date)
   - Each occurrence is still clickable/completable
   - Collapsing hides subsequent occurrences again

4. **Completion Behavior**
   - When first uncompleted occurrence is completed:
     - Remove from main view
     - Next uncompleted occurrence of that chore moves to main view
     - "[+N recurring]" count decrements (or disappears if zero)
   - Completing a hidden occurrence just updates the count

5. **Grouping Logic**
   - Group ALL chores by date (not just recurring)
   - Within each date:
     - Show completed chores (for context/satisfaction)
     - Show non-recurring chores
     - Show first uncompleted of each recurring chore
     - Collapse remaining uncompleted occurrences per recurring chore into "[+N recurring]" button

### Example Layout

```
TODAY
  ✓ eat breakfast (completed)
  ✓ eat lunch (completed)
  ☐ eat supper

TOMORROW
  ☐ eat breakfast
  ☐ eat lunch
  [+1 recurring]

SATURDAY
  [+3 recurring]

SUNDAY
  ☐ mow the lawn
  [+3 recurring]
```

### UI Components

1. **Date Header** 
   - "Today", "Tomorrow", or formatted date
   - Group divider/background

2. **Main Chore Items**
   - Standard chore card/row
   - Checkbox for completion
   - Title, due time if applicable

3. **Collapsible Recurring Badge**
   - Inline button: "[+N recurring]" 
   - Click to toggle expanded view for that date
   - When expanded, shows compact list of hidden occurrences
   - Arrow/chevron indicating expand state

4. **Expanded Recurring List** (when "[+N recurring]" is clicked)
   - Compact display (different styling than main cards)
   - List of chore titles with their due dates
   - Each item is still interactive (completable)

## Data Structure Changes
- Add `isRecurring` boolean to ChoreInstance (computed from recurrenceType)
- Add `isFirstUncompletedOccurrenceOfRecurring` boolean to ChoreInstance
- Filter logic determines which instances show expanded vs. collapsed

## Implementation Notes
- Group chores by date during rendering
- For each (date, chore) pair, determine if it's the first uncompleted occurrence
- If not first uncompleted, move to hidden list for that date
- All hidden recurring chores per date collapse into single "[+N recurring]" button
- No DB schema changes needed; filtering/grouping in UI layer
- Consider extracting to utility: `isFirstUncompletedOccurrenceOfRecurring(chore, allInstancesForChore)`
