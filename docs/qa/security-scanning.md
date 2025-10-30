# Security Scanning Guide

Comprehensive guide to security scanning in Task Sentinel Phase 4.

## Table of Contents

1. [Overview](#overview)
2. [Security Layers](#security-layers)
3. [Vulnerability Classification](#vulnerability-classification)
4. [Scanning Tools](#scanning-tools)
5. [Remediation Workflow](#remediation-workflow)
6. [Compliance](#compliance)
7. [Best Practices](#best-practices)

## Overview

Task Sentinel implements a multi-layer security scanning approach that combines SAST (Static Application Security Testing), dependency analysis, secret detection, and OWASP compliance checking.

### Security Philosophy

**Shift-Left Security:** Integrate security early in development

1. **Scan Early:** Every commit, every PR
2. **Fail Fast:** Block critical vulnerabilities immediately
3. **Educate:** Provide clear remediation guidance
4. **Automate:** Minimal manual intervention

### Scanning Layers

```
┌─────────────────────────────────────┐
│  Layer 1: Dependency Analysis       │
│  (npm audit, Snyk, OSV Scanner)    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Layer 2: Static Analysis (SAST)   │
│  (Semgrep, ESLint Security)         │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Layer 3: Secret Detection          │
│  (TruffleHog, detect-secrets)       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Layer 4: OWASP Top 10 Checks       │
│  (Custom rules, Security headers)   │
└─────────────────────────────────────┘
```

## Security Layers

### Layer 1: Dependency Analysis

Scans project dependencies for known vulnerabilities.

#### Tools Used

**npm audit (Default)**
```bash
npm audit --json --audit-level=moderate
```

**Snyk (Optional)**
```bash
snyk test --json
```

**OSV Scanner (Optional)**
```bash
osv-scanner --json ./package-lock.json
```

#### Configuration

```json
{
  "securityScan": {
    "dependencies": {
      "enabled": true,
      "tools": ["npm-audit", "snyk"],
      "ignoreDevDependencies": false,
      "autoFix": true,
      "updatePolicy": "minor"
    }
  }
}
```

#### Example Output

```json
{
  "type": "dependency",
  "vulnerabilities": [
    {
      "id": "GHSA-abc-123",
      "cve": "CVE-2024-12345",
      "severity": "high",
      "package": "axios",
      "version": "0.21.1",
      "title": "Server-Side Request Forgery (SSRF)",
      "description": "Axios allows SSRF via crafted URL...",
      "fixedIn": "0.21.2",
      "recommendation": "Upgrade axios to version 0.21.2 or later",
      "references": [
        "https://github.com/axios/axios/security/advisories/GHSA-abc-123"
      ]
    }
  ]
}
```

### Layer 2: Static Analysis Security Testing (SAST)

Analyzes source code for security vulnerabilities.

#### Semgrep Rules

```yaml
# .semgrep/security-rules.yml
rules:
  - id: hardcoded-secret
    pattern: |
      const $VAR = "$SECRET"
    message: Possible hardcoded secret detected
    severity: WARNING
    languages: [javascript, typescript]

  - id: sql-injection
    pattern: |
      db.query("... + $VAR + ...")
    message: Potential SQL injection vulnerability
    severity: ERROR
    languages: [javascript, typescript]

  - id: unsafe-eval
    pattern: eval($X)
    message: Use of eval() is dangerous
    severity: WARNING
    languages: [javascript]
```

#### Custom Security Rules

```typescript
// .tasksentinel/security-rules/custom.ts
export const customSecurityRules = [
  {
    id: 'jwt-secret-hardcoded',
    pattern: /jwt\.sign\([^,]+,\s*['"][\w]+['"]/,
    severity: 'critical',
    message: 'JWT secret should not be hardcoded',
    recommendation: 'Use environment variables for secrets',
    example: {
      bad: `jwt.sign(payload, 'hardcoded-secret')`,
      good: `jwt.sign(payload, process.env.JWT_SECRET)`
    }
  },
  {
    id: 'password-plain-text',
    pattern: /password\s*:\s*['"][^'"]+['"]/i,
    severity: 'high',
    message: 'Plain text password detected',
    recommendation: 'Hash passwords before storage',
    example: {
      bad: `{ password: 'mypassword' }`,
      good: `{ password: await bcrypt.hash(password, 10) }`
    }
  }
];
```

#### Configuration

```json
{
  "securityScan": {
    "sast": {
      "enabled": true,
      "tools": ["semgrep", "eslint-security"],
      "customRules": ".tasksentinel/security-rules/custom.ts",
      "excludePatterns": [
        "**/*.test.ts",
        "**/node_modules/**"
      ]
    }
  }
}
```

### Layer 3: Secret Detection

Scans for hardcoded secrets, API keys, and credentials.

#### Patterns Detected

```typescript
const secretPatterns = {
  apiKey: /['"]?[A-Z0-9]{20,}['"]?/,
  awsKey: /AKIA[0-9A-Z]{16}/,
  privateKey: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
  password: /password\s*[=:]\s*['"][^'"]+['"]/i,
  token: /token\s*[=:]\s*['"][^'"]+['"]/i,
  jwt: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/,
  githubToken: /ghp_[a-zA-Z0-9]{36}/,
  slackToken: /xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/,
  stripeKey: /sk_live_[a-zA-Z0-9]{24}/
};
```

#### Configuration

```json
{
  "securityScan": {
    "secrets": {
      "enabled": true,
      "tools": ["trufflehog", "detect-secrets"],
      "customPatterns": ".tasksentinel/security-rules/secret-patterns.json",
      "whitelist": [
        "test-api-key-12345",
        "dummy-secret-for-tests"
      ],
      "excludeFiles": [
        "**/*.test.ts",
        "**/test-fixtures/**"
      ]
    }
  }
}
```

#### Example Detection

```typescript
// ❌ BAD: Hardcoded secret
const apiKey = 'sk_live_abc123xyz789';
const dbPassword = 'mypassword123';

// ✅ GOOD: Environment variables
const apiKey = process.env.STRIPE_API_KEY;
const dbPassword = process.env.DB_PASSWORD;

// ✅ GOOD: Secret management service
const apiKey = await secretManager.getSecret('stripe-api-key');
```

### Layer 4: OWASP Top 10 Checks

Checks for OWASP Top 10 vulnerabilities.

#### Vulnerability Categories

**A01:2021 – Broken Access Control**
```typescript
// Check: Missing authorization checks
rules.push({
  pattern: /app\.(get|post|put|delete)\([^,]+,\s*async/,
  check: (code) => {
    return !code.includes('authenticate') &&
           !code.includes('authorize');
  },
  message: 'Endpoint missing authentication/authorization'
});
```

**A02:2021 – Cryptographic Failures**
```typescript
// Check: Weak encryption
rules.push({
  pattern: /crypto\.createCipher\(['"]des['"]|crypto\.createHash\(['"]md5['"])/,
  message: 'Weak cryptographic algorithm detected',
  recommendation: 'Use AES-256 for encryption, SHA-256+ for hashing'
});
```

**A03:2021 – Injection**
```typescript
// Check: SQL injection
rules.push({
  pattern: /\.query\(['"].*\$\{.*\}.*['"]\)|\.query\(['"].*\+.*\+.*['"]\)/,
  message: 'Potential SQL injection vulnerability',
  recommendation: 'Use parameterized queries'
});
```

**A04:2021 – Insecure Design**
```typescript
// Check: Missing rate limiting
rules.push({
  check: (code) => {
    return code.includes('app.post') &&
           !code.includes('rateLimit');
  },
  message: 'API endpoint missing rate limiting',
  recommendation: 'Add rate limiting middleware'
});
```

**A05:2021 – Security Misconfiguration**
```typescript
// Check: Debug mode in production
rules.push({
  pattern: /DEBUG\s*=\s*true|debug:\s*true/i,
  message: 'Debug mode enabled',
  recommendation: 'Disable debug mode in production'
});
```

**A06:2021 – Vulnerable Components**
```typescript
// Handled by dependency scanning (Layer 1)
```

**A07:2021 – Authentication Failures**
```typescript
// Check: Weak password requirements
rules.push({
  pattern: /password\.length\s*>=?\s*[1-5]/,
  message: 'Weak password requirements',
  recommendation: 'Require minimum 8 characters with complexity'
});
```

**A08:2021 – Data Integrity Failures**
```typescript
// Check: Missing signature verification
rules.push({
  pattern: /jwt\.decode\(/,
  check: (code) => !code.includes('jwt.verify'),
  message: 'JWT decoded without verification',
  recommendation: 'Use jwt.verify() instead of jwt.decode()'
});
```

**A09:2021 – Logging Failures**
```typescript
// Check: Sensitive data in logs
rules.push({
  pattern: /console\.log.*password|logger.*password|log.*credit.*card/i,
  message: 'Sensitive data may be logged',
  recommendation: 'Remove sensitive data from logs'
});
```

**A10:2021 – SSRF**
```typescript
// Check: Unvalidated URL requests
rules.push({
  pattern: /axios\.get\(\$\{|fetch\(\$\{|request\(\$\{/,
  message: 'Potential SSRF vulnerability',
  recommendation: 'Validate and sanitize URLs before making requests'
});
```

## Vulnerability Classification

### Severity Levels

#### Critical
- **Impact:** Immediate risk of data breach or system compromise
- **Examples:** SQL injection, remote code execution, hardcoded credentials
- **SLA:** Fix within 24 hours
- **Action:** Block deployment

#### High
- **Impact:** Significant security risk
- **Examples:** XSS, authentication bypass, insecure cryptography
- **SLA:** Fix within 1 week
- **Action:** Require review before deployment

#### Medium
- **Impact:** Moderate security risk
- **Examples:** Missing security headers, weak password policy
- **SLA:** Fix within 1 month
- **Action:** Warning, deployment allowed

#### Low
- **Impact:** Minor security concern
- **Examples:** Information disclosure, outdated dependencies (no exploits)
- **SLA:** Address in backlog
- **Action:** Advisory only

#### Info
- **Impact:** No direct security risk
- **Examples:** Security best practices, recommendations
- **SLA:** Optional
- **Action:** Information only

### CVSS Scoring

Task Sentinel uses CVSS (Common Vulnerability Scoring System) v3.1:

```typescript
interface CVSSScore {
  base: number;           // 0-10
  temporal: number;       // Adjusted for exploit availability
  environmental: number;  // Adjusted for your environment
  vector: string;         // CVSS vector string
}

// Example
{
  base: 7.5,
  temporal: 7.2,
  environmental: 8.1,
  vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"
}
```

## Scanning Tools

### npm audit

Built-in Node.js security auditing tool.

**Usage:**
```bash
npm audit --json > audit-report.json
npm audit fix           # Auto-fix vulnerabilities
npm audit fix --force   # Force major version updates
```

**Configuration:**
```json
{
  "securityScan": {
    "npmAudit": {
      "enabled": true,
      "auditLevel": "moderate",
      "production": true,
      "autoFix": true
    }
  }
}
```

### Semgrep

Static analysis tool with security-focused rules.

**Installation:**
```bash
pip install semgrep
```

**Usage:**
```bash
semgrep --config=auto --json .
semgrep --config=.semgrep/security-rules.yml --json .
```

**Configuration:**
```json
{
  "securityScan": {
    "semgrep": {
      "enabled": true,
      "rulesets": ["auto", ".semgrep/security-rules.yml"],
      "excludePaths": ["node_modules", "test"]
    }
  }
}
```

### TruffleHog

Secret scanning tool.

**Installation:**
```bash
pip install trufflehog
```

**Usage:**
```bash
trufflehog filesystem . --json > secrets-report.json
```

**Configuration:**
```json
{
  "securityScan": {
    "trufflehog": {
      "enabled": true,
      "excludePatterns": ["*.test.ts", "test-fixtures/*"],
      "customRegex": ".tasksentinel/security-rules/secret-patterns.json"
    }
  }
}
```

### Snyk (Optional)

Commercial-grade security scanning.

**Installation:**
```bash
npm install -g snyk
snyk auth
```

**Usage:**
```bash
snyk test --json
snyk monitor  # Continuous monitoring
```

## Remediation Workflow

### Step 1: Detection

```typescript
const scanResult = await securityScanner.scan(code, dependencies);

if (scanResult.vulnerabilities.length > 0) {
  console.log('Vulnerabilities detected:', scanResult.summary);
}
```

### Step 2: Triage

```typescript
const critical = scanResult.vulnerabilities.filter(v => v.severity === 'critical');
const high = scanResult.vulnerabilities.filter(v => v.severity === 'high');

if (critical.length > 0) {
  // Block deployment
  throw new Error('Critical vulnerabilities must be fixed');
}

if (high.length > 2) {
  // Require manual review
  await requestSecurityReview(high);
}
```

### Step 3: Remediation

```typescript
// Auto-fixable vulnerabilities
const autoFixable = scanResult.vulnerabilities.filter(v => v.fixAvailable);

for (const vuln of autoFixable) {
  if (vuln.type === 'dependency') {
    await updateDependency(vuln.package, vuln.fixedIn);
  }
}

// Manual fixes required
const manualFixes = scanResult.vulnerabilities.filter(v => !v.fixAvailable);

for (const vuln of manualFixes) {
  console.log(`Manual fix required for ${vuln.id}:`);
  console.log(vuln.recommendation);
  console.log(vuln.references);
}
```

### Step 4: Verification

```typescript
// Re-scan after fixes
const verifyResult = await securityScanner.scan(fixedCode, updatedDependencies);

if (verifyResult.vulnerabilities.length === 0) {
  console.log('All vulnerabilities resolved');
} else {
  console.log('Remaining vulnerabilities:', verifyResult.summary);
}
```

### Step 5: Documentation

```typescript
// Create security report
await generateSecurityReport({
  taskId: 'task-123',
  scanDate: new Date(),
  vulnerabilitiesFound: scanResult.vulnerabilities.length,
  vulnerabilitiesFixed: fixedCount,
  remainingIssues: verifyResult.vulnerabilities,
  actions: remediationActions
});
```

## Compliance

### SOC 2 Compliance

```json
{
  "compliance": {
    "soc2": {
      "enabled": true,
      "controls": {
        "CC6.1": "Logical and physical access controls",
        "CC6.6": "Vulnerability management",
        "CC7.1": "Detection of security events"
      },
      "evidence": {
        "scanResults": true,
        "remediationLogs": true,
        "accessLogs": true
      }
    }
  }
}
```

### PCI DSS Compliance

```json
{
  "compliance": {
    "pciDss": {
      "enabled": true,
      "requirements": {
        "6.5.1": "Injection flaws",
        "6.5.3": "Insecure cryptographic storage",
        "6.5.8": "Improper access control"
      },
      "scanning": {
        "frequency": "quarterly",
        "scope": ["payment-processing", "cardholder-data"]
      }
    }
  }
}
```

### HIPAA Compliance

```json
{
  "compliance": {
    "hipaa": {
      "enabled": true,
      "safeguards": {
        "164.312a": "Access controls",
        "164.312b": "Audit controls",
        "164.312c": "Integrity controls"
      },
      "phi Protection": {
        "encryption": "required",
        "accessLogging": "required",
        "vulnerabilityScanning": "required"
      }
    }
  }
}
```

## Best Practices

### 1. Scan on Every Commit

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Security Scan
        run: npx task-sentinel qa security-scan
```

### 2. Use Dependency Lock Files

```bash
# Always commit lock files
git add package-lock.json
git commit -m "Update dependencies"

# Use exact versions for production
npm install --save-exact package@1.2.3
```

### 3. Rotate Secrets Regularly

```bash
# Never commit secrets
echo ".env" >> .gitignore
echo "secrets.json" >> .gitignore

# Use secret management
export DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id prod/db/password --query SecretString --output text)
```

### 4. Implement Defense in Depth

```typescript
// Multiple security layers
app.use(helmet());                    // Security headers
app.use(rateLimit({ max: 100 }));    // Rate limiting
app.use(authenticate);                 // Authentication
app.use(authorize);                    // Authorization
app.use(validateInput);                // Input validation
app.use(auditLog);                     // Audit logging
```

### 5. Keep Dependencies Updated

```bash
# Check for updates weekly
npm outdated

# Update dependencies
npm update

# Check for security updates
npm audit

# Auto-fix vulnerabilities
npm audit fix
```

### 6. Security Code Review

```typescript
// Security review checklist
const securityChecklist = [
  'Authentication implemented?',
  'Authorization checks in place?',
  'Input validation present?',
  'Output encoding applied?',
  'Secrets externalized?',
  'Error handling secure?',
  'Logging sanitized?',
  'Dependencies up-to-date?'
];
```

## CLI Commands

```bash
# Run complete security scan
npx task-sentinel qa security-scan --task-id task-123

# Scan dependencies only
npx task-sentinel qa security-scan --type dependencies

# Scan code only (SAST)
npx task-sentinel qa security-scan --type sast

# Scan for secrets
npx task-sentinel qa security-scan --type secrets

# OWASP Top 10 check
npx task-sentinel qa security-scan --type owasp

# Generate security report
npx task-sentinel qa security-report --task-id task-123 --format pdf

# Check compliance
npx task-sentinel qa compliance-check --standard soc2
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-30
**Maintainers:** Task Sentinel Team
