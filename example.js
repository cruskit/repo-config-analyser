const RepoConfigAnalyzer = require('./index');

async function example() {
    // Example usage of the RepoConfigAnalyzer class
    
    // You can also use the analyzer programmatically
    const token = process.env.GITHUB_TOKEN;
    const orgName = process.env.GITHUB_ORG;
    
    if (!token || !orgName) {
        console.log('Please set GITHUB_TOKEN and GITHUB_ORG environment variables');
        console.log('Example:');
        console.log('export GITHUB_TOKEN=your_token_here');
        console.log('export GITHUB_ORG=your_org_name');
        return;
    }
    
    const analyzer = new RepoConfigAnalyzer(token, orgName);
    
    try {
        // Fetch repositories
        await analyzer.fetchAllRepos();
        
        if (analyzer.repos.length === 0) {
            console.log('No repositories found');
            return;
        }
        
        // Calculate norms
        const norms = analyzer.calculateNorms();
        console.log('Configuration norms:', JSON.stringify(norms, null, 2));
        
        // Analyze a specific repository
        const firstRepo = analyzer.repos[0];
        const repoConfig = analyzer.extractConfigValues(firstRepo);
        const deviations = analyzer.findDeviations(repoConfig, norms);
        
        console.log(`\nAnalysis for ${firstRepo.full_name}:`);
        console.log('Config:', JSON.stringify(repoConfig, null, 2));
        
        if (deviations) {
            console.log('Deviations:', JSON.stringify(deviations, null, 2));
        } else {
            console.log('No deviations found');
        }
        
        // Generate reports
        await analyzer.generateReport();
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the example if this file is executed directly
if (require.main === module) {
    example();
}

module.exports = example; 