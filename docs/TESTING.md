# Testing Guide

## Overview

Choriot uses Jest as the test framework along with React Testing Library for component testing. The test suite includes unit tests for business logic and integration tests for API routes.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Unit Tests

#### `lib/__tests__/chore-schedule.test.ts`
Tests the core scheduling logic for recurring chores:
- One-time chore generation
- Daily, weekly, biweekly, and monthly recurrence
- Completion tracking
- Assignment handling
- First uncompleted occurrence marking

#### `lib/__tests__/auth-helpers.test.ts`
Tests authentication helper functions:
- User session retrieval
- Authentication requirement enforcement
- Unauthorized response generation

### API Route Tests

#### `app/api/chores/__tests__/route.test.ts`
Tests the chores API endpoints:
- GET `/api/chores` - Fetching user chores with filtering
- POST `/api/chores` - Creating private and group chores
- Authorization checks
- Group membership validation

#### `app/api/groups/__tests__/route.test.ts`
Tests the groups API endpoints:
- GET `/api/groups` - Fetching user groups
- POST `/api/groups` - Creating new groups
- Authorization checks
- Input validation

## Test Utilities

### `__tests__/test-utils.ts`
Provides common test utilities:
- `mockPrismaClient` - Mock Prisma client with jest functions
- `createMockSession` - Helper to create mock NextAuth sessions
- Mock data objects (mockUser, mockGroup, mockChore)
- `resetMocks` - Helper to reset all mocks between tests

## Configuration

### `jest.config.js`
- Configured for Next.js with TypeScript
- Uses `jsdom` test environment for browser APIs
- Includes path aliases (`@/*` maps to project root)
- Excludes generated files from coverage

### `jest.setup.js`
Sets up global test environment:
- Imports `@testing-library/jest-dom` for DOM matchers
- Polyfills `TextEncoder`/`TextDecoder` for edge runtime compatibility
- Polyfills `Response.json` for Next.js compatibility

## Writing Tests

### Example Unit Test

```typescript
import { generateChoreInstances } from '../chore-schedule'

describe('chore-schedule', () => {
  it('should generate daily recurring chore instances', () => {
    const chores = [{
      id: 'chore-1',
      title: 'Daily chore',
      recurrenceType: 'DAILY',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      // ... other fields
    }]
    
    const instances = generateChoreInstances(
      chores,
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-01-07T00:00:00.000Z')
    )
    
    expect(instances).toHaveLength(7)
  })
})
```

### Example API Route Test

```typescript
import { GET } from '../route'
import { getCurrentUser } from '@/lib/auth-helpers'

jest.mock('@/lib/auth-helpers')

describe('/api/endpoint', () => {
  it('should return 401 when not authenticated', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(null)
    
    const req = new Request('http://localhost:3000/api/endpoint')
    const response = await GET(req)
    
    expect(response.status).toBe(401)
  })
})
```

## Best Practices

1. **Use UTC dates in tests** - All tests run with `TZ=UTC` to avoid timezone issues
2. **Mock external dependencies** - Prisma, NextAuth, and Next.js server functions are mocked
3. **Reset mocks** - Use `beforeEach` to clear mocks between tests
4. **Test edge cases** - Include tests for error conditions and boundary cases
5. **Use descriptive test names** - Test names should clearly describe what is being tested

## Coverage

Run `npm run test:coverage` to generate a coverage report. The report is saved in the `coverage/` directory.

Target coverage:
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

## Continuous Integration

Tests should be run automatically on:
- Pull request creation
- Push to main branch
- Before deployment

Add this to your CI/CD pipeline:
```yaml
- name: Run tests
  run: npm test -- --coverage --ci
```

## Troubleshooting

### Common Issues

**Tests failing with timezone issues**
- Ensure dates use ISO format with explicit timezone: `new Date('2024-01-01T00:00:00.000Z')`
- The `TZ=UTC` environment variable should be set in test scripts

**Request/Response not defined**
- The `whatwg-fetch` polyfill is imported in `jest.setup.js`
- `TextEncoder`/`TextDecoder` are polyfilled for edge runtime

**Prisma client errors**
- Ensure Prisma is properly mocked in test files
- Use the mock Prisma client from `__tests__/test-utils.ts`

## Future Improvements

- [ ] Add component tests for React components
- [ ] Add E2E tests with Playwright or Cypress
- [ ] Add visual regression tests
- [ ] Set up test database for integration tests
- [ ] Add performance benchmarks
