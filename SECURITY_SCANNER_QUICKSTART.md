# Security Scanner Quick Start Guide

## 🚀 Quick Start (30 seconds)

```bash
# Install dependencies
npm install

# Run security scan
npm run security-scan

# Or use directly
ts-node examples/security-scanner-demo.ts basic
```

## 📋 Common Commands

```bash
# Full scan with all checks
npm run security-scan

# Dependency vulnerabilities only
ts-node examples/security-scanner-demo.ts dependencies

# Code analysis (OWASP Top 10)
ts-node examples/security-scanner-demo.ts code

# Secret detection
ts-node examples/security-scanner-demo.ts secrets

# Generate comprehensive reports
ts-node examples/security-scanner-demo.ts comprehensive

# CI/CD simulation
ts-node examples/security-scanner-demo.ts ci
```

## 🔍 What Gets Scanned

### 1. Dependencies (npm audit)
- ✅ Known CVE vulnerabilities
- ✅ Outdated packages
- ✅ License compliance

### 2. Code Security (OWASP Top 10)
- ✅ SQL Injection
- ✅ XSS vulnerabilities
- ✅ Command injection
- ✅ Path traversal
- ✅ Weak cryptography
- ✅ Authentication issues
- ✅ Authorization flaws
- ✅ Unsafe deserialization
- ✅ CORS misconfiguration
- ✅ Sensitive data logging

### 3. Secret Detection
- ✅ AWS credentials
- ✅ API keys
- ✅ GitHub tokens
- ✅ Private keys
- ✅ Database passwords
- ✅ JWT tokens

## 📊 Understanding Results

### Severity Levels
| Severity | Action | Example |
|----------|--------|---------|
| 🔴 Critical | Fix immediately | SQL injection, exposed secrets |
| 🟠 High | Fix within 24h | XSS, weak crypto |
| 🟡 Medium | Fix within week | Missing validation |
| 🟢 Low | Fix when possible | Code style, minor issues |

### Quality Gates
```
✅ PASSED - All checks passed
❌ FAILED - Found issues:
  - 1 critical vulnerability (max: 0)
  - 3 exposed secrets (allowed: 0)
```

## 💻 Code Examples

### Basic Usage
```typescript
import { SecurityScanner } from './qa/security-scanner';

const scanner = new SecurityScanner(process.cwd());
const result = await scanner.scan();

if (!result.quality_gate.passed) {
  console.error('Security issues found!');
  process.exit(1);
}
```

### With Custom Config
```typescript
const scanner = new SecurityScanner(process.cwd(), {
  include_dependencies: true,
  include_code_analysis: true,
  include_secret_detection: true,
  severity_threshold: 'high',  // Only show high/critical
  exclude_patterns: ['**/test/**'],
});

const result = await scanner.scanAndReport(['json', 'html']);
```

## 🔧 Configuration

Edit `.scannerrc.json`:
```json
{
  "security_scanner": {
    "config": {
      "include_dependencies": true,
      "include_code_analysis": true,
      "include_secret_detection": true,
      "severity_threshold": "low"
    },
    "quality_gates": {
      "max_critical": 0,
      "max_high": 5,
      "allow_secrets": false
    }
  }
}
```

## 🚨 Common Issues & Fixes

### Issue: Too many false positives
```typescript
// Solution: Increase severity threshold
const scanner = new SecurityScanner(process.cwd(), {
  severity_threshold: 'high',  // Only critical/high
});
```

### Issue: Scan takes too long
```typescript
// Solution: Exclude directories and skip git history
const scanner = new SecurityScanner(process.cwd(), {
  scan_git_history: false,
  exclude_patterns: ['**/node_modules/**', '**/dist/**'],
});
```

### Issue: Build fails on minor issues
```typescript
// Solution: Custom quality gates for CI
const result = await scanner.scan();

// Only fail on critical
if (result.summary.by_severity.critical > 0) {
  process.exit(1);
}
```

## 📁 Report Files

After scanning, find reports in `security-reports/`:
- `scan-{id}.json` - Full results (machine-readable)
- `scan-{id}.md` - Markdown summary (human-readable)
- `scan-{id}.html` - Interactive report (browser)
- `scan-{id}.sarif` - GitHub Code Scanning format

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
- name: Security Scan
  run: npm run security-scan
- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: security-reports/*.sarif
```

### Pre-commit Hook
```bash
#!/bin/sh
npm run security-scan -- --severity critical || exit 1
```

## 🎯 Next Steps

1. **Run first scan**: `npm run security-scan`
2. **Review results**: Check `security-reports/` directory
3. **Fix critical issues**: Focus on red/orange items
4. **Configure gates**: Adjust `.scannerrc.json` for your needs
5. **Integrate CI**: Add to GitHub Actions
6. **Monitor trends**: Track security metrics over time

## 📚 Full Documentation

- **Comprehensive Guide**: `/docs/qa/SECURITY_SCANNER.md`
- **API Documentation**: `/docs/qa/security-scanning.md`
- **Examples**: `/examples/security-scanner-demo.ts`
- **Tests**: `/tests/qa/security-scanner.test.ts`

## 🆘 Help

```bash
# List all demo commands
ts-node examples/security-scanner-demo.ts

# Run specific demo
ts-node examples/security-scanner-demo.ts <demo-name>

# Run all demos
ts-node examples/security-scanner-demo.ts all
```

## 📊 Expected Output

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
```

---

**Ready to scan?** Run `npm run security-scan` now! 🚀
