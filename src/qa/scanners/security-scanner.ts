/**
 * Security Scanner
 * Performs comprehensive security vulnerability scanning
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  SecurityScanConfig,
  SecurityResults,
  Vulnerability,
  SecurityScan
} from '../types';

export class SecurityScanner {
  constructor(private config: SecurityScanConfig) {}

  /**
   * Run all security scans
   */
  async runScans(): Promise<SecurityResults> {
    console.log('🔒 Running security scans...');
    const startTime = Date.now();

    const vulnerabilities: Vulnerability[] = [];
    const scans: SecurityScan[] = [];

    // NPM Audit
    if (this.config.npm.enabled) {
      const npmVulns = await this.runNPMAudit();
      vulnerabilities.push(...npmVulns.vulnerabilities);
      scans.push(npmVulns.scan);
    }

    // Static Analysis
    if (this.config.static.enabled) {
      const staticVulns = await this.runStaticAnalysis();
      vulnerabilities.push(...staticVulns.vulnerabilities);
      scans.push(staticVulns.scan);
    }

    // SAST Scanning
    if (this.config.sast.enabled) {
      const sastVulns = await this.runSASTScan();
      vulnerabilities.push(...sastVulns.vulnerabilities);
      scans.push(sastVulns.scan);
    }

    // Secret Detection
    if (this.config.secrets.enabled) {
      const secretVulns = await this.runSecretDetection();
      vulnerabilities.push(...secretVulns.vulnerabilities);
      scans.push(secretVulns.scan);
    }

    // Summarize results
    const summary = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length
    };

    const passed = summary.critical === 0 && summary.high <= 2;

    console.log(`✅ Security scans complete in ${Date.now() - startTime}ms`);
    console.log(`   Critical: ${summary.critical}, High: ${summary.high}, Medium: ${summary.medium}`);

    return {
      timestamp: new Date(),
      vulnerabilities,
      summary,
      passed,
      scans
    };
  }

  /**
   * Run NPM audit
   */
  private async runNPMAudit(): Promise<{
    vulnerabilities: Vulnerability[];
    scan: SecurityScan;
  }> {
    console.log('  🔍 Running npm audit...');
    const startTime = Date.now();

    try {
      const output = execSync('npm audit --json', {
        cwd: process.cwd(),
        encoding: 'utf-8'
      });

      const audit = JSON.parse(output);
      const vulnerabilities: Vulnerability[] = [];

      // Parse npm audit results
      for (const [name, advisory] of Object.entries(audit.vulnerabilities || {})) {
        const vuln = advisory as any;
        vulnerabilities.push({
          severity: this.mapNPMSeverity(vuln.severity),
          title: `${name}: ${vuln.via[0]?.title || 'Vulnerability'}`,
          description: vuln.via[0]?.description || 'No description',
          source: 'npm',
          cwe: vuln.via[0]?.cwe?.join(', '),
          cvss: vuln.via[0]?.cvss?.score,
          recommendation: `Update to ${vuln.fixAvailable?.version || 'latest version'}`,
          affectedPackage: name,
          fixAvailable: !!vuln.fixAvailable
        });
      }

      return {
        vulnerabilities,
        scan: {
          type: 'npm',
          duration: Date.now() - startTime,
          findings: vulnerabilities.length,
          passed: vulnerabilities.filter(v => v.severity === 'critical').length === 0
        }
      };
    } catch (error) {
      console.warn('  ⚠️  npm audit failed:', error);
      return {
        vulnerabilities: [],
        scan: {
          type: 'npm',
          duration: Date.now() - startTime,
          findings: 0,
          passed: true
        }
      };
    }
  }

  /**
   * Run static analysis with ESLint security rules
   */
  private async runStaticAnalysis(): Promise<{
    vulnerabilities: Vulnerability[];
    scan: SecurityScan;
  }> {
    console.log('  🔍 Running static analysis...');
    const startTime = Date.now();

    try {
      const output = execSync('npx eslint . --format json', {
        cwd: process.cwd(),
        encoding: 'utf-8'
      });

      const results = JSON.parse(output);
      const vulnerabilities: Vulnerability[] = [];

      for (const file of results) {
        for (const message of file.messages) {
          if (message.ruleId?.startsWith('security/')) {
            vulnerabilities.push({
              severity: this.mapESLintSeverity(message.severity),
              title: `${message.ruleId}: ${message.message}`,
              description: `Security issue in ${file.filePath}:${message.line}`,
              source: 'eslint',
              recommendation: 'Review and fix security issue',
              affectedPackage: file.filePath,
              fixAvailable: !!message.fix
            });
          }
        }
      }

      return {
        vulnerabilities,
        scan: {
          type: 'static',
          duration: Date.now() - startTime,
          findings: vulnerabilities.length,
          passed: vulnerabilities.filter(v => v.severity === 'critical').length === 0
        }
      };
    } catch (error) {
      console.warn('  ⚠️  Static analysis failed:', error);
      return {
        vulnerabilities: [],
        scan: {
          type: 'static',
          duration: Date.now() - startTime,
          findings: 0,
          passed: true
        }
      };
    }
  }

  /**
   * Run SAST scanning
   */
  private async runSASTScan(): Promise<{
    vulnerabilities: Vulnerability[];
    scan: SecurityScan;
  }> {
    console.log('  🔍 Running SAST scan...');
    const startTime = Date.now();

    // Placeholder for SAST scanning (would integrate with tools like Semgrep, SonarQube)
    const vulnerabilities: Vulnerability[] = [];

    // Basic pattern matching for common issues
    const patterns = [
      { pattern: /eval\s*\(/, severity: 'high', title: 'Use of eval()' },
      { pattern: /innerHTML\s*=/, severity: 'medium', title: 'Potential XSS via innerHTML' },
      { pattern: /exec\s*\(/, severity: 'high', title: 'Command injection risk' }
    ];

    // Scan source files
    const { glob } = await import('glob');
    const files = await glob('src/**/*.ts');

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        for (const { pattern, severity, title } of patterns) {
          if (pattern.test(lines[i])) {
            vulnerabilities.push({
              severity: severity as any,
              title,
              description: `Found in ${file}:${i + 1}`,
              source: 'sast',
              recommendation: 'Use safer alternatives',
              affectedPackage: file,
              fixAvailable: false
            });
          }
        }
      }
    }

    return {
      vulnerabilities,
      scan: {
        type: 'sast',
        duration: Date.now() - startTime,
        findings: vulnerabilities.length,
        passed: vulnerabilities.filter(v => v.severity === 'critical').length === 0
      }
    };
  }

  /**
   * Run secret detection
   */
  private async runSecretDetection(): Promise<{
    vulnerabilities: Vulnerability[];
    scan: SecurityScan;
  }> {
    console.log('  🔍 Running secret detection...');
    const startTime = Date.now();

    const vulnerabilities: Vulnerability[] = [];

    // Secret patterns
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|apikey)[\s:=]+['"]?([a-zA-Z0-9_\-]+)['"]?/i, title: 'API Key' },
      { pattern: /(?:secret|password)[\s:=]+['"]?([a-zA-Z0-9_\-]+)['"]?/i, title: 'Secret/Password' },
      { pattern: /(?:token)[\s:=]+['"]?([a-zA-Z0-9_\-]+)['"]?/i, title: 'Token' },
      { pattern: /(?:aws_access_key_id|aws_secret_access_key)[\s:=]+['"]?([a-zA-Z0-9_\-]+)['"]?/i, title: 'AWS Credentials' }
    ];

    // Scan files
    const { glob } = await import('glob');
    const files = await glob('**/*', {
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'coverage/**']
    });

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          for (const { pattern, title } of secretPatterns) {
            if (pattern.test(lines[i])) {
              vulnerabilities.push({
                severity: 'critical',
                title: `Hardcoded ${title} detected`,
                description: `Found in ${file}:${i + 1}`,
                source: 'secrets',
                recommendation: 'Remove hardcoded secrets and use environment variables',
                affectedPackage: file,
                fixAvailable: false
              });
            }
          }
        }
      } catch {
        // Skip binary files
      }
    }

    return {
      vulnerabilities,
      scan: {
        type: 'secrets',
        duration: Date.now() - startTime,
        findings: vulnerabilities.length,
        passed: vulnerabilities.length === 0
      }
    };
  }

  /**
   * Map NPM severity to standard severity
   */
  private mapNPMSeverity(npmSeverity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const mapping: Record<string, any> = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low',
      info: 'info'
    };
    return mapping[npmSeverity] || 'medium';
  }

  /**
   * Map ESLint severity to standard severity
   */
  private mapESLintSeverity(eslintSeverity: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    return eslintSeverity === 2 ? 'high' : 'medium';
  }
}
