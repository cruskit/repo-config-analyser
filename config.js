// Configuration file for the GitHub Repository Configuration Analyzer

module.exports = {
    // Fields to analyze in repositories
    // You can add or remove fields based on your needs
    configFields: [
        'name',
        'description', 
        'homepage',
        'private',
        'has_issues',
        'has_projects',
        'has_wiki',
        'has_downloads',
        'has_discussions',
        'allow_squash_merge',
        'allow_merge_commit',
        'allow_rebase_merge',
        'allow_auto_merge',
        'delete_branch_on_merge',
        'default_branch',
        'topics',
        'archived',
        'disabled',
        'license',
        'allow_forking',
        'web_commit_signoff_required',
        'security_and_analysis',
        'branch_protection'
    ],

    // Additional fields you might want to analyze (uncomment to include)
    // Note: Some of these might require additional API calls or permissions
    /*
    additionalFields: [
        'visibility',           // public, private, internal
        'fork',                 // whether repository is a fork
        'forks_count',          // number of forks
        'stargazers_count',     // number of stars
        'watchers_count',       // number of watchers
        'language',             // primary programming language
        'size',                 // repository size in KB
        'open_issues_count',    // number of open issues
        'network_count',        // number of repositories in network
        'subscribers_count',    // number of subscribers
        'created_at',           // creation date
        'updated_at',           // last update date
        'pushed_at',            // last push date
    ],
    */

    // Deviation detection settings
    deviationSettings: {
        // For topics, how many missing topics before it's considered a deviation
        topicMissingThreshold: 1,
        
        // For topics, how many extra topics before it's considered a deviation  
        topicExtraThreshold: 2,
        
        // Fields to ignore when calculating deviations (always considered normal)
        ignoreFields: [
            'name',  // Repository names are always different
            'description', // Descriptions are usually unique
            'homepage' // Homepages are usually unique
        ],
        
        // Fields that should be treated as arrays (for deviation detection)
        arrayFields: ['topics'],
        
        // Fields that should be treated as objects (for deviation detection)
        objectFields: ['security_and_analysis', 'license', 'branch_protection']
    },

    // Report generation settings
    reportSettings: {
        // Maximum number of topics to show in norms (top N most common)
        maxTopicsInNorms: 10,
        
        // Whether to include archived repositories in analysis
        includeArchived: false,
        
        // Whether to generate both full and deviations-only reports
        generateBothReports: true,
        
        // Custom CSS for reports (optional)
        customCSS: `
            /* Add your custom CSS here */
            .custom-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
        `
    },

    // GitHub API settings
    githubSettings: {
        // Number of repositories to fetch per page (max 100)
        reposPerPage: 100,
        
        // Whether to include private repositories
        includePrivate: true,
        
        // Whether to include public repositories  
        includePublic: true,
        
        // Whether to include internal repositories (if available)
        includeInternal: true,
        
        // Timeout for API requests (in milliseconds)
        timeout: 30000
    }
}; 