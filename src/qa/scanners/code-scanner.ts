/**
 * Static Code Analysis Scanner
 * Detects OWASP Top 10 and security anti-patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeVulnerability, VulnerabilitySeverity } from '../types';
import { glob } from 'glob';

/**
 * Security rule definition
 */
interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: VulnerabilitySeverity;
  pattern: RegExp;
  owasp_category?: string;
  cwe?: string;
  remediation: string;
  fix_command?: string;
}

export class CodeScanner {
  private projectRoot: string;
  private rules: SecurityRule[];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.rules = this.initializeSecurityRules();
  }

  /**
   * Initialize security rules for code scanning
   */
  private initializeSecurityRules(): SecurityRule[] {
    return [
      // SQL Injection (OWASP A03:2021)
      {
        id: 'SQL-INJECTION-001',
        name: 'SQL Injection Risk',
        description: 'Direct string concatenation in SQL queries',
        severity: 'critical',
        pattern: /(?:execute|query|sql)\s*\(\s*[`'"].*?\$\{.*?\}.*?[`'"]\s*\)/gi,
        owasp_category: 'A03:2021 - Injection',
        cwe: 'CWE-89',
        remediation: 'Use parameterized queries or prepared statements',
        fix_command: 'Replace with db.query(sql, [params])',
      },
      {
        id: 'SQL-INJECTION-002',
        name: 'SQL Injection via String Concatenation',
        description: 'SQL query built with string concatenation',
        severity: 'critical',
        pattern: /(?:SELECT|INSERT|UPDATE|DELETE).*?\+.*?(?:req\.|params\.|query\.|body\.)/gi,
        owasp_category: 'A03:2021 - Injection',
        cwe: 'CWE-89',
        remediation: 'Use ORM or parameterized queries',
      },

      // XSS (OWASP A03:2021)
      {
        id: 'XSS-001',
        name: 'Cross-Site Scripting (XSS)',
        description: 'Unescaped user input in HTML',
        severity: 'high',
        pattern: /innerHTML\s*=\s*(?:req\.|params\.|query\.|body\.)|dangerouslySetInnerHTML/gi,
        owasp_category: 'A03:2021 - Injection',
        cwe: 'CWE-79',
        remediation: 'Sanitize user input and use textContent or safe templating',
      },

      // Command Injection (OWASP A03:2021)
      {
        id: 'CMD-INJECTION-001',
        name: 'Command Injection Risk',
        description: 'User input in shell command execution',
        severity: 'critical',
        pattern: /(?:exec|spawn|execSync|spawnSync)\s*\([^)]*(?:req\.|params\.|query\.|body\.)/gi,
        owasp_category: 'A03:2021 - Injection',
        cwe: 'CWE-78',
        remediation: 'Validate and sanitize input, use array form of spawn',
      },

      // Path Traversal (OWASP A01:2021)
      {
        id: 'PATH-TRAVERSAL-001',
        name: 'Path Traversal Vulnerability',
        description: 'User-controlled file path without validation',
        severity: 'high',
        pattern: /(?:readFile|writeFile|unlink|rmdir)\s*\([^)]*(?:req\.|params\.|query\.|body\.)/gi,
        owasp_category: 'A01:2021 - Broken Access Control',
        cwe: 'CWE-22',
        remediation: 'Validate and normalize file paths, use path.join() safely',
      },

      // Insecure Crypto (OWASP A02:2021)
      {
        id: 'CRYPTO-001',
        name: 'Weak Cryptographic Algorithm',
        description: 'Usage of weak or broken cryptographic algorithm',
        severity: 'high',
        pattern: /createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/gi,
        owasp_category: 'A02:2021 - Cryptographic Failures',
        cwe: 'CWE-327',
        remediation: 'Use SHA-256 or stronger algorithms',
        fix_command: 'Replace with crypto.createHash("sha256")',
      },
      {
        id: 'CRYPTO-002',
        name: 'Hardcoded Encryption Key',
        description: 'Encryption key or IV hardcoded in source',
        severity: 'critical',
        pattern: /(?:createCipheriv|createDecipheriv)\s*\([^)]*,\s*['"][^'"]{16,}['"]/gi,
        owasp_category: 'A02:2021 - Cryptographic Failures',
        cwe: 'CWE-321',
        remediation: 'Store encryption keys in secure environment variables',
      },

      // Authentication Issues (OWASP A07:2021)
      {
        id: 'AUTH-001',
        name: 'Missing Authentication Check',
        description: 'Sensitive operation without authentication',
        severity: 'critical',
        pattern: /router\.(?:put|post|delete)\s*\([^)]*\)\s*\.\s*(?!use\s*\(.*auth)/gi,
        owasp_category: 'A07:2021 - Authentication Failures',
        cwe: 'CWE-306',
        remediation: 'Add authentication middleware to protected routes',
      },
      {
        id: 'AUTH-002',
        name: 'Weak Password Requirements',
        description: 'Insufficient password complexity requirements',
        severity: 'medium',
        pattern: /password.*?\.length\s*[<>=]+\s*[1-7](?!\d)/gi,
        owasp_category: 'A07:2021 - Authentication Failures',
        cwe: 'CWE-521',
        remediation: 'Require passwords of at least 8 characters with complexity',
      },

      // Authorization Issues (OWASP A01:2021)
      {
        id: 'AUTHZ-001',
        name: 'Missing Authorization Check',
        description: 'Resource access without authorization validation',
        severity: 'high',
        pattern: /findById\s*\(.*?req\.params\.id\).*?(?!(?:req\.user|isOwner|checkPermission))/gi,
        owasp_category: 'A01:2021 - Broken Access Control',
        cwe: 'CWE-285',
        remediation: 'Verify user ownership or permissions before resource access',
      },

      // Insecure Deserialization (OWASP A08:2021)
      {
        id: 'DESERIAL-001',
        name: 'Unsafe Deserialization',
        description: 'Deserialization of untrusted data',
        severity: 'high',
        pattern: /(?:eval|Function)\s*\(|JSON\.parse\s*\((?:req\.|params\.|query\.)/gi,
        owasp_category: 'A08:2021 - Software and Data Integrity Failures',
        cwe: 'CWE-502',
        remediation: 'Validate and sanitize input before deserialization',
      },

      // Security Misconfiguration (OWASP A05:2021)
      {
        id: 'CONFIG-001',
        name: 'Debug Mode Enabled',
        description: 'Debug or development mode in production',
        severity: 'medium',
        pattern: /(?:DEBUG|NODE_ENV)\s*=\s*['"](?:true|development)['"]/gi,
        owasp_category: 'A05:2021 - Security Misconfiguration',
        cwe: 'CWE-489',
        remediation: 'Disable debug mode in production',
      },
      {
        id: 'CONFIG-002',
        name: 'CORS Misconfiguration',
        description: 'Overly permissive CORS configuration',
        severity: 'medium',
        pattern: /cors\s*\(\s*\{\s*origin:\s*['"]?\*['"]?/gi,
        owasp_category: 'A05:2021 - Security Misconfiguration',
        cwe: 'CWE-942',
        remediation: 'Restrict CORS to specific trusted origins',
      },

      // Logging Sensitive Data (OWASP A09:2021)
      {
        id: 'LOG-001',
        name: 'Sensitive Data in Logs',
        description: 'Logging of sensitive information',
        severity: 'medium',
        pattern: /console\.log\s*\([^)]*(?:password|token|secret|key|credential)/gi,
        owasp_category: 'A09:2021 - Security Logging Failures',
        cwe: 'CWE-532',
        remediation: 'Remove or redact sensitive data from logs',
      },

      // Regular Expression DoS
      {
        id: 'REDOS-001',
        name: 'Regular Expression Denial of Service',
        description: 'Potentially catastrophic backtracking in regex',
        severity: 'medium',
        pattern: /new RegExp\s*\([^)]*\([^)]*\+[^)]*\)/gi,
        owasp_category: 'A06:2021 - Vulnerable Components',
        cwe: 'CWE-1333',
        remediation: 'Simplify regex pattern or add input length limits',
      },

      // Prototype Pollution
      {
        id: 'PROTO-001',
        name: 'Prototype Pollution Risk',
        description: 'Unsafe property assignment that may pollute prototype',
        severity: 'high',
        pattern: /\[(?:req\.|params\.|query\.|body\.)[^\]]+\]\s*=/gi,
        owasp_category: 'A03:2021 - Injection',
        cwe: 'CWE-1321',
        remediation: 'Use Object.create(null) or validate property names',
      },
    ];
  }

  /**
   * Scan code files for security vulnerabilities
   */
  async scan(excludePatterns: string[] = []): Promise<CodeVulnerability[]> {
    const vulnerabilities: CodeVulnerability[] = [];

    // Find all code files
    const patterns = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'];
    const defaultExcludes = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.*',
      '**/*.spec.*',
      ...excludePatterns,
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: defaultExcludes,
        absolute: true,
      });

      for (const file of files) {
        const fileVulns = await this.scanFile(file);
        vulnerabilities.push(...fileVulns);
      }
    }

    return vulnerabilities;
  }

  /**
   * Scan individual file for vulnerabilities
   */
  private async scanFile(filePath: string): Promise<CodeVulnerability[]> {
    const vulnerabilities: CodeVulnerability[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(this.projectRoot, filePath);

      for (const rule of this.rules) {
        const matches = content.matchAll(rule.pattern);

        for (const match of matches) {
          if (!match.index) continue;

          // Find line number
          const beforeMatch = content.substring(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          const line = lines[lineNumber - 1];

          // Skip if in comments
          if (this.isInComment(line, match[0])) continue;

          vulnerabilities.push({
            id: `${rule.id}-${relativePath}-${lineNumber}`,
            severity: rule.severity,
            category: 'code',
            title: rule.name,
            description: rule.description,
            location: {
              file: relativePath,
              line: lineNumber,
              snippet: line.trim(),
            },
            cwe: rule.cwe,
            owasp_category: rule.owasp_category,
            remediation: {
              suggestion: rule.remediation,
              auto_fixable: false,
              fix_command: rule.fix_command,
            },
            detected_at: new Date(),
            rule_id: rule.id,
            pattern: rule.pattern.source,
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
    }

    return vulnerabilities;
  }

  /**
   * Check if match is within a comment
   */
  private isInComment(line: string, match: string): boolean {
    const matchIndex = line.indexOf(match);
    const beforeMatch = line.substring(0, matchIndex);

    // Check for single-line comments
    if (beforeMatch.includes('//')) return true;

    // Check for multi-line comments
    if (beforeMatch.includes('/*') && !beforeMatch.includes('*/')) return true;

    return false;
  }
}
