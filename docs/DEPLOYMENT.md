# Deploying Choriot to Vercel

This guide walks you through deploying the Choriot app to Vercel with a PostgreSQL database.

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier works great)
- A [GitHub account](https://github.com) with this repository
- Basic familiarity with the command line

## Architecture Overview

- **Frontend & API**: Deployed on Vercel (Next.js serverless functions)
- **Database**: PostgreSQL (recommended: Vercel Postgres)
- **Authentication**: NextAuth.js with JWT sessions

## Deployment Steps

### 1. Set Up Vercel Project

1. **Install Vercel CLI** (optional, but recommended):
   ```bash
   npm install -g vercel
   ```

2. **Connect your repository to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your Choriot repository from GitHub
   - Click "Import"

3. **Configure Project Settings**:
   - Framework Preset: **Next.js** (should be auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `prisma generate && next build` (configured in vercel.json)
   - Output Directory: `.next` (default)

### 2. Set Up PostgreSQL Database

We recommend using **Vercel Postgres** for seamless integration:

#### Option A: Vercel Postgres (Recommended)

1. **Create a database**:
   - In your Vercel project dashboard, go to the "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Choose a name (e.g., "choriot-db")
   - Select a region close to your users
   - Click "Create"

2. **Connect to your project**:
   - Vercel will automatically add these environment variables:
     - `POSTGRES_URL` (pooled connection)
     - `POSTGRES_URL_NON_POOLING` (direct connection)
   - You'll need to manually add `DATABASE_URL` pointing to one of these

#### Option B: Alternative PostgreSQL Providers

Other great options include:
- [Neon](https://neon.tech) - Serverless Postgres with generous free tier
- [Supabase](https://supabase.com) - Includes auth and storage
- [Railway](https://railway.app) - Simple deployment platform

For any provider, you'll need a PostgreSQL connection string in this format:
```
postgresql://username:password@host:5432/database?schema=public
```

### 3. Configure Environment Variables

In your Vercel project settings, go to **Settings → Environment Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Your PostgreSQL connection string | Use pooled connection for production |
| `NEXTAUTH_SECRET` | Random 32+ character string | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your deployment URL | e.g., `https://choriot.vercel.app` |

**Important**: 
- Set these for **Production**, **Preview**, and **Development** environments
- For `NEXTAUTH_URL` in preview environments, use: `https://$VERCEL_URL`
- Never commit these secrets to version control

### 4. Run Database Migrations

After your first deployment, you need to run database migrations:

#### Method 1: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy

# Or use the migration script
npm run migrate:deploy
```

#### Method 2: Using Prisma Studio

1. Set your production `DATABASE_URL` locally (temporarily):
   ```bash
   export DATABASE_URL="your-production-database-url"
   ```

2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

3. **Important**: Unset the environment variable after:
   ```bash
   unset DATABASE_URL
   ```

### 5. Verify Deployment

1. **Check build logs**:
   - Go to your Vercel project dashboard
   - Click on the latest deployment
   - Review the build logs for any errors

2. **Test the application**:
   - Visit your deployment URL
   - Try registering a new account
   - Create a chore
   - Verify database operations work

3. **Common issues to check**:
   - Database connection (check environment variables)
   - Authentication (verify NEXTAUTH_SECRET and NEXTAUTH_URL)
   - Prisma client generation (should happen automatically)

## Managing Database Migrations

### For New Migrations

When you add new features that require database changes:

1. **Develop locally**:
   ```bash
   # Create a new migration
   npx prisma migrate dev --name descriptive_name
   ```

2. **Test thoroughly**:
   ```bash
   npm run test
   npm run typecheck
   npm run lint
   ```

3. **Deploy to production**:
   ```bash
   # Commit and push your changes
   git add .
   git commit -m "Add new feature with migration"
   git push

   # After deployment, run migrations
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

### Migration Script

The repository includes a migration script in `scripts/migrate.sh`:

```bash
# Deploy migrations to production
npm run migrate:deploy

# Reset database (⚠️ DANGER: Deletes all data)
npm run migrate:reset
```

## Local Development with Production Database

⚠️ **Not recommended**, but if you need to test against production data:

1. **Set up a separate staging database** (highly recommended)
2. **Or use production with extreme caution**:
   ```bash
   # Create .env.local
   cp .env.example .env.local
   
   # Set DATABASE_URL to your production database
   # Edit .env.local carefully
   
   # Run in development mode
   npm run dev
   ```

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every pull request (with its own preview URL)

### Branch Protection

To ensure quality:
1. Enable branch protection on `main` in GitHub
2. Require status checks to pass (CI tests)
3. Require pull request reviews

See [docs/BRANCH_PROTECTION.md](docs/BRANCH_PROTECTION.md) for details.

## Troubleshooting

### Build Failures

**Error**: `Prisma Client not generated`
```bash
# Solution: Ensure postinstall script runs
npm install
npx prisma generate
```

**Error**: `Cannot find module '@prisma/client'`
```bash
# Solution: Check vercel.json buildCommand includes prisma generate
# Should be: "prisma generate && next build"
```

### Database Connection Issues

**Error**: `Can't reach database server`
```bash
# Check:
# 1. DATABASE_URL is set correctly in Vercel
# 2. Database is running and accessible
# 3. Connection string includes ?schema=public
```

**Error**: `SSL connection required`
```bash
# For production PostgreSQL, add to connection string:
# ?ssl=true&sslmode=require
```

### Authentication Issues

**Error**: `[next-auth][error][JWT_SESSION_ERROR]`
```bash
# Check:
# 1. NEXTAUTH_SECRET is set and is 32+ characters
# 2. NEXTAUTH_URL matches your deployment URL
# 3. No trailing slash in NEXTAUTH_URL
```

**Error**: Infinite redirect loop
```bash
# Common causes:
# 1. NEXTAUTH_URL not set correctly
# 2. Cookies not being set (check browser console)
# 3. Session callback returning null
```

### Migration Issues

**Error**: `Migration failed to apply`
```bash
# Check migration history
npx prisma migrate status

# If migrations are out of sync, you may need to:
# 1. Reset the database (⚠️ loses data):
npx prisma migrate reset

# 2. Or manually resolve conflicts:
npx prisma migrate resolve --applied <migration_name>
```

## Performance Optimization

### Connection Pooling

For serverless environments, use Prisma's connection pooling:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Vercel Postgres automatically provides pooled connections in `POSTGRES_URL`.

### Edge Functions (Optional)

For even faster performance, consider using Edge Functions for read-only operations:

```typescript
// app/api/chores/route.ts
export const runtime = 'edge';
```

Note: Not all Prisma features work on Edge Runtime.

## Monitoring and Maintenance

### Vercel Analytics

Enable Vercel Analytics for insights:
1. Go to your project dashboard
2. Navigate to "Analytics" tab
3. Enable Web Analytics

### Database Monitoring

Monitor your database:
- **Vercel Postgres**: Built-in metrics in dashboard
- **External providers**: Use their monitoring tools

### Logs

View application logs:
```bash
# Using Vercel CLI
vercel logs

# Or in Vercel dashboard → Logs tab
```

## Costs

### Free Tier Limits

- **Vercel**: 
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Automatic HTTPS
  
- **Vercel Postgres**:
  - 256 MB storage (Hobby)
  - 60 hours compute time/month
  - Good for MVP and testing

### Scaling

When you outgrow free tier:
- **Vercel Pro**: $20/month (1 TB bandwidth, more compute)
- **Vercel Postgres Pro**: $24/month (20 GB storage, unlimited compute)

## Security Best Practices

1. **Never commit secrets**: Use environment variables for all sensitive data
2. **Use strong secrets**: Generate NEXTAUTH_SECRET with `openssl rand -base64 32`
3. **Enable SSL**: Always use SSL for database connections in production
4. **Regular updates**: Keep dependencies updated (`npm audit` regularly)
5. **Rate limiting**: Consider adding rate limiting for API routes (future enhancement)

## Custom Domain (Optional)

To use a custom domain:

1. Go to your Vercel project → Settings → Domains
2. Add your domain (e.g., `choriot.com`)
3. Configure DNS records as instructed by Vercel
4. Update `NEXTAUTH_URL` to your custom domain
5. Redeploy to apply changes

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Project Repository Issues](https://github.com/your-username/choriot/issues)

---

**Ready to deploy?** Follow the steps above and you'll have Choriot running in production in under 30 minutes! 🚀
