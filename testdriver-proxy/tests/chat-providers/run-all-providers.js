#!/usr/bin/env node

/**
 * Orchestrated Chat Provider Test Runner
 * 
 * Runs all chat provider tests with:
 * - Parallel or sequential execution
 * - Comprehensive reporting
 * - Config generation
 * - Error analysis
 */

const { ChatProviderTester, PROVIDERS } = require('./chat-provider-test');
const fs = require('fs').promises;
const path = require('path');

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m'
};

class TestOrchestrator {
    constructor(options = {}) {
        this.options = {
            parallel: options.parallel || false,
            providers: options.providers || Object.keys(PROVIDERS),
            outputDir: options.outputDir || '/tmp/chat-provider-test-results'
        };
        this.results = [];
    }

    log(message, color = 'reset') {
        console.log(`${COLORS[color]}${message}${COLORS.reset}`);
    }

    async runProvider(providerName) {
        const config = PROVIDERS[providerName];
        const tester = new ChatProviderTester(providerName, config);
        
        this.log(`\n${'='.repeat(60)}`, 'bright');
        this.log(`Testing: ${config.name}`, 'bright');
        this.log(`${'='.repeat(60)}`, 'bright');
        
        const startTime = Date.now();
        const result = await tester.run();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        result.duration = duration;
        return result;
    }

    async runAll() {
        this.log('\n🚀 Starting Chat Provider Test Suite', 'bright');
        this.log(`Mode: ${this.options.parallel ? 'Parallel' : 'Sequential'}`, 'blue');
        this.log(`Providers: ${this.options.providers.join(', ')}`, 'blue');
        this.log(`Output: ${this.options.outputDir}\n`, 'blue');
        
        if (this.options.parallel) {
            // Run all tests in parallel
            const promises = this.options.providers.map(p => this.runProvider(p));
            this.results = await Promise.allSettled(promises);
            this.results = this.results.map(r => r.value || { success: false, error: r.reason });
        } else {
            // Run tests sequentially
            for (const provider of this.options.providers) {
                try {
                    const result = await this.runProvider(provider);
                    this.results.push(result);
                } catch (error) {
                    this.results.push({
                        success: false,
                        provider: provider,
                        error: error.message
                    });
                }
            }
        }
        
        await this.generateReport();
        this.printSummary();
    }

    async generateReport() {
        await fs.mkdir(this.options.outputDir, { recursive: true });
        
        const report = {
            timestamp: new Date().toISOString(),
            mode: this.options.parallel ? 'parallel' : 'sequential',
            providers: this.options.providers,
            results: this.results,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.success).length,
                failed: this.results.filter(r => !r.success).length,
                passRate: ((this.results.filter(r => r.success).length / this.results.length) * 100).toFixed(1)
            }
        };
        
        // JSON report
        const jsonPath = path.join(this.options.outputDir, 'test-report.json');
        await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
        this.log(`\n📄 JSON Report: ${jsonPath}`, 'blue');
        
        // Markdown report
        const mdReport = this.generateMarkdownReport(report);
        const mdPath = path.join(this.options.outputDir, 'test-report.md');
        await fs.writeFile(mdPath, mdReport);
        this.log(`📄 Markdown Report: ${mdPath}`, 'blue');
        
        // Individual provider configs
        for (const result of this.results) {
            if (result.selectors) {
                const configPath = path.join(
                    this.options.outputDir,
                    `${result.provider}-selectors.json`
                );
                await fs.writeFile(
                    configPath,
                    JSON.stringify(result.selectors, null, 2)
                );
            }
        }
    }

    generateMarkdownReport(report) {
        const passed = report.results.filter(r => r.success);
        const failed = report.results.filter(r => !r.success);
        
        let md = `# Chat Provider Test Report\n\n`;
        md += `**Generated:** ${report.timestamp}\n\n`;
        md += `**Mode:** ${report.mode}\n\n`;
        md += `---\n\n`;
        
        md += `## 📊 Summary\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Providers | ${report.summary.total} |\n`;
        md += `| ✅ Passed | ${report.summary.passed} |\n`;
        md += `| ❌ Failed | ${report.summary.failed} |\n`;
        md += `| Pass Rate | ${report.summary.passRate}% |\n\n`;
        
        md += `---\n\n`;
        
        if (passed.length > 0) {
            md += `## ✅ Successful Tests (${passed.length})\n\n`;
            passed.forEach(result => {
                md += `### ${PROVIDERS[result.provider].name}\n\n`;
                md += `- **Duration:** ${result.duration}s\n`;
                md += `- **Response:** ${result.response ? result.response.substring(0, 200) + '...' : 'N/A'}\n`;
                md += `- **Working Selectors:**\n`;
                Object.entries(result.selectors || {}).forEach(([key, selector]) => {
                    md += `  - \`${key}\`: \`${selector}\`\n`;
                });
                md += `\n`;
            });
        }
        
        if (failed.length > 0) {
            md += `## ❌ Failed Tests (${failed.length})\n\n`;
            failed.forEach(result => {
                md += `### ${PROVIDERS[result.provider].name}\n\n`;
                md += `- **Error:** ${result.error}\n`;
                if (result.duration) {
                    md += `- **Duration:** ${result.duration}s\n`;
                }
                if (result.selectors && Object.keys(result.selectors).length > 0) {
                    md += `- **Partially Working Selectors:**\n`;
                    Object.entries(result.selectors).forEach(([key, selector]) => {
                        md += `  - \`${key}\`: \`${selector}\`\n`;
                    });
                }
                md += `\n`;
            });
        }
        
        md += `---\n\n`;
        md += `## 🔧 Recommendations\n\n`;
        
        if (failed.length > 0) {
            md += `### Failures Detected\n\n`;
            failed.forEach(result => {
                const config = PROVIDERS[result.provider];
                md += `**${config.name}:**\n`;
                
                if (result.error.includes('timeout')) {
                    md += `- Site may be slow - consider increasing timeout\n`;
                    md += `- Try enabling \`slowLoad: true\` in configuration\n`;
                } else if (result.error.includes('captcha')) {
                    md += `- Captcha detected - manual intervention required\n`;
                    md += `- Consider using captcha solving service\n`;
                } else if (result.error.includes('selector')) {
                    md += `- Selector issues detected\n`;
                    md += `- Review page structure and update selectors\n`;
                    md += `- Check browser screenshots in ${this.options.outputDir}\n`;
                } else if (result.error.includes('auth')) {
                    md += `- Authentication required\n`;
                    md += `- Verify credentials are correct\n`;
                    md += `- Check for 2FA or additional verification\n`;
                }
                md += `\n`;
            });
        }
        
        return md;
    }

    printSummary() {
        const passed = this.results.filter(r => r.success);
        const failed = this.results.filter(r => !r.success);
        
        this.log('\n' + '='.repeat(60), 'bright');
        this.log('📊 TEST SUMMARY', 'bright');
        this.log('='.repeat(60), 'bright');
        
        this.log(`\nTotal Providers: ${this.results.length}`, 'blue');
        this.log(`✅ Passed: ${passed.length}`, 'green');
        this.log(`❌ Failed: ${failed.length}`, 'red');
        this.log(`Pass Rate: ${((passed.length / this.results.length) * 100).toFixed(1)}%\n`, 'blue');
        
        if (passed.length > 0) {
            this.log('✅ SUCCESSFUL PROVIDERS:', 'green');
            passed.forEach(r => {
                this.log(`  • ${PROVIDERS[r.provider].name} (${r.duration}s)`, 'green');
            });
            console.log('');
        }
        
        if (failed.length > 0) {
            this.log('❌ FAILED PROVIDERS:', 'red');
            failed.forEach(r => {
                this.log(`  • ${PROVIDERS[r.provider].name}: ${r.error}`, 'red');
            });
            console.log('');
        }
        
        this.log('='.repeat(60), 'bright');
        this.log(`\n📁 Results saved to: ${this.options.outputDir}`, 'blue');
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const options = {
        parallel: args.includes('--parallel'),
        providers: args.find(a => a.startsWith('--providers='))
            ?.split('=')[1]
            ?.split(',') || Object.keys(PROVIDERS)
    };
    
    if (args.includes('--help')) {
        console.log(`
Chat Provider Test Runner

Usage:
  node run-all-providers.js [options]

Options:
  --parallel                Run tests in parallel (default: sequential)
  --providers=p1,p2,...    Test specific providers (default: all)
  --help                   Show this help

Examples:
  node run-all-providers.js
  node run-all-providers.js --parallel
  node run-all-providers.js --providers=k2think,grok
  node run-all-providers.js --parallel --providers=qwen,mistral

Available Providers:
  ${Object.keys(PROVIDERS).join(', ')}
        `);
        process.exit(0);
    }
    
    const orchestrator = new TestOrchestrator(options);
    await orchestrator.runAll();
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { TestOrchestrator };

