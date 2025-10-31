# Security Scanner - Phase 4 Documentation

## Overview

The Security Scanner is a comprehensive vulnerability detection system for Task Sentinel Phase 4, implementing OWASP Top 10 checks, dependency scanning, secret detection, and SAST (Static Application Security Testing).

## Architecture

```
SecurityScanner (Main Orchestrator)
├── DependencyScanner
│   ├── npm audit integration
│   ├── Outdated package detection
│   └── License compliance checker
├── CodeScanner (OWASP Top 10)
│   ├── SQL Injection (A03:2021)
│   ├── XSS Detection (A03:2021)
│   ├── Command Injection (A03:2021)
│   ├── Path Traversal (A01:2021)
│   ├── Cryptographic Failures (A02:2021)
│   ├── Authentication Issues (A07:2021)
│   ├── Authorization Issues (A01:2021)
│   ├── Deserialization (A08:2021)
│   ├── Security Misconfiguration (A05:2021)
│   └── Logging Failures (A09:2021)
├── SecretScanner
│   ├── AWS Credentials
│   ├── API Keys
│   ├── GitHub Tokens
│   ├── Private Keys
│   ├── Database Passwords
│   └── Git History Scanning
└── ReportGenerator
    ├── JSON Reports
    ├── HTML Reports
    ├── SARIF (GitHub Code Scanning)
    └── Markdown Reports
```

## Features

### 1. Multi-Layer Security Scanning

- **Layer 1: Dependency Vulnerabilities**
  - npm audit integration
  - CVE database lookup
  - Outdated package detection
  - License compliance checking

- **Layer 2: Static Code Analysis (SAST)**
  - OWASP Top 10 detection
  - CWE (Common Weakness Enumeration) mapping
  - CVSS score calculation
  - Auto-fix suggestions

- **Layer 3: Secret Detection**
  - Pattern-based detection
  - Entropy calculation
  - Git history scanning
  - False positive filtering

### 2. OWASP Top 10 Coverage

#### A01:2021 - Broken Access Control
- Missing authorization checks
- Path traversal vulnerabilities
- Insecure direct object references

#### A02:2021 - Cryptographic Failures
- Weak cryptographic algorithms (MD5, SHA-1)
- Hardcoded encryption keys
- Insecure random number generation

#### A03:2021 - Injection
- SQL injection (string concatenation, template literals)
- XSS (innerHTML, dangerouslySetInnerHTML)
- Command injection (exec, spawn with user input)
- Prototype pollution

#### A05:2021 - Security Misconfiguration
- Debug mode in production
- CORS misconfiguration
- Exposed error messages

#### A07:2021 - Authentication Failures
- Missing authentication middleware
- Weak password requirements
- Insecure session management

#### A08:2021 - Software and Data Integrity Failures
- Unsafe deserialization
- eval() usage
- Dynamic code execution

#### A09:2021 - Security Logging Failures
- Sensitive data in logs
- Missing security event logging

### 3. Secret Detection Patterns

#### AWS Credentials
```typescript
// Detected patterns:
- AKIA[A-Z0-9]{16}  // Access Key ID
- aws_secret_access_key = [A-Za-z0-9/+=]{40}
```

#### API Keys
```typescript
// Detected patterns:
- api_key = [A-Za-z0-9_\-]{20,}
- sk_live_[A-Za-z0-9]{24,}  // Stripe
- xox[baprs]-[0-9-A-Za-z]+  // Slack
```

#### GitHub Tokens
```typescript
// Detected patterns:
- ghp_[A-Za-z0-9_]{36}  // Personal Access Token
- gho_[A-Za-z0-9_]{36}  // OAuth Token
```

#### Private Keys
```typescript
// Detected patterns:
- -----BEGIN RSA PRIVATE KEY-----
- -----BEGIN OPENSSH PRIVATE KEY-----
- -----BEGIN EC PRIVATE KEY-----
```

### 4. Quality Gates

```typescript
interface QualityGateCriteria {
  max_critical: 0,        // No critical vulnerabilities allowed
  max_high: 5,            // Max 5 high severity
  max_medium: 20,         // Max 20 medium severity
  max_low: 50,            // Max 50 low severity
  allow_secrets: false,   // No hardcoded secrets
  require_dependency_fixes: true  // Must fix available updates
}
```

## Usage

### Basic Usage

```typescript
import { SecurityScanner } from './qa/security-scanner';

// Initialize scanner
const scanner = new SecurityScanner('/path/to/project', {
  include_dependencies: true,
  include_code_analysis: true,
  include_secret_detection: true,
  severity_threshold: 'low',
});

// Run comprehensive scan
const result = await scanner.scan();

console.log(`Found ${result.summary.total} vulnerabilities`);
console.log(`Critical: ${result.summary.by_severity.critical}`);
console.log(`Quality Gate: ${result.quality_gate.passed ? 'PASSED' : 'FAILED'}`);
```

### Advanced Configuration

```typescript
import { SecurityScanner, ScanConfig } from './qa/security-scanner';

const config: ScanConfig = {
  include_dependencies: true,
  include_code_analysis: true,
  include_secret_detection: true,
  scan_git_history: true,  // Scan git history for secrets
  max_file_size: 1024 * 1024,  // 1MB max file size
  exclude_patterns: [
    '**/test/**',
    '**/fixtures/**',
    '**/*.min.js',
  ],
  severity_threshold: 'medium',  // Only report medium and above
};

const scanner = new SecurityScanner('/path/to/project', config);
const result = await scanner.scan();
```

### Generate Reports

```typescript
// Generate multiple report formats
const result = await scanner.scanAndReport([
  'json',      // JSON format
  'html',      // HTML report
  'sarif',     // GitHub Code Scanning format
  'markdown',  // Markdown documentation
]);

// Reports saved to:
// - security-reports/scan-{id}.json
// - security-reports/scan-{id}.html
// - security-reports/scan-{id}.sarif
// - security-reports/scan-{id}.md
```

### CI/CD Integration

```typescript
// In your CI/CD pipeline
import { SecurityScanner } from './qa/security-scanner';

const scanner = new SecurityScanner(process.cwd());
const result = await scanner.scan();

// Exit with error code if quality gate fails
if (!result.quality_gate.passed) {
  console.error('Security quality gate failed!');
  for (const violation of result.quality_gate.violations) {
    console.error(`- ${violation.message}`);
  }
  process.exit(1);
}

console.log('✅ Security scan passed!');
```

## Vulnerability Types

### DependencyVulnerability

```typescript
interface DependencyVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'dependency';
  title: string;
  description: string;
  location: { file: string };
  cve?: string;               // CVE identifier
  cwe?: string;               // CWE identifier
  cvss_score?: number;        // CVSS score (0-10)
  cvss_vector?: string;       // CVSS vector string
  remediation: {
    suggestion: string;
    auto_fixable: boolean;
    fix_command?: string;
    references?: string[];
  };
  detected_at: Date;
  package_name: string;
  installed_version: string;
  fixed_version?: string;
  dependency_path: string[];
}
```

### CodeVulnerability

```typescript
interface CodeVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'code';
  title: string;
  description: string;
  location: {
    file: string;
    line: number;
    column?: number;
    snippet: string;
  };
  rule_id: string;            // Security rule identifier
  owasp_category?: string;    // OWASP Top 10 category
  pattern: string;            // Regex pattern that matched
  cwe?: string;
  remediation: {
    suggestion: string;
    auto_fixable: boolean;
    fix_command?: string;
  };
  detected_at: Date;
}
```

### SecretVulnerability

```typescript
interface SecretVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'secret';
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    snippet: string;  // Redacted snippet
  };
  secret_type: string;        // Type of secret (API Key, AWS, etc.)
  entropy?: number;           // Shannon entropy (0-8)
  commit_hash?: string;       // Git commit if found in history
  remediation: {
    suggestion: string;
    auto_fixable: boolean;
    references: string[];
  };
  detected_at: Date;
}
```

## Scan Results

```typescript
interface ScanResult {
  scan_id: string;
  started_at: Date;
  completed_at: Date;
  duration_ms: number;
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    by_category: {
      dependency: number;
      code: number;
      secret: number;
      config: number;
    };
  };
  quality_gate: {
    passed: boolean;
    criteria: QualityGateCriteria;
    violations: QualityGateViolation[];
  };
}
```

## Best Practices

### 1. Integrate Early in Development

```typescript
// Run on every commit
git add .pre-commit-hook.js

// .pre-commit-hook.js
const { SecurityScanner } = require('./qa/security-scanner');

async function preCommitScan() {
  const scanner = new SecurityScanner(process.cwd(), {
    severity_threshold: 'critical',  // Only block on critical
  });

  const result = await scanner.scan();

  if (result.summary.by_severity.critical > 0) {
    console.error('❌ Critical security issues found!');
    process.exit(1);
  }
}

preCommitScan();
```

### 2. Configure for Your Environment

```typescript
// Development: Scan everything
const devConfig = {
  include_dependencies: true,
  include_code_analysis: true,
  include_secret_detection: true,
  scan_git_history: true,
  severity_threshold: 'low',
};

// Production CI: Focus on critical issues
const ciConfig = {
  include_dependencies: true,
  include_code_analysis: true,
  include_secret_detection: true,
  scan_git_history: false,  // Skip for speed
  severity_threshold: 'high',  // Only high/critical
};
```

### 3. Use Exclusion Patterns

```typescript
const config = {
  exclude_patterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/fixtures/**',
    '**/*.min.js',
    '**/coverage/**',
  ],
};
```

### 4. Monitor Trends

```typescript
// Track security trends over time
const scanner = new SecurityScanner(process.cwd());
const result = await scanner.scan();

// Store results for trend analysis
await storeScanResult({
  timestamp: new Date(),
  critical: result.summary.by_severity.critical,
  high: result.summary.by_severity.high,
  medium: result.summary.by_severity.medium,
  low: result.summary.by_severity.low,
  quality_gate_passed: result.quality_gate.passed,
});
```

## GitHub Integration

### SARIF Report Format

```typescript
// Generate SARIF for GitHub Code Scanning
const result = await scanner.scanAndReport(['sarif']);

// Upload to GitHub
// .github/workflows/security.yml
- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: security-reports/scan-*.sarif
```

### Security Alerts

SARIF reports automatically create:
- Code scanning alerts
- Pull request annotations
- Security dashboard entries

## Performance

### Scan Performance

```typescript
// Typical scan times
- Dependencies: 2-5 seconds
- Code Analysis: 5-15 seconds (depending on codebase size)
- Secret Detection: 3-10 seconds
- Git History: 10-30 seconds (optional)

Total: 10-60 seconds for comprehensive scan
```

### Optimization Tips

1. **Use Severity Threshold**: Filter early to reduce processing
2. **Skip Git History**: Only scan when necessary
3. **Exclude Patterns**: Skip node_modules and build artifacts
4. **Parallel Processing**: Scanners run concurrently
5. **Cache Results**: Store and reuse dependency scan results

## Troubleshooting

### Common Issues

#### 1. npm audit fails

```typescript
// Check npm is installed and package.json exists
if (!fs.existsSync('package.json')) {
  console.warn('No package.json found, skipping dependency scan');
}
```

#### 2. Too many false positives

```typescript
// Adjust severity threshold or exclude patterns
const config = {
  severity_threshold: 'high',  // Only show high/critical
  exclude_patterns: ['**/test/**'],  // Skip test files
};
```

#### 3. Git history scan is slow

```typescript
// Limit commit depth
const config = {
  scan_git_history: true,
  git_commit_depth: 100,  // Only scan last 100 commits
};
```

## API Reference

### SecurityScanner

#### Constructor
```typescript
constructor(projectRoot: string, config?: ScanConfig)
```

#### Methods
```typescript
// Run comprehensive scan
async scan(): Promise<ScanResult>

// Scan and generate reports
async scanAndReport(formats: ReportFormat[]): Promise<ScanResult>

// Calculate CVSS score
calculateCVSS(vulnerability: Vulnerability): number

// Get statistics
getStatistics(result: ScanResult): Statistics
```

### DependencyScanner

```typescript
constructor(projectRoot: string)
async scan(): Promise<DependencyVulnerability[]>
```

### CodeScanner

```typescript
constructor(projectRoot: string)
async scan(excludePatterns?: string[]): Promise<CodeVulnerability[]>
```

### SecretScanner

```typescript
constructor(projectRoot: string)
async scan(scanGitHistory?: boolean): Promise<SecretVulnerability[]>
```

## Example Output

```
🔍 Starting security scan...
Scan ID: scan-m5h8k2p-a7f3d9e4

📦 Scanning dependencies...
Found 2 dependency vulnerabilities

🔎 Analyzing code...
Found 5 code vulnerabilities

🔐 Detecting secrets...
Found 1 secret exposures

✅ Security scan complete
Duration: 12,345ms
Total vulnerabilities: 8
Quality gate: FAILED

Summary:
  Critical: 1
  High: 2
  Medium: 3
  Low: 2

Quality Gate Violations:
  - Found 1 critical vulnerabilities (max: 0)
  - Found 1 exposed secrets (allowed: 0)

Reports generated:
  JSON: security-reports/scan-m5h8k2p-a7f3d9e4.json
  HTML: security-reports/scan-m5h8k2p-a7f3d9e4.html
  SARIF: security-reports/scan-m5h8k2p-a7f3d9e4.sarif
```

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Database](https://cwe.mitre.org/)
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)
- [SARIF Specification](https://sarifweb.azurewebsites.net/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/task-sentinel/issues
- Documentation: /docs/qa/
- Examples: /examples/qa-usage.ts
