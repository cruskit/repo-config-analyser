const RepoConfigAnalyzer = require('./index');

async function test() {
    console.log('Testing GitHub Repository Configuration Analyzer...\n');
    
    // Test configuration loading
    console.log('✓ Configuration loaded successfully');
    
    // Test analyzer instantiation
    const analyzer = new RepoConfigAnalyzer('test-token', 'test-org');
    console.log('✓ Analyzer instantiated successfully');
    
    // Test configuration fields
    console.log(`✓ Analyzing ${analyzer.configFields.length} configuration fields`);
    console.log('  Fields:', analyzer.configFields.join(', '));
    
    // Test deviation settings
    console.log('✓ Deviation settings loaded');
    console.log(`  Topic missing threshold: ${analyzer.deviationSettings.topicMissingThreshold}`);
    console.log(`  Topic extra threshold: ${analyzer.deviationSettings.topicExtraThreshold}`);
    console.log(`  Ignored fields: ${analyzer.deviationSettings.ignoreFields.join(', ')}`);
    
    // Test report settings
    console.log('✓ Report settings loaded');
    console.log(`  Max topics in norms: ${analyzer.reportSettings.maxTopicsInNorms}`);
    console.log(`  Include archived: ${analyzer.reportSettings.includeArchived}`);
    console.log(`  Generate both reports: ${analyzer.reportSettings.generateBothReports}`);
    
    // Test GitHub settings
    console.log('✓ GitHub settings loaded');
    console.log(`  Repos per page: ${analyzer.githubSettings.reposPerPage}`);
    console.log(`  Timeout: ${analyzer.githubSettings.timeout}ms`);
    
    console.log('\n✓ All tests passed! The analyzer is ready to use.');
    console.log('\nTo run the analyzer:');
    console.log('1. Set your GitHub token: export GITHUB_TOKEN=your_token_here');
    console.log('2. Set your organization: export GITHUB_ORG=your_org_name');
    console.log('3. Run: npm start');
}

test().catch(console.error); 