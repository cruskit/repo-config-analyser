# Quick Start Guide

Get up and running with the GitHub Repository Configuration Analyzer in 5 minutes!

## Prerequisites

- Node.js (version 14 or higher)
- A GitHub account with access to an organization
- A GitHub Personal Access Token

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create a GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "Repo Config Analyzer"
4. Select these scopes:
   - `repo` (for private repositories and branch protection access)
   - `read:org` (for organization access)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

## Step 3: Set Environment Variables

```bash
export GITHUB_TOKEN=your_token_here
export GITHUB_ORG=your_organization_name
```

**Replace:**
- `your_token_here` with the token you just created
- `your_organization_name` with your GitHub organization name (not the full URL)

## Step 4: Run the Analyzer

```bash
npm start
```

## Step 5: View Results

The script will generate two HTML files:
- `repo-config-analysis-{org}-{date}.html` - Complete analysis
- `repo-deviations-{org}-{date}.html` - Deviations only

Open these files in your web browser to view the reports!

## What You'll See

### Summary Section
- Total number of repositories analyzed
- Number of repositories with deviations
- Number of configuration fields analyzed

### Configuration Norms
- The most common configuration values across all repositories
- For topics: most commonly used topics with usage counts
- For security settings: most common security configuration
- **For branch protection: most common protection rules and settings**

### Repository Configurations
- Each repository with all its configuration values
- Deviations highlighted in red
- Clickable links to GitHub repositories
- **Branch protection status with color-coded badges**

### Deviations Report
- Only repositories that differ from the norm
- Side-by-side comparison of repository vs. normal values
- Detailed explanation of what's different
- **Branch protection deviations clearly marked**

## Branch Protection Analysis

The analyzer now includes comprehensive branch protection analysis:

- **Protection Status**: Shows whether branch protection is enabled/disabled
- **Required Checks**: Status checks required before merging
- **PR Reviews**: Required reviewers and approval settings
- **Restrictions**: User/team restrictions for protected branches
- **Admin Settings**: Whether rules apply to administrators
- **Force Push/Deletion**: Whether these actions are allowed
- **Conversation Resolution**: Whether resolution is required
- **Branch Locking**: Whether branches are locked
- **Fork Syncing**: Whether fork syncing is allowed

## Example Output

```
Fetching repositories from organization: my-org
Fetched 25 repositories from page 1
Total repositories found: 25
Fetching branch protection settings for all repositories...
Fetching branch protection for my-org/repo1 (1/25)
Fetching branch protection for my-org/repo2 (2/25)
...
Branch protection fetching complete
Report generated: repo-config-analysis-my-org-2024-01-15.html
Deviations report generated: repo-deviations-my-org-2024-01-15.html
Analysis complete! Check the generated HTML files for detailed reports.
```

## Troubleshooting

### "Error: GITHUB_TOKEN environment variable is required"
- Make sure you set the environment variable correctly
- Try: `echo $GITHUB_TOKEN` to verify it's set

### "Error: GITHUB_ORG environment variable is required"
- Make sure you set the organization name (not the full URL)
- Example: `my-org` not `https://github.com/my-org`

### "Access denied" or "Organization not found"
- Check that your token has the correct permissions
- Verify the organization name is correct
- Make sure you have access to the organization

### "No permission to view branch protection"
- Ensure your token has the `repo` scope
- Check that you have admin access to repositories for branch protection data

### No repositories found
- The organization might not have any non-archived repositories
- Check that your token has access to the repositories

### Slow performance
- Branch protection analysis requires additional API calls
- The script includes delays to respect GitHub's rate limits
- Large organizations may take several minutes to complete

## Next Steps

- Customize the analysis by editing `config.js`
- Run `npm run example` to see programmatic usage
- Check the full README.md for advanced features

## Need Help?

- Check the full [README.md](README.md) for detailed documentation
- Look at the [config.js](config.js) file to customize settings
- Run `npm test` to verify your setup

Happy analyzing! 🚀 