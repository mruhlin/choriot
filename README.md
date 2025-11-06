# Choriot - Family Chore Tracking App

**Carry your chores to completion** 🏛️

A Next.js application for tracking family chores with recurring tasks, group management, and completion history.

## Features (MVP)

### Authentication & Users
- User registration and login with email/password
- Secure authentication using NextAuth.js
- Individual user accounts

### Groups
- Create and join multiple groups
- Share chores with group members
- Admin/Member role system
- Invite users by email

### Chores
- Create private chores (individual) or group chores
- One-time or recurring chores (Daily, Weekly, Biweekly, Monthly)
- Assign chores to specific users
- Set due dates and times
- Add descriptions and point values
- Mark chores as complete

### Dashboard
- Unified schedule showing chores from all groups
- 14-day view of upcoming chores
- "Today" and "Tomorrow" quick views
- Overdue chore indicators
- Points tracking system
- Completion history with timestamps

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js v4
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Date Handling**: date-fns

## Database Schema

### Core Models
- `User` - User accounts with authentication
- `Group` - Shared chore groups
- `GroupMembership` - User-group relationships with roles
- `Chore` - Chore definitions with recurrence rules
- `ChoreAssignment` - Manual chore assignments to users
- `ChoreCompletion` - Completion log with timestamps

### Recurrence Types
- `NONE` - One-time chore
- `DAILY` - Repeats every day
- `WEEKLY` - Repeats every week
- `BIWEEKLY` - Repeats every 2 weeks
- `MONTHLY` - Repeats every month

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   The `.env` file has been created with defaults. For production, update:
   ```
   NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
   ```

3. **Initialize the database**:
   ```bash
   npx prisma migrate dev
   ```

4. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser** to `http://localhost:3000`

## Project Structure

```
choriot/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   ├── chores/        # Chore CRUD operations
│   │   ├── groups/        # Group management
│   │   └── completions/   # Completion history
│   ├── dashboard/         # Main dashboard
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── layout.tsx         # Root layout
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── auth-helpers.ts    # Auth utility functions
│   ├── prisma.ts          # Prisma client singleton
│   └── chore-schedule.ts  # Recurrence logic
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
└── types/
    └── next-auth.d.ts     # NextAuth type extensions
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Groups
- `GET /api/groups` - List user's groups
- `POST /api/groups` - Create new group
- `POST /api/groups/[groupId]/invite` - Invite user to group

### Chores
- `GET /api/chores` - List chores (with optional groupId filter)
- `POST /api/chores` - Create new chore
- `POST /api/chores/[choreId]/assign` - Assign chore to user
- `POST /api/chores/[choreId]/complete` - Mark chore complete

### Completions
- `GET /api/completions` - Get completion history (filterable)

## Usage

### Creating Your First Chore

1. Register an account
2. Click "New Chore" in the dashboard
3. Enter chore details:
   - Title (required)
   - Description (optional)
   - Recurrence pattern
   - Due time
   - Points value
4. Choose private or assign to a group

### Managing Groups

1. Click "Create Group" in the sidebar
2. Name your group
3. Invite members by email
4. Create group chores that all members can see

### Completing Chores

- Click the "Complete" button next to any chore
- Completion is logged with your name and timestamp
- Points are added to your total

## Future Enhancements (Post-MVP)

- Automatic rotation of chores among group members
- Notifications for upcoming/overdue chores
- Filtering and sorting options
- User profile pages with stats
- Mobile app
- Calendar view
- Chore templates
- Rewards/achievements system
- Photo proof of completion

## Development

### Database Commands

```bash
# Create a migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma Client
npx prisma generate
```

### Linting

```bash
npm run lint
```

## Contributing

This is an MVP built for personal/family use. Feel free to fork and customize for your needs!

## License

MIT

---

Built with ❤️ using Next.js
