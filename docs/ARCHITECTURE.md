# Choriot Architecture

## Overview

Choriot is a full-stack Next.js application built with the App Router, using server-side rendering for initial page loads and client-side interactivity for dynamic features.

## Key Architectural Decisions

### 1. Database: SQLite with Prisma
- **Why**: SQLite provides a zero-config database perfect for MVP and local development
- **Migration Path**: Easy to migrate to PostgreSQL/MySQL for production by changing Prisma datasource
- **Benefits**: No separate database server needed, file-based storage, built-in migrations

### 2. Authentication: NextAuth.js with Credentials Provider
- **Why**: Industry-standard auth library with excellent Next.js integration
- **Session Strategy**: JWT (stateless) for better scalability
- **Security**: Bcrypt for password hashing, secure session tokens

### 3. Recurring Chore Logic
- **Approach**: Generate instances on-demand from chore definitions
- **Benefits**: 
  - No pre-generation of future chores needed
  - Flexible recurrence patterns
  - Easy to modify chore schedules retroactively
- **Trade-offs**: Computation happens at query time (acceptable for MVP scale)

### 4. Assignment System
- **Manual Assignments**: For MVP, users manually assign chores per instance
- **Future**: Can add automatic rotation logic using the same assignment table
- **Flexibility**: Supports both private and group chore workflows

### 5. Completion Tracking
- **Immutable Log**: ChoreCompletion records are append-only
- **Benefits**: 
  - Complete audit trail
  - Can track multiple completions per chore instance
  - Supports points/gamification
- **Data Integrity**: Tied to specific due dates to prevent confusion

## Data Flow

### Chore Schedule Generation
```
1. User requests dashboard
2. Server fetches all chores user has access to
3. generateChoreInstances() calculates instances for date range:
   - Applies recurrence rules
   - Matches with assignments
   - Checks for completions
4. Return unified schedule sorted by date
5. Client renders with grouping by day
```

### Chore Completion Flow
```
1. User clicks "Complete" button (client)
2. POST to /api/chores/[choreId]/complete
3. Server validates:
   - User has access to chore
   - Chore instance not already completed
4. Create ChoreCompletion record
5. Return success, client updates UI optimistically
6. Background: router.refresh() re-fetches server data
```

### Group Invitation Flow
```
1. Admin invites user by email
2. POST to /api/groups/[groupId]/invite
3. Server validates:
   - Requester is admin
   - Target user exists
   - Not already a member
4. Create GroupMembership with MEMBER role
5. User immediately sees group chores on their dashboard
```

## Security Considerations

### Authentication
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens signed with NEXTAUTH_SECRET
- Session validation on every protected route
- No sensitive data in JWT payload (just user ID)

### Authorization
- All API routes check user authentication
- Group operations verify membership
- Chore operations verify ownership or group membership
- Private chores only visible to creator

### API Design
- RESTful endpoints with clear semantics
- Proper HTTP status codes
- Error messages don't leak sensitive info
- Input validation with Zod schemas

## Performance Considerations

### Current Optimizations
- Prisma client singleton to reuse connections
- Server-side rendering reduces client JavaScript
- Optimistic UI updates for immediate feedback
- Limited date range (14 days) for chore generation

### Future Optimizations
- Add Redis/caching layer for frequently accessed data
- Implement pagination for completion history
- Use React Server Components more extensively
- Add database indexes for common queries
- Implement real-time updates with WebSockets

## Testing Strategy (TODO)

### Unit Tests
- Chore recurrence logic
- Date calculations
- Permission checks

### Integration Tests
- API endpoints with mocked database
- Authentication flows
- Group invitation flow

### E2E Tests
- User registration → login → create chore → complete
- Group creation → invite → shared chore
- Mobile responsiveness

## Scalability Path

### Current Scale: Single family (5-10 users)
- SQLite is sufficient
- Single Next.js server
- No caching needed

### Medium Scale: Multiple families (100s of users)
- Migrate to PostgreSQL
- Add connection pooling
- Implement caching (Redis)
- Consider serverless functions for API routes

### Large Scale: Community platform (1000s of users)
- Horizontal scaling of Next.js instances
- Database read replicas
- CDN for static assets
- Message queue for notifications
- Separate microservices for heavy computations

## Development Workflow

### Local Development
```bash
npm run dev          # Start dev server
npx prisma studio    # Browse database
npx prisma migrate   # Update schema
```

### Adding a New Feature
1. Update Prisma schema if needed
2. Run migration
3. Create/update API routes
4. Add UI components
5. Test manually
6. Update documentation

### Database Changes
- Always use Prisma migrations
- Never edit migration files after creation
- Test migrations on copy of production data
- Keep migrations small and focused

## Known Limitations (MVP)

1. **No notifications**: Users must check dashboard
2. **No mobile app**: Progressive Web App could be added
3. **Limited filtering**: No search or advanced filters
4. **No batch operations**: One chore at a time
5. **No file uploads**: For photo proof, etc.
6. **No calendar view**: Only list view
7. **No reminders**: Would require background jobs
8. **Single timezone**: All times assumed local

## Next Steps

### Phase 2 Features
- [ ] Email notifications for overdue chores
- [ ] Calendar view integration
- [ ] Chore templates library
- [ ] Automatic rotation of assignments
- [ ] Mobile app (React Native)
- [ ] User settings and preferences

### Technical Debt
- [ ] Add comprehensive test coverage
- [ ] Implement proper error boundaries
- [ ] Add loading states everywhere
- [ ] Improve mobile responsiveness
- [ ] Add API rate limiting
- [ ] Implement proper logging
- [ ] Add monitoring/analytics

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com/docs)
