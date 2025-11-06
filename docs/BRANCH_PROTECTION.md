# Branch Protection Setup

This document explains how to configure branch protection rules on GitHub to ensure PRs cannot merge unless all CI checks pass.

## Steps to Enable Branch Protection

1. **Navigate to Repository Settings**:
   - Go to your repository on GitHub: `https://github.com/mruhlin/choriot`
   - Click on **Settings** tab
   - Select **Branches** from the left sidebar

2. **Add Branch Protection Rule**:
   - Click **Add rule** button
   - In **Branch name pattern**, enter: `main` (or `master` if that's your default branch)

3. **Configure Protection Settings**:
   
   ✅ **Require a pull request before merging**
   - Check this box to enforce PR workflow
   - Optional: Require approvals if working with a team
   
   ✅ **Require status checks to pass before merging**
   - Check this box
   - Check **Require branches to be up to date before merging**
   - In the search box that appears, type "Test & Lint" and select it
   - This ensures the CI workflow must pass before merging
   
   ✅ **Do not allow bypassing the above settings** (optional but recommended)
   - Prevents administrators from bypassing rules
   
   ⚠️ **Require linear history** (optional)
   - Enforces rebase or squash merges for cleaner history

4. **Save Changes**:
   - Scroll to the bottom and click **Create** or **Save changes**

## What This Enforces

Once enabled, the following checks must pass before a PR can merge:

- ✅ ESLint passes (no linting errors)
- ✅ TypeScript compilation succeeds (no type errors)
- ✅ All Jest tests pass
- ✅ Application builds successfully
- ✅ Prisma Client generation succeeds

## Testing the Setup

1. Create a new branch:
   ```bash
   git checkout -b test-ci
   ```

2. Make a change and push:
   ```bash
   git add .
   git commit -m "Test CI workflow"
   git push -u origin test-ci
   ```

3. Open a PR on GitHub and verify:
   - The "Test & Lint" check appears
   - The check must complete successfully before merge is allowed
   - The "Merge" button is disabled until checks pass

## Workflow Triggers

The CI workflow runs on:
- Every push to `main`/`master` branches
- Every PR targeting `main`/`master` branches

## Additional Notes

- The workflow uses `npm ci` for faster, reproducible installs
- Tests run with `--ci` flag for optimized CI execution
- Coverage reports are uploaded as artifacts for review
- Build step validates that the app can be deployed successfully
