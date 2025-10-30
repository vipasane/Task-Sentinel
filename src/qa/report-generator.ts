/**
 * Report Generator
 * Generates security scan reports in multiple formats
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ScanResult,
  ReportFormat,
  SARIFResult,
  SARIFRun,
  SARIFRule,
  SARIFResultItem,
  Vulnerability,
} from './types';

export class ReportGenerator {
  private projectRoot: string;
  private outputDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.outputDir = path.join(projectRoot, 'security-reports');
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate report in specified format
   */
  async generate(result: ScanResult, format: ReportFormat): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-report-${timestamp}`;

    switch (format) {
      case 'json':
        return this.generateJSON(result, filename);
      case 'html':
        return this.generateHTML(result, filename);
      case 'sarif':
        return this.generateSARIF(result, filename);
      case 'markdown':
        return this.generateMarkdown(result, filename);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  /**
   * Generate JSON report
   */
  private generateJSON(result: ScanResult, filename: string): string {
    const filepath = path.join(this.outputDir, `${filename}.json`);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    return filepath;
  }

  /**
   * Generate HTML report
   */
  private generateHTML(result: ScanResult, filename: string): string {
    const filepath = path.join(this.outputDir, `${filename}.html`);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Scan Report - ${result.scan_id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header .meta { opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; background: #f8f9fa; }
        .stat-card { background: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-card .number { font-size: 36px; font-weight: bold; margin: 10px 0; }
        .stat-card .label { color: #666; font-size: 14px; }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .quality-gate { padding: 30px; border-bottom: 1px solid #dee2e6; }
        .quality-gate .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .quality-gate .passed { background: #d4edda; color: #155724; }
        .quality-gate .failed { background: #f8d7da; color: #721c24; }
        .vulnerabilities { padding: 30px; }
        .vuln-card { background: #f8f9fa; padding: 20px; margin-bottom: 15px; border-radius: 6px; border-left: 4px solid #dee2e6; }
        .vuln-card.critical { border-left-color: #dc3545; }
        .vuln-card.high { border-left-color: #fd7e14; }
        .vuln-card.medium { border-left-color: #ffc107; }
        .vuln-card.low { border-left-color: #28a745; }
        .vuln-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; }
        .vuln-title { font-size: 18px; font-weight: bold; flex: 1; }
        .severity-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .severity-badge.critical { background: #dc3545; color: white; }
        .severity-badge.high { background: #fd7e14; color: white; }
        .severity-badge.medium { background: #ffc107; color: #000; }
        .severity-badge.low { background: #28a745; color: white; }
        .vuln-location { color: #666; font-family: monospace; font-size: 14px; margin: 10px 0; }
        .vuln-description { color: #444; margin: 10px 0; line-height: 1.6; }
        .vuln-remediation { background: #e7f3ff; padding: 15px; border-radius: 4px; margin-top: 10px; }
        .vuln-remediation strong { color: #0066cc; }
        .code-snippet { background: #282c34; color: #abb2bf; padding: 15px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px; overflow-x: auto; margin: 10px 0; }
        .footer { padding: 20px 30px; background: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Scan Report</h1>
            <div class="meta">
                <p>Scan ID: ${result.scan_id}</p>
                <p>Completed: ${result.completed_at.toLocaleString()}</p>
                <p>Duration: ${result.duration_ms}ms</p>
            </div>
        </div>

        <div class="summary">
            <div class="stat-card">
                <div class="label">Total Vulnerabilities</div>
                <div class="number">${result.summary.total}</div>
            </div>
            <div class="stat-card">
                <div class="label">Critical</div>
                <div class="number critical">${result.summary.by_severity.critical}</div>
            </div>
            <div class="stat-card">
                <div class="label">High</div>
                <div class="number high">${result.summary.by_severity.high}</div>
            </div>
            <div class="stat-card">
                <div class="label">Medium</div>
                <div class="number medium">${result.summary.by_severity.medium}</div>
            </div>
            <div class="stat-card">
                <div class="label">Low</div>
                <div class="number low">${result.summary.by_severity.low}</div>
            </div>
        </div>

        <div class="quality-gate">
            <h2>Quality Gate</h2>
            <p>
                <span class="status ${result.quality_gate.passed ? 'passed' : 'failed'}">
                    ${result.quality_gate.passed ? '✓ PASSED' : '✗ FAILED'}
                </span>
            </p>
            ${result.quality_gate.violations.length > 0 ? `
                <div style="margin-top: 20px;">
                    <h3>Violations:</h3>
                    <ul style="margin-left: 20px; margin-top: 10px;">
                        ${result.quality_gate.violations.map(v => `<li style="margin: 5px 0;">${v.message}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>

        <div class="vulnerabilities">
            <h2>Vulnerabilities (${result.vulnerabilities.length})</h2>
            ${result.vulnerabilities.map(vuln => `
                <div class="vuln-card ${vuln.severity}">
                    <div class="vuln-header">
                        <div class="vuln-title">${this.escapeHtml(vuln.title)}</div>
                        <span class="severity-badge ${vuln.severity}">${vuln.severity}</span>
                    </div>
                    <div class="vuln-location">
                        📁 ${this.escapeHtml(vuln.location.file)}${vuln.location.line ? `:${vuln.location.line}` : ''}
                    </div>
                    <div class="vuln-description">${this.escapeHtml(vuln.description)}</div>
                    ${vuln.location.snippet ? `
                        <div class="code-snippet">${this.escapeHtml(vuln.location.snippet)}</div>
                    ` : ''}
                    ${vuln.cvss_score ? `<p><strong>CVSS Score:</strong> ${vuln.cvss_score}</p>` : ''}
                    ${vuln.cve ? `<p><strong>CVE:</strong> ${this.escapeHtml(vuln.cve)}</p>` : ''}
                    ${vuln.cwe ? `<p><strong>CWE:</strong> ${this.escapeHtml(vuln.cwe)}</p>` : ''}
                    <div class="vuln-remediation">
                        <strong>💡 Remediation:</strong> ${this.escapeHtml(vuln.remediation.suggestion)}
                        ${vuln.remediation.fix_command ? `<br><code>${this.escapeHtml(vuln.remediation.fix_command)}</code>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="footer">
            Generated by Task Sentinel Security Scanner
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(filepath, html);
    return filepath;
  }

  /**
   * Generate SARIF report for GitHub Code Scanning
   */
  private generateSARIF(result: ScanResult, filename: string): string {
    const filepath = path.join(this.outputDir, `${filename}.sarif`);

    // Extract unique rules
    const rulesMap = new Map<string, SARIFRule>();

    for (const vuln of result.vulnerabilities) {
      const ruleId = vuln.cve || vuln.id;
      if (!rulesMap.has(ruleId)) {
        rulesMap.set(ruleId, {
          id: ruleId,
          shortDescription: { text: vuln.title },
          fullDescription: { text: vuln.description },
          help: { text: vuln.remediation.suggestion },
          properties: {
            tags: [vuln.category, vuln.severity],
            precision: 'high',
            'security-severity': this.mapSeverityToScore(vuln.severity),
          },
        });
      }
    }

    // Convert vulnerabilities to SARIF results
    const sarifResults: SARIFResultItem[] = result.vulnerabilities.map(vuln => ({
      ruleId: vuln.cve || vuln.id,
      level: this.mapSeverityToLevel(vuln.severity),
      message: { text: vuln.description },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: vuln.location.file },
          region: {
            startLine: vuln.location.line || 1,
            startColumn: vuln.location.column,
          },
        },
      }],
    }));

    const sarif: SARIFResult = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'Task Sentinel Security Scanner',
            version: '1.0.0',
            informationUri: 'https://github.com/task-sentinel/security-scanner',
            rules: Array.from(rulesMap.values()),
          },
        },
        results: sarifResults,
      }],
    };

    fs.writeFileSync(filepath, JSON.stringify(sarif, null, 2));
    return filepath;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdown(result: ScanResult, filename: string): string {
    const filepath = path.join(this.outputDir, `${filename}.md`);

    const md = `# 🔒 Security Scan Report

**Scan ID:** ${result.scan_id}
**Completed:** ${result.completed_at.toLocaleString()}
**Duration:** ${result.duration_ms}ms

## Summary

| Severity | Count |
|----------|-------|
| Critical | ${result.summary.by_severity.critical} |
| High | ${result.summary.by_severity.high} |
| Medium | ${result.summary.by_severity.medium} |
| Low | ${result.summary.by_severity.low} |
| **Total** | **${result.summary.total}** |

## Quality Gate: ${result.quality_gate.passed ? '✅ PASSED' : '❌ FAILED'}

${result.quality_gate.violations.length > 0 ? `
### Violations

${result.quality_gate.violations.map(v => `- ${v.message}`).join('\n')}
` : ''}

## Vulnerabilities

${result.vulnerabilities.map(vuln => `
### ${this.getSeverityEmoji(vuln.severity)} ${vuln.title} [\`${vuln.severity.toUpperCase()}\`]

**Location:** \`${vuln.location.file}\`${vuln.location.line ? `:${vuln.location.line}` : ''}
**Category:** ${vuln.category}
${vuln.cvss_score ? `**CVSS Score:** ${vuln.cvss_score}  ` : ''}
${vuln.cve ? `**CVE:** ${vuln.cve}  ` : ''}
${vuln.cwe ? `**CWE:** ${vuln.cwe}  ` : ''}

**Description:** ${vuln.description}

${vuln.location.snippet ? `
**Code:**
\`\`\`
${vuln.location.snippet}
\`\`\`
` : ''}

**Remediation:** ${vuln.remediation.suggestion}
${vuln.remediation.fix_command ? `**Fix:** \`${vuln.remediation.fix_command}\`` : ''}

---
`).join('\n')}

---
*Generated by Task Sentinel Security Scanner*
`;

    fs.writeFileSync(filepath, md);
    return filepath;
  }

  /**
   * Map severity to SARIF level
   */
  private mapSeverityToLevel(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'note';
      default:
        return 'warning';
    }
  }

  /**
   * Map severity to numeric score
   */
  private mapSeverityToScore(severity: string): string {
    switch (severity) {
      case 'critical':
        return '9.0';
      case 'high':
        return '7.0';
      case 'medium':
        return '5.0';
      case 'low':
        return '3.0';
      default:
        return '5.0';
    }
  }

  /**
   * Get emoji for severity
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
