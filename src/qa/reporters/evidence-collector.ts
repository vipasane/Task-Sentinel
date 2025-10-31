/**
 * Evidence Collector
 * Collects and formats QA evidence artifacts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  EvidenceCollectionConfig,
  EvidenceArtifacts,
  QAResult
} from '../types';

export class EvidenceCollector {
  constructor(private config: EvidenceCollectionConfig) {}

  /**
   * Collect all evidence artifacts
   */
  async collect(result: QAResult): Promise<EvidenceArtifacts> {
    console.log('📦 Collecting evidence artifacts...');

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });

    const artifacts: EvidenceArtifacts = {
      testReports: [],
      coverageReports: [],
      securityReports: [],
      performanceReports: [],
      qualityReports: [],
      logs: []
    };

    // Generate reports in parallel
    await Promise.all([
      this.generateTestReports(result, artifacts),
      this.generateCoverageReports(result, artifacts),
      this.generateSecurityReports(result, artifacts),
      this.generatePerformanceReports(result, artifacts),
      this.generateQualityReports(result, artifacts),
      this.generateSummaryReport(result, artifacts)
    ]);

    console.log('✅ Evidence collection complete');
    console.log(`   Generated ${this.countArtifacts(artifacts)} artifacts`);

    return artifacts;
  }

  /**
   * Generate test reports
   */
  private async generateTestReports(
    result: QAResult,
    artifacts: EvidenceArtifacts
  ): Promise<void> {
    if (!result.tests) return;

    // JSON report
    if (this.config.formats.includes('json')) {
      const jsonPath = path.join(this.config.outputDir, 'test-results.json');
      await fs.writeFile(
        jsonPath,
        JSON.stringify(result.tests, null, 2),
        'utf-8'
      );
      artifacts.testReports.push(jsonPath);
    }

    // HTML report
    if (this.config.formats.includes('html')) {
      const htmlPath = path.join(this.config.outputDir, 'test-results.html');
      const html = this.generateTestHTML(result.tests);
      await fs.writeFile(htmlPath, html, 'utf-8');
      artifacts.testReports.push(htmlPath);
    }

    // Markdown report
    if (this.config.formats.includes('markdown')) {
      const mdPath = path.join(this.config.outputDir, 'test-results.md');
      const markdown = this.generateTestMarkdown(result.tests);
      await fs.writeFile(mdPath, markdown, 'utf-8');
      artifacts.testReports.push(mdPath);
    }
  }

  /**
   * Generate coverage reports
   */
  private async generateCoverageReports(
    result: QAResult,
    artifacts: EvidenceArtifacts
  ): Promise<void> {
    if (!result.tests?.coverage) return;

    // JSON report
    if (this.config.formats.includes('json')) {
      const jsonPath = path.join(this.config.outputDir, 'coverage.json');
      await fs.writeFile(
        jsonPath,
        JSON.stringify(result.tests.coverage, null, 2),
        'utf-8'
      );
      artifacts.coverageReports.push(jsonPath);
    }

    // HTML report (copy from coverage directory if exists)
    try {
      const coverageHtml = path.join(process.cwd(), 'coverage', 'lcov-report', 'index.html');
      await fs.access(coverageHtml);
      const destPath = path.join(this.config.outputDir, 'coverage.html');
      await fs.copyFile(coverageHtml, destPath);
      artifacts.coverageReports.push(destPath);
    } catch {
      // Coverage HTML not available
    }
  }

  /**
   * Generate security reports
   */
  private async generateSecurityReports(
    result: QAResult,
    artifacts: EvidenceArtifacts
  ): Promise<void> {
    if (!result.security) return;

    // JSON report
    if (this.config.formats.includes('json')) {
      const jsonPath = path.join(this.config.outputDir, 'security-scan.json');
      await fs.writeFile(
        jsonPath,
        JSON.stringify(result.security, null, 2),
        'utf-8'
      );
      artifacts.securityReports.push(jsonPath);
    }

    // HTML report
    if (this.config.formats.includes('html')) {
      const htmlPath = path.join(this.config.outputDir, 'security-scan.html');
      const html = this.generateSecurityHTML(result.security);
      await fs.writeFile(htmlPath, html, 'utf-8');
      artifacts.securityReports.push(htmlPath);
    }

    // Markdown report
    if (this.config.formats.includes('markdown')) {
      const mdPath = path.join(this.config.outputDir, 'security-scan.md');
      const markdown = this.generateSecurityMarkdown(result.security);
      await fs.writeFile(mdPath, markdown, 'utf-8');
      artifacts.securityReports.push(mdPath);
    }
  }

  /**
   * Generate performance reports
   */
  private async generatePerformanceReports(
    result: QAResult,
    artifacts: EvidenceArtifacts
  ): Promise<void> {
    if (!result.performance) return;

    // JSON report
    if (this.config.formats.includes('json')) {
      const jsonPath = path.join(this.config.outputDir, 'performance-benchmark.json');
      await fs.writeFile(
        jsonPath,
        JSON.stringify(result.performance, null, 2),
        'utf-8'
      );
      artifacts.performanceReports.push(jsonPath);
    }

    // HTML report
    if (this.config.formats.includes('html')) {
      const htmlPath = path.join(this.config.outputDir, 'performance-benchmark.html');
      const html = this.generatePerformanceHTML(result.performance);
      await fs.writeFile(htmlPath, html, 'utf-8');
      artifacts.performanceReports.push(htmlPath);
    }
  }

  /**
   * Generate quality reports
   */
  private async generateQualityReports(
    result: QAResult,
    artifacts: EvidenceArtifacts
  ): Promise<void> {
    if (!result.codeQuality) return;

    // JSON report
    if (this.config.formats.includes('json')) {
      const jsonPath = path.join(this.config.outputDir, 'code-quality.json');
      await fs.writeFile(
        jsonPath,
        JSON.stringify(result.codeQuality, null, 2),
        'utf-8'
      );
      artifacts.qualityReports.push(jsonPath);
    }

    // HTML report
    if (this.config.formats.includes('html')) {
      const htmlPath = path.join(this.config.outputDir, 'code-quality.html');
      const html = this.generateQualityHTML(result.codeQuality);
      await fs.writeFile(htmlPath, html, 'utf-8');
      artifacts.qualityReports.push(htmlPath);
    }
  }

  /**
   * Generate summary report
   */
  private async generateSummaryReport(
    result: QAResult,
    artifacts: EvidenceArtifacts
  ): Promise<void> {
    const summaryPath = path.join(this.config.outputDir, 'qa-summary.md');
    const summary = this.generateSummaryMarkdown(result);
    await fs.writeFile(summaryPath, summary, 'utf-8');
    artifacts.logs.push(summaryPath);
  }

  /**
   * Generate test HTML
   */
  private generateTestHTML(tests: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .passed { color: green; }
    .failed { color: red; }
    .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Test Results</h1>
  <div class="summary">
    <p><strong>Total:</strong> ${tests.total}</p>
    <p class="passed"><strong>Passed:</strong> ${tests.passed}</p>
    <p class="failed"><strong>Failed:</strong> ${tests.failed}</p>
    <p><strong>Coverage:</strong> ${tests.coverage.lines.pct.toFixed(1)}%</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate test markdown
   */
  private generateTestMarkdown(tests: any): string {
    return `# Test Results

## Summary
- **Total Tests:** ${tests.total}
- **Passed:** ${tests.passed} ✅
- **Failed:** ${tests.failed} ❌
- **Skipped:** ${tests.skipped}
- **Duration:** ${tests.duration}ms

## Coverage
- **Lines:** ${tests.coverage.lines.pct.toFixed(1)}%
- **Functions:** ${tests.coverage.functions.pct.toFixed(1)}%
- **Branches:** ${tests.coverage.branches.pct.toFixed(1)}%
- **Statements:** ${tests.coverage.statements.pct.toFixed(1)}%
`;
  }

  /**
   * Generate security HTML
   */
  private generateSecurityHTML(security: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Security Scan Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .critical { color: #d32f2f; }
    .high { color: #f57c00; }
    .medium { color: #fbc02d; }
    .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Security Scan Results</h1>
  <div class="summary">
    <p class="critical"><strong>Critical:</strong> ${security.summary.critical}</p>
    <p class="high"><strong>High:</strong> ${security.summary.high}</p>
    <p class="medium"><strong>Medium:</strong> ${security.summary.medium}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate security markdown
   */
  private generateSecurityMarkdown(security: any): string {
    let md = `# Security Scan Results\n\n`;
    md += `## Summary\n`;
    md += `- **Critical:** ${security.summary.critical}\n`;
    md += `- **High:** ${security.summary.high}\n`;
    md += `- **Medium:** ${security.summary.medium}\n`;
    md += `- **Low:** ${security.summary.low}\n\n`;

    if (security.vulnerabilities.length > 0) {
      md += `## Vulnerabilities\n\n`;
      for (const vuln of security.vulnerabilities) {
        md += `### ${vuln.severity.toUpperCase()}: ${vuln.title}\n`;
        md += `${vuln.description}\n\n`;
        md += `**Recommendation:** ${vuln.recommendation}\n\n`;
      }
    }

    return md;
  }

  /**
   * Generate performance HTML
   */
  private generatePerformanceHTML(performance: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Performance Benchmark</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .passed { color: green; }
    .failed { color: red; }
  </style>
</head>
<body>
  <h1>Performance Benchmark Results</h1>
  <div class="summary">
    ${performance.metrics.map((m: any) => `
      <p class="${m.passed ? 'passed' : 'failed'}">
        <strong>${m.name}:</strong> ${m.value.toFixed(2)}${m.unit}
        (threshold: ${m.threshold}${m.unit})
      </p>
    `).join('')}
  </div>
</body>
</html>`;
  }

  /**
   * Generate quality HTML
   */
  private generateQualityHTML(quality: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Code Quality Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
  </style>
</head>
<body>
  <h1>Code Quality Report</h1>
  <div class="summary">
    <p><strong>Overall Score:</strong> ${quality.overallScore}/100</p>
    <p><strong>Maintainability:</strong> ${quality.maintainabilityIndex.toFixed(1)}</p>
    <p><strong>Complexity:</strong> ${quality.cyclomaticComplexity.toFixed(1)}</p>
    <p><strong>Lines of Code:</strong> ${quality.linesOfCode}</p>
    <p><strong>Technical Debt:</strong> ${quality.technicalDebt}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate summary markdown
   */
  private generateSummaryMarkdown(result: QAResult): string {
    let md = `# QA Summary Report\n\n`;
    md += `**Generated:** ${result.timestamp}\n`;
    md += `**Duration:** ${result.duration}ms\n`;
    md += `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    md += `## Quality Gates\n\n`;
    for (const gate of result.qualityGatesPassed) {
      md += `- ${gate.passed ? '✅' : '❌'} **${gate.gate}:** ${gate.message}\n`;
    }

    return md;
  }

  /**
   * Count total artifacts
   */
  private countArtifacts(artifacts: EvidenceArtifacts): number {
    return (
      artifacts.testReports.length +
      artifacts.coverageReports.length +
      artifacts.securityReports.length +
      artifacts.performanceReports.length +
      artifacts.qualityReports.length +
      artifacts.logs.length
    );
  }
}
