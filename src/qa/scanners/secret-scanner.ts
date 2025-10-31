/**
 * Secret Detection Scanner
 * Detects API keys, tokens, passwords, and credentials in code
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';
import { SecretVulnerability, VulnerabilitySeverity } from '../types';

/**
 * Secret pattern definition
 */
interface SecretPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  severity: VulnerabilitySeverity;
  entropy_threshold?: number;
}

export class SecretScanner {
  private projectRoot: string;
  private patterns: SecretPattern[];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.patterns = this.initializeSecretPatterns();
  }

  /**
   * Initialize secret detection patterns
   */
  private initializeSecretPatterns(): SecretPattern[] {
    return [
      // AWS Keys
      {
        id: 'SECRET-AWS-001',
        name: 'AWS Access Key ID',
        description: 'AWS Access Key ID detected',
        pattern: /(?:AKIA|ASIA|AIDA|AROA|AIPA|ANPA|ANVA|APKA)[A-Z0-9]{16}/g,
        severity: 'critical',
      },
      {
        id: 'SECRET-AWS-002',
        name: 'AWS Secret Access Key',
        description: 'AWS Secret Access Key detected',
        pattern: /aws[_-]?secret[_-]?access[_-]?key["\s:=]+([A-Za-z0-9/+=]{40})/gi,
        severity: 'critical',
      },

      // API Keys
      {
        id: 'SECRET-API-001',
        name: 'Generic API Key',
        description: 'Generic API key pattern detected',
        pattern: /api[_-]?key["\s:=]+['"]([A-Za-z0-9_\-]{20,})['"]/gi,
        severity: 'high',
        entropy_threshold: 4.5,
      },

      // GitHub Tokens
      {
        id: 'SECRET-GITHUB-001',
        name: 'GitHub Personal Access Token',
        description: 'GitHub Personal Access Token detected',
        pattern: /ghp_[A-Za-z0-9_]{36}/g,
        severity: 'critical',
      },
      {
        id: 'SECRET-GITHUB-002',
        name: 'GitHub OAuth Token',
        description: 'GitHub OAuth Access Token detected',
        pattern: /gho_[A-Za-z0-9_]{36}/g,
        severity: 'critical',
      },

      // Private Keys
      {
        id: 'SECRET-KEY-001',
        name: 'RSA Private Key',
        description: 'RSA private key detected',
        pattern: /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/g,
        severity: 'critical',
      },
      {
        id: 'SECRET-KEY-002',
        name: 'SSH Private Key',
        description: 'SSH private key detected',
        pattern: /-----BEGIN (EC|DSA) PRIVATE KEY-----/g,
        severity: 'critical',
      },

      // Database Credentials
      {
        id: 'SECRET-DB-001',
        name: 'Database Password',
        description: 'Database password in connection string',
        pattern: /(?:mysql|postgres|mongodb):\/\/[^:]+:([^@]{8,})@/gi,
        severity: 'critical',
      },

      // JWT Tokens
      {
        id: 'SECRET-JWT-001',
        name: 'JWT Token',
        description: 'JWT token detected',
        pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
        severity: 'high',
      },

      // Slack Tokens
      {
        id: 'SECRET-SLACK-001',
        name: 'Slack Token',
        description: 'Slack API token detected',
        pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,32}/g,
        severity: 'high',
      },

      // Stripe Keys
      {
        id: 'SECRET-STRIPE-001',
        name: 'Stripe API Key',
        description: 'Stripe secret API key detected',
        pattern: /sk_live_[A-Za-z0-9]{24,}/g,
        severity: 'critical',
      },

      // Generic Secrets
      {
        id: 'SECRET-GENERIC-001',
        name: 'Generic Secret',
        description: 'Generic secret or password pattern',
        pattern: /(?:secret|password|passwd|pwd|token)["\s:=]+['"]([^'"]{12,})['"]/gi,
        severity: 'medium',
        entropy_threshold: 4.0,
      },

      // Environment Variables (common patterns)
      {
        id: 'SECRET-ENV-001',
        name: 'Hardcoded Environment Secret',
        description: 'Secret value hardcoded instead of environment variable',
        pattern: /(?:SECRET|PASSWORD|TOKEN|KEY)\s*=\s*['"](?!process\.env)([A-Za-z0-9+/=]{20,})['"]/gi,
        severity: 'high',
      },
    ];
  }

  /**
   * Scan for secrets in code and git history
   */
  async scan(scanGitHistory: boolean = false): Promise<SecretVulnerability[]> {
    const vulnerabilities: SecretVulnerability[] = [];

    // Scan current files
    const fileVulns = await this.scanFiles();
    vulnerabilities.push(...fileVulns);

    // Scan git history if requested
    if (scanGitHistory) {
      const gitVulns = await this.scanGitHistory();
      vulnerabilities.push(...gitVulns);
    }

    return vulnerabilities;
  }

  /**
   * Scan current files for secrets
   */
  private async scanFiles(): Promise<SecretVulnerability[]> {
    const vulnerabilities: SecretVulnerability[] = [];

    const patterns = ['**/*'];
    const excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/*.min.js',
      '**/*.map',
      '**/package-lock.json',
      '**/yarn.lock',
    ];

    const files = await glob(patterns, {
      cwd: this.projectRoot,
      ignore: excludePatterns,
      absolute: true,
      nodir: true,
    });

    for (const file of files) {
      try {
        // Skip binary files
        if (this.isBinaryFile(file)) continue;

        const fileVulns = await this.scanFile(file);
        vulnerabilities.push(...fileVulns);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return vulnerabilities;
  }

  /**
   * Scan individual file for secrets
   */
  private async scanFile(filePath: string): Promise<SecretVulnerability[]> {
    const vulnerabilities: SecretVulnerability[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(this.projectRoot, filePath);

      for (const pattern of this.patterns) {
        const matches = content.matchAll(pattern.pattern);

        for (const match of matches) {
          if (!match.index) continue;

          const secret = match[1] || match[0];

          // Calculate entropy if threshold specified
          const entropy = this.calculateEntropy(secret);
          if (pattern.entropy_threshold && entropy < pattern.entropy_threshold) {
            continue;
          }

          // Find line number
          const beforeMatch = content.substring(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          const line = lines[lineNumber - 1];

          // Skip false positives
          if (this.isFalsePositive(line, secret)) continue;

          vulnerabilities.push({
            id: `${pattern.id}-${relativePath}-${lineNumber}`,
            severity: pattern.severity,
            category: 'secret',
            title: pattern.name,
            description: pattern.description,
            location: {
              file: relativePath,
              line: lineNumber,
              snippet: this.redactSecret(line.trim(), secret),
            },
            remediation: {
              suggestion: 'Remove secret and use environment variables',
              auto_fixable: false,
              references: [
                'https://12factor.net/config',
                'https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure',
              ],
            },
            detected_at: new Date(),
            secret_type: pattern.name,
            entropy,
          });
        }
      }
    } catch (error) {
      // Skip files that can't be processed
    }

    return vulnerabilities;
  }

  /**
   * Scan git history for secrets
   */
  private async scanGitHistory(): Promise<SecretVulnerability[]> {
    const vulnerabilities: SecretVulnerability[] = [];

    try {
      // Check if git repo exists
      if (!fs.existsSync(path.join(this.projectRoot, '.git'))) {
        return vulnerabilities;
      }

      // Get all commits
      const commits = execSync('git rev-list --all', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      })
        .trim()
        .split('\n')
        .slice(0, 100); // Limit to last 100 commits

      for (const commit of commits) {
        try {
          const diff = execSync(`git show ${commit}`, {
            cwd: this.projectRoot,
            encoding: 'utf-8',
          });

          for (const pattern of this.patterns) {
            const matches = diff.matchAll(pattern.pattern);

            for (const match of matches) {
              const secret = match[1] || match[0];
              const entropy = this.calculateEntropy(secret);

              if (pattern.entropy_threshold && entropy < pattern.entropy_threshold) {
                continue;
              }

              vulnerabilities.push({
                id: `${pattern.id}-git-${commit.substring(0, 8)}`,
                severity: pattern.severity,
                category: 'secret',
                title: `${pattern.name} in Git History`,
                description: `${pattern.description} (found in commit history)`,
                location: {
                  file: 'git-history',
                },
                remediation: {
                  suggestion: 'Remove secret from git history using git filter-branch or BFG Repo-Cleaner',
                  auto_fixable: false,
                  references: [
                    'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository',
                  ],
                },
                detected_at: new Date(),
                secret_type: pattern.name,
                entropy,
                commit_hash: commit,
              });
            }
          }
        } catch (error) {
          // Skip commits that can't be read
        }
      }
    } catch (error) {
      // Skip if git is not available
    }

    return vulnerabilities;
  }

  /**
   * Calculate Shannon entropy of a string
   */
  private calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies: Record<string, number> = {};

    for (const char of str) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    return Object.values(frequencies).reduce((entropy, count) => {
      const p = count / len;
      return entropy - p * Math.log2(p);
    }, 0);
  }

  /**
   * Check if detection is a false positive
   */
  private isFalsePositive(line: string, secret: string): boolean {
    // Skip example/test data
    if (line.includes('example') || line.includes('test') || line.includes('dummy')) {
      return true;
    }

    // Skip obvious placeholders
    const placeholders = [
      'xxx', 'yyy', 'zzz', 'your-', 'my-', 'placeholder',
      'replace-me', 'change-me', 'todo', 'fixme',
    ];

    const lowerSecret = secret.toLowerCase();
    if (placeholders.some(p => lowerSecret.includes(p))) {
      return true;
    }

    // Skip if it's a variable reference
    if (line.includes('process.env') || line.includes('config.')) {
      return true;
    }

    return false;
  }

  /**
   * Redact secret in snippet
   */
  private redactSecret(line: string, secret: string): string {
    return line.replace(secret, '*'.repeat(Math.min(secret.length, 20)));
  }

  /**
   * Check if file is binary
   */
  private isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll',
      '.so', '.dylib', '.bin', '.dat',
    ];

    const ext = path.extname(filePath).toLowerCase();
    return binaryExtensions.includes(ext);
  }
}
