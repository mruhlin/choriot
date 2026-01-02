# Vercel Preview Database Configuration

## Overview
This document explains how to configure database migrations for Vercel preview environments. Preview deployments (created for pull requests) need their own database to avoid running migrations against the production database.

## The Problem
By default, Vercel uses the same `DATABASE_URL` for both production and preview environments. When a PR includes database schema migrations, deploying to preview would apply those migrations to the production database, which is dangerous.

## The Solution
Use a separate database for preview environments and configure Vercel to automatically run migrations during the build process.

## Configuration Steps

### 1. Create a Preview Database
You have several options:

#### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Create a new Postgres database for preview environments
4. Name it something like `choriot-preview`

#### Option B: Use Your Database Provider
Create a separate database instance on your existing provider (e.g., Neon, Supabase, etc.) specifically for preview environments.

**Important:** All preview deployments will share this preview database. If you have multiple PRs with conflicting schema migrations, you may encounter issues. Consider resetting the preview database between major schema changes.

### 2. Configure Environment Variables in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add/Update `DATABASE_URL`:
   - For **Production**: Set your production database URL
     - Select only "Production" environment
   - For **Preview**: Set your preview database URL
     - Click "Add Another" to create a separate entry
     - Use the same key: `DATABASE_URL`
     - Set the value to your preview database connection string
     - Select only "Preview" environment

4. Add other required environment variables (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`) if not already set:
   - Make sure they're available in both Production and Preview environments
   - For `NEXTAUTH_URL` in preview, you can use the Vercel system variable or set a placeholder

### 3. Build Configuration (Already Done)

The `vercel.json` file has been configured to:
- Generate Prisma Client
- Run pending migrations with `prisma migrate deploy`
- Build the Next.js application

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && npm run build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### 4. Verify the Setup

1. Create a test pull request or trigger a preview deployment
2. Check the Vercel build logs to confirm:
   - `prisma generate` runs successfully
   - `prisma migrate deploy` applies migrations
   - No migration errors occur
3. Visit the preview URL and test the functionality

## Alternative: Using Vercel System Environment Variables

You can also use Vercel's automatic environment variables for preview deployments:

```env
# In Vercel Preview environment variables:
DATABASE_URL="postgresql://user:password@host:5432/choriot_preview"
NEXTAUTH_URL="https://${VERCEL_URL}"
```

The `VERCEL_URL` variable is automatically set to the preview deployment URL.

## Migration Best Practices

1. **Preview Database Resets**: Periodically reset your preview database to keep it clean:
   ```bash
   # Connect to preview database and run:
   npm run migrate:reset
   ```

2. **Avoid Conflicting PRs**: Be cautious when multiple PRs modify the schema. Consider:
   - Merging schema changes sequentially
   - Coordinating with team members
   - Resetting the preview database between major changes

3. **Test Migrations Locally**: Always test migrations locally before pushing:
   ```bash
   npm run migrate:dev
   npm test
   ```

4. **Monitor Build Logs**: Check Vercel build logs for any migration errors or warnings.

## Troubleshooting

### Migration Fails with "Table already exists"
- The preview database may be out of sync
- Solution: Reset the preview database or manually apply missing migrations

### "Prisma Client is outdated" Error
- Clear Vercel's cache and redeploy
- Go to Deployments → Click "..." → "Redeploy" → Enable "Use existing Build Cache" toggle OFF

### Environment Variable Not Available
- Ensure the variable is set for the "Preview" environment scope in Vercel
- Check that the variable name matches exactly (case-sensitive)

### Build Command Not Running
- Verify `vercel.json` is at the root of your repository
- Check that `prisma` is listed in `dependencies` (not just `devDependencies`)

## Additional Resources

- [Prisma Migrate Deployment Guide](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Prisma on Vercel Guide](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel)
