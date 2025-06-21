# GitHub Repository Configuration Analyzer

A Node.js script that analyzes the configuration of all non-archived repositories in a GitHub organization and generates comprehensive HTML reports showing configuration values and deviations from the norm.

## Features

- **Comprehensive Analysis**: Analyzes 23 different configuration fields including:
  - Basic repository settings (name, description, homepage, private/public)
  - Feature flags (issues, projects, wiki, downloads, discussions)
  - Merge strategy settings (squash, merge commit, rebase, auto-merge)
  - Branch protection settings (delete branch on merge, default branch)
  - **Branch Protection Rules** (required status checks, PR reviews, restrictions, etc.)
  - Repository topics and licensing
  - Security and analysis settings
  - Forking permissions

- **Smart Deviation Detection**: 
  - Calculates "normal" configuration values based on the most common settings across all repositories
  - Identifies repositories that deviate from these norms
  - Provides detailed comparison between repository values and normal values

- **Beautiful HTML Reports**:
  - **Full Analysis Report**: Shows all repository configurations with deviations highlighted
  - **Deviations-Only Report**: Focuses only on repositories with configuration deviations
  - Modern, responsive design with clear visual indicators
  - Clickable repository links for easy navigation

## Prerequisites

- Node.js (version 14 or higher)
- A GitHub Personal Access Token with appropriate permissions
- Access to the GitHub organization you want to analyze

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Setup

1. **Create a GitHub Personal Access Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate a new token with the following scopes:
     - `repo` (for private repositories and branch protection access)
     - `read:org` (for organization access)
   - Copy the token

2. **Set Environment Variables**:
   ```bash
   export GITHUB_TOKEN=your_github_token_here
   export GITHUB_ORG=your_organization_name
   ```

## Usage

Run the script:
```bash
npm start
```

Or directly with Node:
```bash
node index.js
```

## Output

The script generates two HTML files:

1. **`repo-config-analysis-{org}-{date}.html`** - Complete analysis report
   - Summary statistics
   - Configuration norms for the organization
   - All repository configurations with deviations highlighted

2. **`repo-deviations-{org}-{date}.html`** - Deviations-only report
   - Focused view of only repositories with configuration deviations
   - Side-by-side comparison of repository values vs. normal values

## Configuration Fields Analyzed

| Field | Description |
|-------|-------------|
| `name` | Repository name |
| `description` | Repository description |
| `homepage` | Repository homepage URL |
| `private` | Whether repository is private |
| `has_issues` | Issues feature enabled |
| `has_projects` | Projects feature enabled |
| `has_wiki` | Wiki feature enabled |
| `has_downloads` | Downloads feature enabled |
| `has_discussions` | Discussions feature enabled |
| `allow_squash_merge` | Squash merge strategy allowed |
| `allow_merge_commit` | Merge commit strategy allowed |
| `allow_rebase_merge` | Rebase merge strategy allowed |
| `allow_auto_merge` | Auto-merge enabled |
| `delete_branch_on_merge` | Delete branch after merge |
| `default_branch` | Default branch name |
| `topics` | Repository topics/tags |
| `archived` | Repository archived status |
| `disabled` | Repository disabled status |
| `license` | Repository license |
| `allow_forking` | Forking allowed |
| `web_commit_signoff_required` | Commit signoff required |
| `security_and_analysis` | Security analysis settings |
| **`branch_protection`** | **Branch protection rules and settings** |

### Branch Protection Analysis

The analyzer now includes comprehensive branch protection analysis, checking:

- **Protection Status**: Whether branch protection is enabled or disabled
- **Required Status Checks**: Which status checks are required before merging
- **Pull Request Reviews**: Required number of reviewers and approval settings
- **Restrictions**: User and team restrictions for pushing to protected branches
- **Admin Enforcement**: Whether protection rules apply to administrators
- **Force Push Settings**: Whether force pushes are allowed
- **Deletion Settings**: Whether branch deletion is allowed
- **Conversation Resolution**: Whether conversation resolution is required
- **Branch Locking**: Whether the branch is locked
- **Fork Syncing**: Whether fork syncing is allowed

## Understanding the Reports

### Configuration Norms
The script calculates "normal" values by finding the most common configuration across all repositories in the organization. For example:
- If 80% of repositories have `has_issues: true`, then `true` becomes the norm
- For topics, it shows the most commonly used topics with usage counts
- For security settings, it shows the most common security configuration
- For branch protection, it shows the most common protection configuration

### Deviations
A repository is considered to have deviations when its configuration differs from the calculated norm:
- **Simple fields**: Direct value comparison
- **Topics**: Missing common topics or having uncommon topics
- **Security settings**: Different security analysis configuration
- **Branch protection**: Different protection rules or settings

### Visual Indicators
- **Green border**: Normal configuration
- **Red border**: Configuration deviation
- **Yellow background**: Deviation details
- **Red header**: Repository with deviations (in deviations-only report)
- **Branch Protection Status**: Color-coded badges showing enabled/disabled/error states

## Example Use Cases

1. **Compliance Auditing**: Ensure all repositories follow organizational standards
2. **Security Review**: Identify repositories with different security settings
3. **Branch Protection Audit**: Find repositories missing proper branch protection
4. **Feature Standardization**: Find repositories missing standard features like issues or wiki
5. **Documentation**: Generate documentation of current repository configurations
6. **Migration Planning**: Identify repositories that need configuration updates

## Troubleshooting

### Common Issues

1. **"Error: GITHUB_TOKEN environment variable is required"**
   - Make sure you've set the `GITHUB_TOKEN` environment variable
   - Verify the token is valid and has the required permissions

2. **"Error: GITHUB_ORG environment variable is required"**
   - Make sure you've set the `GITHUB_ORG` environment variable
   - Use the organization name (not the full URL)

3. **"Error fetching repositories"**
   - Check that your token has access to the organization
   - Verify the organization name is correct
   - Ensure the token has the `read:org` scope

4. **"No permission to view branch protection"**
   - Ensure your token has the `repo` scope for private repositories
   - Check that you have admin access to the repositories for branch protection data

5. **No repositories found**
   - The organization might not have any non-archived repositories
   - Check that your token has access to the repositories

### Rate Limiting
GitHub API has rate limits. The script handles pagination automatically and includes delays between requests to be respectful to the API. If you have many repositories, it might take some time to fetch all data, especially branch protection settings.

## Customization

You can modify the script to:
- Add more configuration fields by updating the `configFields` array
- Change the deviation detection logic
- Customize the HTML styling
- Add more analysis metrics
- Adjust API request delays

## License

MIT License - see LICENSE file for details.

## Contributing

Feel free to submit issues and enhancement requests! 