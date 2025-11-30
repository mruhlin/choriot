# Fix for Issue #12: Auto-fix PRs should close the original issue

## Problem Identified
The auto-fix workflow was using `(fix #...)` in PR titles, but GitHub's auto-close functionality requires specific keywords like `fixes`, `closes`, or `resolves` (with an 's') to automatically link and close issues when PRs are merged.

## Solution
Change line 54 in `.github/workflows/auto-fix-issue.yml` from:
```yaml
8. Open a pull request to merge your branch into main with title: "${{ github.event.issue.title }} (fix #${{ github.event.issue.number }})"
```

To:
```yaml
8. Open a pull request to merge your branch into main with title: "${{ github.event.issue.title }} (fixes #${{ github.event.issue.number }})"
```

## Why Manual Intervention is Needed
GitHub Actions has a security restriction that prevents GitHub Apps from pushing changes to workflow files (`.github/workflows/*`) without explicit `workflows` permission. This is a security feature to prevent malicious automated modifications to CI/CD pipelines.

The Warp Agent Action currently doesn't have the `workflows` permission, which means:
- I can create the branch locally (`fix/issue-12`)
- I can commit the changes
- But I cannot push workflow file changes to the remote repository

## How to Apply the Fix Manually

### Option 1: Apply the patch
```bash
git checkout main
git pull origin main
cat > /tmp/issue-12.patch << 'EOF'
diff --git a/.github/workflows/auto-fix-issue.yml b/.github/workflows/auto-fix-issue.yml
index 03ce1d4..8b92f30 100644
--- a/.github/workflows/auto-fix-issue.yml
+++ b/.github/workflows/auto-fix-issue.yml
@@ -51,7 +51,7 @@ jobs:
             5. Ensure 100% test coverage for any new functionality you add
             6. Run all tests locally to verify your changes
             7. Commit your changes with a descriptive message
-            8. Open a pull request to merge your branch into main with title: "${{ github.event.issue.title }} (fix #${{ github.event.issue.number }})"
+            8. Open a pull request to merge your branch into main with title: "${{ github.event.issue.title }} (fixes #${{ github.event.issue.number }})"
             9. If you cannot fix the issue automatically, comment on the issue explaining why and what manual intervention is needed
 
             Project context:
EOF
git apply /tmp/issue-12.patch
git add .github/workflows/auto-fix-issue.yml
git commit -m "Update auto-fix workflow to use 'fixes' keyword in PR titles (fixes #12)"
git push origin main
```

### Option 2: Manual edit
1. Open `.github/workflows/auto-fix-issue.yml`
2. Find line 54
3. Change `(fix #` to `(fixes #`
4. Commit and push:
```bash
git add .github/workflows/auto-fix-issue.yml
git commit -m "Update auto-fix workflow to use 'fixes' keyword in PR titles (fixes #12)"
git push origin main
```

## Verification
After applying this fix, future PRs created by the auto-fix workflow will:
- Have titles like "Issue Title (fixes #123)" instead of "Issue Title (fix #123)"
- Automatically close the referenced issue when the PR is merged
- Show proper issue linkage in GitHub's UI

## Alternative: Grant Workflow Permission to GitHub App
If you want to allow the Warp Agent to modify workflow files in the future, you would need to:
1. Update the repository settings to allow GitHub Apps to have `workflows` permission
2. Grant the Warp Agent Action the `workflows` scope

However, this should be done carefully as it allows automated modifications to CI/CD pipelines, which can be a security concern.
