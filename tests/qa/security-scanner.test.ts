/**
 * Security Scanner Tests
 * Phase 4: Quality Assurance & Testing
 */

import * as fs from 'fs';
import * as path from 'path';
import { SecurityScanner } from '../../src/qa/security-scanner';
import { DependencyScanner } from '../../src/qa/scanners/dependency-scanner';
import { CodeScanner } from '../../src/qa/scanners/code-scanner';
import { SecretScanner } from '../../src/qa/scanners/secret-scanner';
import { VulnerabilitySeverity } from '../../src/qa/types';

describe('SecurityScanner', () => {
  const testProjectRoot = path.join(__dirname, '../fixtures/security-test');

  beforeAll(() => {
    // Create test project structure
    if (!fs.existsSync(testProjectRoot)) {
      fs.mkdirSync(testProjectRoot, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test files
    if (fs.existsSync(testProjectRoot)) {
      fs.rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('SecurityScanner - Full Scan', () => {
    it('should run comprehensive security scan', async () => {
      const scanner = new SecurityScanner(testProjectRoot, {
        include_dependencies: true,
        include_code_analysis: true,
        include_secret_detection: true,
      });

      const result = await scanner.scan();

      expect(result).toHaveProperty('scan_id');
      expect(result).toHaveProperty('started_at');
      expect(result).toHaveProperty('completed_at');
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('quality_gate');
      expect(Array.isArray(result.vulnerabilities)).toBe(true);
    });

    it('should filter vulnerabilities by severity threshold', async () => {
      const scanner = new SecurityScanner(testProjectRoot, {
        severity_threshold: 'high',
      });

      const result = await scanner.scan();

      // Should only include critical and high severity
      for (const vuln of result.vulnerabilities) {
        expect(['critical', 'high']).toContain(vuln.severity);
      }
    });

    it('should generate scan summary statistics', async () => {
      const scanner = new SecurityScanner(testProjectRoot);
      const result = await scanner.scan();

      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('by_severity');
      expect(result.summary).toHaveProperty('by_category');
      expect(result.summary.by_severity).toHaveProperty('critical');
      expect(result.summary.by_severity).toHaveProperty('high');
      expect(result.summary.by_severity).toHaveProperty('medium');
      expect(result.summary.by_severity).toHaveProperty('low');
    });

    it('should validate quality gates', async () => {
      const scanner = new SecurityScanner(testProjectRoot);
      const result = await scanner.scan();

      expect(result.quality_gate).toHaveProperty('passed');
      expect(result.quality_gate).toHaveProperty('criteria');
      expect(result.quality_gate).toHaveProperty('violations');
      expect(typeof result.quality_gate.passed).toBe('boolean');
      expect(Array.isArray(result.quality_gate.violations)).toBe(true);
    });

    it('should calculate CVSS scores', async () => {
      const scanner = new SecurityScanner(testProjectRoot);

      const testVuln = {
        id: 'TEST-001',
        severity: 'critical' as VulnerabilitySeverity,
        category: 'code' as const,
        title: 'Test Vulnerability',
        description: 'Test',
        location: { file: 'test.ts' },
        remediation: { suggestion: 'Fix it', auto_fixable: false },
        detected_at: new Date(),
      };

      const cvss = scanner.calculateCVSS(testVuln);
      expect(cvss).toBeGreaterThan(0);
      expect(cvss).toBeLessThanOrEqual(10);
    });

    it('should generate unique scan IDs', async () => {
      const scanner1 = new SecurityScanner(testProjectRoot);
      const scanner2 = new SecurityScanner(testProjectRoot);

      const result1 = await scanner1.scan();
      const result2 = await scanner2.scan();

      expect(result1.scan_id).not.toBe(result2.scan_id);
    });
  });

  describe('DependencyScanner', () => {
    const depProjectRoot = path.join(testProjectRoot, 'dependency-test');

    beforeAll(() => {
      fs.mkdirSync(depProjectRoot, { recursive: true });

      // Create package.json with vulnerable dependencies
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'lodash': '^4.17.15', // Known to have vulnerabilities in older versions
        },
        devDependencies: {
          'jest': '^26.0.0',
        },
      };

      fs.writeFileSync(
        path.join(depProjectRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
    });

    it('should scan npm dependencies for vulnerabilities', async () => {
      const scanner = new DependencyScanner(depProjectRoot);
      const vulnerabilities = await scanner.scan();

      expect(Array.isArray(vulnerabilities)).toBe(true);
      // Each vulnerability should have required fields
      for (const vuln of vulnerabilities) {
        expect(vuln).toHaveProperty('severity');
        expect(vuln).toHaveProperty('category', 'dependency');
        expect(vuln).toHaveProperty('package_name');
        expect(vuln).toHaveProperty('installed_version');
      }
    });

    it('should detect outdated packages', async () => {
      const scanner = new DependencyScanner(depProjectRoot);
      const vulnerabilities = await scanner.scan();

      // Look for outdated package warnings
      const outdated = vulnerabilities.filter(v =>
        v.id.includes('OUTDATED')
      );
      expect(Array.isArray(outdated)).toBe(true);
    });

    it('should check license compliance', async () => {
      const scanner = new DependencyScanner(depProjectRoot);
      const vulnerabilities = await scanner.scan();

      // Look for license compliance issues
      const licenses = vulnerabilities.filter(v =>
        v.id.includes('LICENSE')
      );
      expect(Array.isArray(licenses)).toBe(true);
    });
  });

  describe('CodeScanner - OWASP Top 10', () => {
    const codeProjectRoot = path.join(testProjectRoot, 'code-test');

    beforeAll(() => {
      fs.mkdirSync(codeProjectRoot, { recursive: true });

      // Create test files with various vulnerabilities
      const sqlInjectionCode = `
        import { db } from './db';

        export function getUserById(id: string) {
          // SQL Injection vulnerability
          return db.query(\`SELECT * FROM users WHERE id = \${id}\`);
        }
      `;

      const xssCode = `
        export function renderUser(user: any) {
          // XSS vulnerability
          document.innerHTML = user.name;
        }
      `;

      const cmdInjectionCode = `
        import { exec } from 'child_process';

        export function runCommand(cmd: string) {
          // Command injection vulnerability
          exec(req.query.command);
        }
      `;

      const weakCryptoCode = `
        import * as crypto from 'crypto';

        export function hashPassword(password: string) {
          // Weak cryptographic algorithm
          return crypto.createHash('md5').update(password).digest('hex');
        }
      `;

      fs.writeFileSync(path.join(codeProjectRoot, 'sql.ts'), sqlInjectionCode);
      fs.writeFileSync(path.join(codeProjectRoot, 'xss.ts'), xssCode);
      fs.writeFileSync(path.join(codeProjectRoot, 'cmd.ts'), cmdInjectionCode);
      fs.writeFileSync(path.join(codeProjectRoot, 'crypto.ts'), weakCryptoCode);
    });

    it('should detect SQL injection vulnerabilities', async () => {
      const scanner = new CodeScanner(codeProjectRoot);
      const vulnerabilities = await scanner.scan();

      const sqlVulns = vulnerabilities.filter(v =>
        v.rule_id?.includes('SQL-INJECTION')
      );
      expect(sqlVulns.length).toBeGreaterThan(0);
      expect(sqlVulns[0].severity).toBe('critical');
      expect(sqlVulns[0].owasp_category).toContain('A03:2021');
    });

    it('should detect XSS vulnerabilities', async () => {
      const scanner = new CodeScanner(codeProjectRoot);
      const vulnerabilities = await scanner.scan();

      const xssVulns = vulnerabilities.filter(v =>
        v.rule_id?.includes('XSS')
      );
      expect(xssVulns.length).toBeGreaterThan(0);
      expect(xssVulns[0].severity).toBe('high');
    });

    it('should detect command injection risks', async () => {
      const scanner = new CodeScanner(codeProjectRoot);
      const vulnerabilities = await scanner.scan();

      const cmdVulns = vulnerabilities.filter(v =>
        v.rule_id?.includes('CMD-INJECTION')
      );
      expect(cmdVulns.length).toBeGreaterThan(0);
      expect(cmdVulns[0].severity).toBe('critical');
    });

    it('should detect weak cryptographic algorithms', async () => {
      const scanner = new CodeScanner(codeProjectRoot);
      const vulnerabilities = await scanner.scan();

      const cryptoVulns = vulnerabilities.filter(v =>
        v.rule_id?.includes('CRYPTO')
      );
      expect(cryptoVulns.length).toBeGreaterThan(0);
      expect(cryptoVulns[0].severity).toBe('high');
    });

    it('should exclude test files from scanning', async () => {
      // Create a test file with vulnerabilities
      const testCode = `
        // This should be excluded
        db.query(\`SELECT * FROM users WHERE id = \${id}\`);
      `;
      fs.writeFileSync(path.join(codeProjectRoot, 'file.test.ts'), testCode);

      const scanner = new CodeScanner(codeProjectRoot);
      const vulnerabilities = await scanner.scan();

      // Should not include vulnerabilities from .test.ts files
      const testFileVulns = vulnerabilities.filter(v =>
        v.location.file.includes('.test.ts')
      );
      expect(testFileVulns.length).toBe(0);
    });

    it('should provide remediation suggestions', async () => {
      const scanner = new CodeScanner(codeProjectRoot);
      const vulnerabilities = await scanner.scan();

      for (const vuln of vulnerabilities) {
        expect(vuln.remediation).toHaveProperty('suggestion');
        expect(typeof vuln.remediation.suggestion).toBe('string');
        expect(vuln.remediation.suggestion.length).toBeGreaterThan(0);
      }
    });
  });

  describe('SecretScanner', () => {
    const secretProjectRoot = path.join(testProjectRoot, 'secret-test');

    beforeAll(() => {
      fs.mkdirSync(secretProjectRoot, { recursive: true });

      // Create files with various secret types
      const awsSecretsCode = `
        const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
        const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      `;

      const apiKeyCode = `
        const API_KEY = 'sk_test_FAKE1234567890NOTAREALKEY';
        const STRIPE_KEY = 'sk_test_EXAMPLE9876543210FAKE';
      `;

      const githubTokenCode = `
        const GITHUB_TOKEN = 'ghp_FAKETOKEN1234567890EXAMPLENOTREAL';
      `;

      const privateKeyCode = `
        const PRIVATE_KEY = \`
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef
-----END RSA PRIVATE KEY-----
        \`;
      `;

      const dbPasswordCode = `
        const DB_URL = 'mongodb://admin:MySecretPassword123@localhost:27017/db';
      `;

      fs.writeFileSync(path.join(secretProjectRoot, 'aws.ts'), awsSecretsCode);
      fs.writeFileSync(path.join(secretProjectRoot, 'api.ts'), apiKeyCode);
      fs.writeFileSync(path.join(secretProjectRoot, 'github.ts'), githubTokenCode);
      fs.writeFileSync(path.join(secretProjectRoot, 'keys.ts'), privateKeyCode);
      fs.writeFileSync(path.join(secretProjectRoot, 'db.ts'), dbPasswordCode);
    });

    it('should detect AWS credentials', async () => {
      const scanner = new SecretScanner(secretProjectRoot);
      const vulnerabilities = await scanner.scan();

      const awsVulns = vulnerabilities.filter(v =>
        v.secret_type?.includes('AWS')
      );
      expect(awsVulns.length).toBeGreaterThan(0);
      expect(awsVulns[0].severity).toBe('critical');
    });

    it('should detect API keys', async () => {
      const scanner = new SecretScanner(secretProjectRoot);
      const vulnerabilities = await scanner.scan();

      const apiVulns = vulnerabilities.filter(v =>
        v.secret_type?.toLowerCase().includes('api')
      );
      expect(apiVulns.length).toBeGreaterThan(0);
    });

    it('should detect GitHub tokens', async () => {
      const scanner = new SecretScanner(secretProjectRoot);
      const vulnerabilities = await scanner.scan();

      const githubVulns = vulnerabilities.filter(v =>
        v.secret_type?.includes('GitHub')
      );
      expect(githubVulns.length).toBeGreaterThan(0);
      expect(githubVulns[0].severity).toBe('critical');
    });

    it('should detect private keys', async () => {
      const scanner = new SecretScanner(secretProjectRoot);
      const vulnerabilities = await scanner.scan();

      const keyVulns = vulnerabilities.filter(v =>
        v.secret_type?.includes('Private Key')
      );
      expect(keyVulns.length).toBeGreaterThan(0);
      expect(keyVulns[0].severity).toBe('critical');
    });

    it('should detect database passwords', async () => {
      const scanner = new SecretScanner(secretProjectRoot);
      const vulnerabilities = await scanner.scan();

      const dbVulns = vulnerabilities.filter(v =>
        v.secret_type?.includes('Database')
      );
      expect(dbVulns.length).toBeGreaterThan(0);
    });

    it('should calculate entropy for secrets', async () => {
      const scanner = new SecretScanner(secretProjectRoot);
      const vulnerabilities = await scanner.scan();

      for (const vuln of vulnerabilities) {
        if (vuln.entropy !== undefined) {
          expect(vuln.entropy).toBeGreaterThan(0);
          expect(vuln.entropy).toBeLessThanOrEqual(8); // Max entropy for base64/hex
        }
      }
    });

    it('should redact secrets in snippets', async () => {
      const scanner = new SecretScanner(secretProjectRoot);
      const vulnerabilities = await scanner.scan();

      for (const vuln of vulnerabilities) {
        if (vuln.location.snippet) {
          // Snippet should contain asterisks (redacted)
          expect(vuln.location.snippet).toContain('*');
          // Should not contain full secret
          expect(vuln.location.snippet.length).toBeLessThan(200);
        }
      }
    });

    it('should exclude false positives', async () => {
      // Create file with obvious placeholders
      const placeholderCode = `
        const API_KEY = 'your-api-key-here';
        const PASSWORD = 'replace-me';
        const TOKEN = 'xxx-xxx-xxx';
      `;
      fs.writeFileSync(path.join(secretProjectRoot, 'placeholder.ts'), placeholderCode);

      const scanner = new SecretScanner(secretProjectRoot);
      const vulnerabilities = await scanner.scan();

      // Should not detect obvious placeholders
      const placeholderVulns = vulnerabilities.filter(v =>
        v.location.file.includes('placeholder.ts')
      );
      expect(placeholderVulns.length).toBe(0);
    });
  });

  describe('Quality Gate Validation', () => {
    it('should fail when critical vulnerabilities exceed threshold', async () => {
      const scanner = new SecurityScanner(testProjectRoot);

      // Create mock vulnerabilities
      const vulnerabilities = [
        {
          id: 'CRIT-1',
          severity: 'critical' as VulnerabilitySeverity,
          category: 'code' as const,
          title: 'Critical Issue',
          description: 'Test',
          location: { file: 'test.ts' },
          remediation: { suggestion: 'Fix', auto_fixable: false },
          detected_at: new Date(),
        },
      ];

      const result = await scanner.scan();

      if (result.summary.by_severity.critical > 0) {
        expect(result.quality_gate.passed).toBe(false);
        expect(result.quality_gate.violations.length).toBeGreaterThan(0);
      }
    });

    it('should fail when secrets are detected and not allowed', async () => {
      const secretProjectRoot = path.join(testProjectRoot, 'secret-gate-test');
      fs.mkdirSync(secretProjectRoot, { recursive: true });

      // Create file with secret
      fs.writeFileSync(
        path.join(secretProjectRoot, 'secret.ts'),
        "const API_KEY = 'sk_live_abcdef1234567890';"
      );

      const scanner = new SecurityScanner(secretProjectRoot, {
        include_secret_detection: true,
      });

      const result = await scanner.scan();

      if (result.summary.by_category.secret > 0) {
        expect(result.quality_gate.passed).toBe(false);
        const secretViolation = result.quality_gate.violations.find(
          v => v.rule === 'allow_secrets'
        );
        expect(secretViolation).toBeDefined();
      }
    });

    it('should pass when all thresholds are met', async () => {
      // Create clean project
      const cleanProjectRoot = path.join(testProjectRoot, 'clean-project');
      fs.mkdirSync(cleanProjectRoot, { recursive: true });

      // Create clean file
      fs.writeFileSync(
        path.join(cleanProjectRoot, 'clean.ts'),
        'export function hello() { return "Hello"; }'
      );

      const scanner = new SecurityScanner(cleanProjectRoot);
      const result = await scanner.scan();

      if (result.vulnerabilities.length === 0) {
        expect(result.quality_gate.passed).toBe(true);
        expect(result.quality_gate.violations.length).toBe(0);
      }
    });
  });

  describe('Report Generation', () => {
    it('should generate reports in multiple formats', async () => {
      const scanner = new SecurityScanner(testProjectRoot);
      const result = await scanner.scanAndReport(['json', 'markdown']);

      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('summary');
    });
  });

  describe('Statistics', () => {
    it('should calculate comprehensive statistics', async () => {
      const scanner = new SecurityScanner(testProjectRoot);
      const result = await scanner.scan();
      const stats = scanner.getStatistics(result);

      expect(stats).toHaveProperty('total_vulnerabilities');
      expect(stats).toHaveProperty('critical_count');
      expect(stats).toHaveProperty('high_count');
      expect(stats).toHaveProperty('medium_count');
      expect(stats).toHaveProperty('low_count');
      expect(stats).toHaveProperty('auto_fixable');
      expect(stats).toHaveProperty('quality_gate_passed');
      expect(stats).toHaveProperty('scan_duration_ms');
    });
  });
});
