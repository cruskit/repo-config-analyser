const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

class RepoConfigAnalyzer {
    constructor(token, orgName, customConfig = {}) {
        this.octokit = new Octokit({
            auth: token,
            timeZone: 'UTC'
        });
        this.orgName = orgName;
        this.repos = [];
        
        // Merge custom config with default config
        this.config = { ...config, ...customConfig };
        this.configFields = this.config.configFields;
        this.deviationSettings = this.config.deviationSettings;
        this.reportSettings = this.config.reportSettings;
        this.githubSettings = this.config.githubSettings;
    }

    async fetchAllRepos() {
        console.log(`Fetching repositories from organization: ${this.orgName}`);
        
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            try {
                const response = await this.octokit.rest.repos.listForOrg({
                    org: this.orgName,
                    per_page: this.githubSettings.reposPerPage,
                    page: page,
                    type: 'all'
                });
                
                let repos = response.data;
                
                // Filter based on settings
                if (!this.reportSettings.includeArchived) {
                    repos = repos.filter(repo => !repo.archived);
                }
                
                this.repos.push(...repos);
                
                console.log(`Fetched ${repos.length} repositories from page ${page}`);
                
                if (response.data.length < this.githubSettings.reposPerPage) {
                    hasMore = false;
                } else {
                    page++;
                }
                
                // Add a small delay to be respectful to GitHub's API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error('Error fetching repositories:', error.message);
                if (error.status === 403) {
                    console.error('Access denied. Please check your token permissions.');
                } else if (error.status === 404) {
                    console.error('Organization not found. Please check the organization name.');
                }
                hasMore = false;
            }
        }
        
        console.log(`Total repositories found: ${this.repos.length}`);
    }

    async fetchBranchProtection(repo) {
        try {
            const response = await this.octokit.rest.repos.getBranchProtection({
                owner: this.orgName,
                repo: repo.name,
                branch: repo.default_branch || 'main'
            });
            
            return {
                enabled: true,
                required_status_checks: response.data.required_status_checks,
                enforce_admins: response.data.enforce_admins?.enabled || false,
                required_pull_request_reviews: response.data.required_pull_request_reviews,
                restrictions: response.data.restrictions,
                allow_force_pushes: response.data.allow_force_pushes?.enabled || false,
                allow_deletions: response.data.allow_deletions?.enabled || false,
                block_creations: response.data.block_creations?.enabled || false,
                required_conversation_resolution: response.data.required_conversation_resolution?.enabled || false,
                lock_branch: response.data.lock_branch?.enabled || false,
                allow_fork_syncing: response.data.allow_fork_syncing?.enabled || false
            };
        } catch (error) {
            if (error.status === 404) {
                // Branch protection not configured
                return { enabled: false };
            } else if (error.status === 403) {
                // No permission to view branch protection
                return { enabled: null, error: 'No permission to view branch protection' };
            } else {
                // Other error
                return { enabled: null, error: error.message };
            }
        }
    }

    async fetchAllBranchProtections() {
        console.log('Fetching branch protection settings for all repositories...');
        
        for (let i = 0; i < this.repos.length; i++) {
            const repo = this.repos[i];
            console.log(`Fetching branch protection for ${repo.full_name} (${i + 1}/${this.repos.length})`);
            
            const branchProtection = await this.fetchBranchProtection(repo);
            repo.branchProtection = branchProtection;
            
            // Add a small delay to be respectful to GitHub's API
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('Branch protection fetching complete');
    }

    extractConfigValues(repo) {
        const config = {};
        
        this.configFields.forEach(field => {
            if (field === 'security_and_analysis') {
                config[field] = repo[field] ? {
                    advanced_security: repo[field].advanced_security?.status,
                    secret_scanning: repo[field].secret_scanning?.status,
                    secret_scanning_push_protection: repo[field].secret_scanning_push_protection?.status
                } : null;
            } else if (field === 'license') {
                config[field] = repo[field] ? repo[field].name : null;
            } else if (field === 'branch_protection') {
                config[field] = repo.branchProtection || { enabled: null, error: 'Not fetched' };
            } else {
                config[field] = repo[field];
            }
        });
        
        return config;
    }

    calculateNorms() {
        const norms = {};
        
        this.configFields.forEach(field => {
            const values = this.repos.map(repo => {
                if (field === 'security_and_analysis') {
                    return repo[field] ? {
                        advanced_security: repo[field].advanced_security?.status,
                        secret_scanning: repo[field].secret_scanning?.status,
                        secret_scanning_push_protection: repo[field].secret_scanning_push_protection?.status
                    } : null;
                } else if (field === 'license') {
                    return repo[field] ? repo[field].name : null;
                } else if (field === 'branch_protection') {
                    return repo.branchProtection || { enabled: null, error: 'Not fetched' };
                } else {
                    return repo[field];
                }
            });
            
            if (field === 'topics') {
                // For topics, find the most common topics
                const topicCounts = {};
                values.forEach(topicList => {
                    if (Array.isArray(topicList)) {
                        topicList.forEach(topic => {
                            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                        });
                    }
                });
                norms[field] = Object.entries(topicCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, this.reportSettings.maxTopicsInNorms)
                    .map(([topic, count]) => ({ topic, count }));
            } else if (field === 'security_and_analysis') {
                // For security settings, find most common configuration
                const configCounts = {};
                values.forEach(config => {
                    if (config) {
                        const key = JSON.stringify(config);
                        configCounts[key] = (configCounts[key] || 0) + 1;
                    }
                });
                const mostCommon = Object.entries(configCounts)
                    .sort(([,a], [,b]) => b - a)[0];
                norms[field] = mostCommon ? JSON.parse(mostCommon[0]) : null;
            } else if (field === 'branch_protection') {
                // For branch protection, find most common configuration
                const configCounts = {};
                values.forEach(config => {
                    if (config && config.enabled !== null) {
                        const key = JSON.stringify(config);
                        configCounts[key] = (configCounts[key] || 0) + 1;
                    }
                });
                const mostCommon = Object.entries(configCounts)
                    .sort(([,a], [,b]) => b - a)[0];
                norms[field] = mostCommon ? JSON.parse(mostCommon[0]) : null;
            } else {
                // For simple values, find the most common value while preserving data types
                const valueCounts = {};
                values.forEach(value => {
                    if (value !== null && value !== undefined) {
                        // Use the value itself as the key to preserve data types
                        const key = typeof value === 'object' ? JSON.stringify(value) : value;
                        valueCounts[key] = (valueCounts[key] || 0) + 1;
                    } else {
                        // Treat null and undefined as equivalent
                        valueCounts['null'] = (valueCounts['null'] || 0) + 1;
                    }
                });
                const mostCommon = Object.entries(valueCounts)
                    .sort(([,a], [,b]) => b - a)[0];
                
                if (mostCommon) {
                    // Convert back to original data type if it was a string representation
                    const key = mostCommon[0];
                    if (key === 'true') {
                        norms[field] = true;
                    } else if (key === 'false') {
                        norms[field] = false;
                    } else if (key === 'null') {
                        norms[field] = null;
                    } else if (!isNaN(key) && key !== '') {
                        // Try to convert to number if it looks like a number
                        norms[field] = Number(key);
                    } else {
                        norms[field] = key;
                    }
                } else {
                    norms[field] = null;
                }
            }
        });
        
        return norms;
    }

    findDeviations(repoConfig, norms) {
        const deviations = {};
        
        this.configFields.forEach(field => {
            // Skip fields that should be ignored
            if (this.deviationSettings.ignoreFields.includes(field)) {
                return;
            }
            
            const repoValue = repoConfig[field];
            const normValue = norms[field];
            
            if (field === 'topics') {
                if (!Array.isArray(repoValue) || !Array.isArray(normValue)) {
                    if (repoValue !== normValue) {
                        deviations[field] = {
                            repo: repoValue,
                            norm: normValue
                        };
                    }
                } else {
                    const repoTopics = new Set(repoValue);
                    const normTopics = new Set(normValue.map(n => n.topic));
                    const missing = normValue.filter(n => !repoTopics.has(n.topic));
                    const extra = repoValue.filter(topic => !normTopics.has(topic));
                    
                    // Only mark as deviation if thresholds are met
                    if (missing.length >= this.deviationSettings.topicMissingThreshold || 
                        extra.length >= this.deviationSettings.topicExtraThreshold) {
                        deviations[field] = {
                            repo: repoValue,
                            norm: normValue,
                            missing: missing,
                            extra: extra
                        };
                    }
                }
            } else if (field === 'security_and_analysis' || field === 'branch_protection') {
                if (JSON.stringify(repoValue) !== JSON.stringify(normValue)) {
                    deviations[field] = {
                        repo: repoValue,
                        norm: normValue
                    };
                }
            } else {
                // For simple values, handle type coercion and null/undefined equivalence
                let isDifferent = false;
                
                // Helper function to check if values are effectively null/undefined
                const isNullOrUndefined = (value) => value === null || value === undefined;
                
                if (repoValue === normValue) {
                    // Values are exactly the same
                    isDifferent = false;
                } else if (isNullOrUndefined(repoValue) && isNullOrUndefined(normValue)) {
                    // Both are null/undefined - treat as equivalent
                    isDifferent = false;
                } else if (isNullOrUndefined(repoValue) || isNullOrUndefined(normValue)) {
                    // One is null/undefined, the other isn't
                    isDifferent = true;
                } else if (typeof repoValue === 'boolean' && typeof normValue === 'boolean') {
                    // Both are booleans, compare directly
                    isDifferent = repoValue !== normValue;
                } else if (typeof repoValue === 'number' && typeof normValue === 'number') {
                    // Both are numbers, compare directly
                    isDifferent = repoValue !== normValue;
                } else if (typeof repoValue === 'string' && typeof normValue === 'string') {
                    // Both are strings, compare directly
                    isDifferent = repoValue !== normValue;
                } else {
                    // Different types, try to coerce for comparison
                    const repoCoerced = repoValue === true || repoValue === 'true' ? true : 
                                      repoValue === false || repoValue === 'false' ? false : repoValue;
                    const normCoerced = normValue === true || normValue === 'true' ? true : 
                                      normValue === false || normValue === 'false' ? false : normValue;
                    
                    isDifferent = repoCoerced !== normCoerced;
                }
                
                if (isDifferent) {
                    deviations[field] = {
                        repo: repoValue,
                        norm: normValue
                    };
                }
            }
        });
        
        return Object.keys(deviations).length > 0 ? deviations : null;
    }

    generateHTMLReport() {
        const norms = this.calculateNorms();
        const repoConfigs = this.repos.map(repo => ({
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            config: this.extractConfigValues(repo),
            deviations: this.findDeviations(this.extractConfigValues(repo), norms)
        }));

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Repository Configuration Analysis - ${this.orgName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f6f8fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #24292e 0%, #586069 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #24292e;
            border-bottom: 2px solid #e1e4e8;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .repo-card {
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .repo-header {
            background: #f6f8fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e1e4e8;
        }
        .repo-header h3 {
            margin: 0;
            color: #0366d6;
        }
        .repo-header a {
            color: inherit;
            text-decoration: none;
        }
        .repo-header a:hover {
            text-decoration: underline;
        }
        .repo-content {
            padding: 20px;
        }
        .config-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        .config-item {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid #28a745;
        }
        .config-item.deviation {
            border-left-color: #dc3545;
            background: #fff5f5;
        }
        .config-label {
            font-weight: 600;
            color: #24292e;
            margin-bottom: 5px;
        }
        .config-value {
            color: #586069;
            word-break: break-word;
        }
        .deviation-details {
            margin-top: 10px;
            padding: 10px;
            background: #fff3cd;
            border-radius: 4px;
            border-left: 3px solid #ffc107;
        }
        .deviation-details h4 {
            margin: 0 0 10px 0;
            color: #856404;
        }
        .deviation-item {
            margin-bottom: 5px;
        }
        .deviation-repo {
            color: #dc3545;
        }
        .deviation-norm {
            color: #28a745;
        }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-number {
            font-size: 2em;
            font-weight: bold;
            color: #0366d6;
        }
        .summary-label {
            color: #586069;
            margin-top: 5px;
        }
        .norms-section {
            background: #f1f8ff;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
        }
        .norms-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .norm-item {
            background: white;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #e1e4e8;
        }
        .norm-label {
            font-weight: 600;
            color: #24292e;
            margin-bottom: 8px;
        }
        .norm-value {
            color: #586069;
        }
        .topic-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        .topic-tag {
            background: #0366d6;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
        }
        .topic-count {
            background: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.7em;
            margin-left: 5px;
        }
        .timestamp {
            text-align: center;
            color: #586069;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e1e4e8;
        }
        .branch-protection-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .branch-protection-enabled {
            background: #28a745;
            color: white;
        }
        .branch-protection-disabled {
            background: #dc3545;
            color: white;
        }
        .branch-protection-error {
            background: #ffc107;
            color: #856404;
        }
        ${this.reportSettings.customCSS || ''}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>GitHub Repository Configuration Analysis</h1>
            <p>Organization: ${this.orgName}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <h2>Summary</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-number">${this.repos.length}</div>
                        <div class="summary-label">Total Repositories</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-number">${repoConfigs.filter(r => r.deviations).length}</div>
                        <div class="summary-label">Repositories with Deviations</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-number">${this.configFields.length}</div>
                        <div class="summary-label">Configuration Fields Analyzed</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Configuration Norms</h2>
                <div class="norms-section">
                    <div class="norms-grid">
                        ${this.configFields.map(field => {
                            const norm = norms[field];
                            let displayValue = 'null';
                            
                            if (field === 'topics' && Array.isArray(norm)) {
                                displayValue = `<div class="topic-list">${norm.map(t => 
                                    `<span class="topic-tag">${t.topic}<span class="topic-count">${t.count}</span></span>`
                                ).join('')}</div>`;
                            } else if (field === 'security_and_analysis' && norm) {
                                displayValue = `<pre>${JSON.stringify(norm, null, 2)}</pre>`;
                            } else if (field === 'branch_protection' && norm) {
                                const status = norm.enabled ? 'enabled' : 'disabled';
                                const statusClass = norm.enabled ? 'branch-protection-enabled' : 'branch-protection-disabled';
                                displayValue = `<span class="branch-protection-status ${statusClass}">${status}</span><br><pre>${JSON.stringify(norm, null, 2)}</pre>`;
                            } else if (norm !== null && norm !== undefined) {
                                displayValue = String(norm);
                            }
                            
                            return `
                                <div class="norm-item">
                                    <div class="norm-label">${field}</div>
                                    <div class="norm-value">${displayValue}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Repository Configurations</h2>
                ${repoConfigs.map(repo => `
                    <div class="repo-card">
                        <div class="repo-header">
                            <h3><a href="${repo.html_url}" target="_blank">${repo.full_name}</a></h3>
                        </div>
                        <div class="repo-content">
                            <div class="config-grid">
                                ${this.configFields.map(field => {
                                    const value = repo.config[field];
                                    const isDeviation = repo.deviations && repo.deviations[field];
                                    let displayValue = 'null';
                                    
                                    if (field === 'topics' && Array.isArray(value)) {
                                        displayValue = `<div class="topic-list">${value.map(topic => 
                                            `<span class="topic-tag">${topic}</span>`
                                        ).join('')}</div>`;
                                    } else if (field === 'security_and_analysis' && value) {
                                        displayValue = `<pre>${JSON.stringify(value, null, 2)}</pre>`;
                                    } else if (field === 'branch_protection' && value) {
                                        if (value.enabled === null) {
                                            displayValue = `<span class="branch-protection-status branch-protection-error">Error: ${value.error || 'Unknown'}</span>`;
                                        } else if (value.enabled === false) {
                                            displayValue = `<span class="branch-protection-status branch-protection-disabled">Disabled</span>`;
                                        } else {
                                            displayValue = `<span class="branch-protection-status branch-protection-enabled">Enabled</span><br><pre>${JSON.stringify(value, null, 2)}</pre>`;
                                        }
                                    } else if (value !== null && value !== undefined) {
                                        displayValue = String(value);
                                    }
                                    
                                    return `
                                        <div class="config-item ${isDeviation ? 'deviation' : ''}">
                                            <div class="config-label">${field}</div>
                                            <div class="config-value">${displayValue}</div>
                                            ${isDeviation ? `
                                                <div class="deviation-details">
                                                    <h4>Deviation Details:</h4>
                                                    <div class="deviation-item">
                                                        <strong>Repository:</strong> <span class="deviation-repo">${JSON.stringify(repo.deviations[field].repo)}</span>
                                                    </div>
                                                    <div class="deviation-item">
                                                        <strong>Norm:</strong> <span class="deviation-norm">${JSON.stringify(repo.deviations[field].norm)}</span>
                                                    </div>
                                                    ${repo.deviations[field].missing ? `
                                                        <div class="deviation-item">
                                                            <strong>Missing:</strong> ${repo.deviations[field].missing.map(m => m.topic).join(', ')}
                                                        </div>
                                                    ` : ''}
                                                    ${repo.deviations[field].extra ? `
                                                        <div class="deviation-item">
                                                            <strong>Extra:</strong> ${repo.deviations[field].extra.join(', ')}
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="timestamp">
                Report generated on ${new Date().toLocaleString()}
            </div>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    async generateReport() {
        await this.fetchAllRepos();
        
        if (this.repos.length === 0) {
            console.log('No repositories found or all repositories are archived.');
            return;
        }

        // Fetch branch protection settings if the field is included
        if (this.configFields.includes('branch_protection')) {
            await this.fetchAllBranchProtections();
        }

        const html = this.generateHTMLReport();
        const filename = `repo-config-analysis-${this.orgName}-${new Date().toISOString().split('T')[0]}.html`;
        
        await fs.writeFile(filename, html);
        console.log(`Report generated: ${filename}`);
        
        // Also generate a deviations-only report if configured
        if (this.reportSettings.generateBothReports) {
            const deviationsOnly = this.generateDeviationsOnlyReport();
            const deviationsFilename = `repo-deviations-${this.orgName}-${new Date().toISOString().split('T')[0]}.html`;
            
            await fs.writeFile(deviationsFilename, deviationsOnly);
            console.log(`Deviations report generated: ${deviationsFilename}`);
        }
    }

    generateDeviationsOnlyReport() {
        const norms = this.calculateNorms();
        const reposWithDeviations = this.repos
            .map(repo => ({
                name: repo.name,
                full_name: repo.full_name,
                html_url: repo.html_url,
                config: this.extractConfigValues(repo),
                deviations: this.findDeviations(this.extractConfigValues(repo), norms)
            }))
            .filter(repo => repo.deviations);

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Repository Deviations Report - ${this.orgName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f6f8fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .repo-card {
            border: 2px solid #dc3545;
            border-radius: 6px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .repo-header {
            background: #dc3545;
            color: white;
            padding: 15px 20px;
        }
        .repo-header h3 {
            margin: 0;
        }
        .repo-header a {
            color: inherit;
            text-decoration: none;
        }
        .repo-header a:hover {
            text-decoration: underline;
        }
        .repo-content {
            padding: 20px;
        }
        .deviation-item {
            background: #fff5f5;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 4px solid #dc3545;
        }
        .deviation-field {
            font-weight: bold;
            color: #dc3545;
            margin-bottom: 10px;
        }
        .deviation-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .deviation-repo, .deviation-norm {
            padding: 10px;
            border-radius: 4px;
        }
        .deviation-repo {
            background: #ffe6e6;
            border: 1px solid #dc3545;
        }
        .deviation-norm {
            background: #e6ffe6;
            border: 1px solid #28a745;
        }
        .deviation-label {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .deviation-value {
            word-break: break-word;
        }
        .summary {
            background: #fff3cd;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
            border: 1px solid #ffc107;
        }
        .timestamp {
            text-align: center;
            color: #586069;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e1e4e8;
        }
        .branch-protection-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .branch-protection-enabled {
            background: #28a745;
            color: white;
        }
        .branch-protection-disabled {
            background: #dc3545;
            color: white;
        }
        .branch-protection-error {
            background: #ffc107;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Repository Configuration Deviations</h1>
            <p>Organization: ${this.orgName}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <h2>Summary</h2>
                <p><strong>${reposWithDeviations.length}</strong> repositories have configuration deviations from the norm.</p>
            </div>

            ${reposWithDeviations.map(repo => `
                <div class="repo-card">
                    <div class="repo-header">
                        <h3><a href="${repo.html_url}" target="_blank">${repo.full_name}</a></h3>
                    </div>
                    <div class="repo-content">
                        ${Object.entries(repo.deviations).map(([field, deviation]) => `
                            <div class="deviation-item">
                                <div class="deviation-field">${field}</div>
                                <div class="deviation-details">
                                    <div class="deviation-repo">
                                        <div class="deviation-label">Repository Value:</div>
                                        <div class="deviation-value">${field === 'branch_protection' ? 
                                            (deviation.repo.enabled === null ? 
                                                `<span class="branch-protection-status branch-protection-error">Error: ${deviation.repo.error || 'Unknown'}</span>` :
                                                deviation.repo.enabled ? 
                                                    `<span class="branch-protection-status branch-protection-enabled">Enabled</span><br><pre>${JSON.stringify(deviation.repo, null, 2)}</pre>` :
                                                    `<span class="branch-protection-status branch-protection-disabled">Disabled</span>`
                                            ) : 
                                            JSON.stringify(deviation.repo, null, 2)
                                        }</div>
                                    </div>
                                    <div class="deviation-norm">
                                        <div class="deviation-label">Normal Value:</div>
                                        <div class="deviation-value">${field === 'branch_protection' ? 
                                            (deviation.norm.enabled === null ? 
                                                `<span class="branch-protection-status branch-protection-error">Error: ${deviation.norm.error || 'Unknown'}</span>` :
                                                deviation.norm.enabled ? 
                                                    `<span class="branch-protection-status branch-protection-enabled">Enabled</span><br><pre>${JSON.stringify(deviation.norm, null, 2)}</pre>` :
                                                    `<span class="branch-protection-status branch-protection-disabled">Disabled</span>`
                                            ) : 
                                            JSON.stringify(deviation.norm, null, 2)
                                        }</div>
                                    </div>
                                </div>
                                ${deviation.missing ? `
                                    <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px;">
                                        <strong>Missing topics:</strong> ${deviation.missing.map(m => m.topic).join(', ')}
                                    </div>
                                ` : ''}
                                ${deviation.extra ? `
                                    <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px;">
                                        <strong>Extra topics:</strong> ${deviation.extra.join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            
            <div class="timestamp">
                Report generated on ${new Date().toLocaleString()}
            </div>
        </div>
    </div>
</body>
</html>`;

        return html;
    }
}

// Main execution
async function main() {
    const token = process.env.GITHUB_TOKEN;
    const orgName = process.env.GITHUB_ORG;
    
    if (!token) {
        console.error('Error: GITHUB_TOKEN environment variable is required');
        console.log('Please set your GitHub token: export GITHUB_TOKEN=your_token_here');
        process.exit(1);
    }
    
    if (!orgName) {
        console.error('Error: GITHUB_ORG environment variable is required');
        console.log('Please set your GitHub organization: export GITHUB_ORG=your_org_name');
        process.exit(1);
    }
    
    const analyzer = new RepoConfigAnalyzer(token, orgName);
    
    try {
        await analyzer.generateReport();
        console.log('Analysis complete! Check the generated HTML files for detailed reports.');
    } catch (error) {
        console.error('Error during analysis:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = RepoConfigAnalyzer;
