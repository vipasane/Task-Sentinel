# Task Sentinel Phase 4: Quality Assurance Guide

## Overview

Phase 4 integrates comprehensive quality assurance into the Task Sentinel OODA loop, providing automated testing, security scanning, and performance benchmarking. This phase ensures code quality before deployment through automated quality gates and evidence collection.

## Table of Contents

1. [Architecture](#architecture)
2. [Components](#components)
3. [Quality Gates](#quality-gates)
4. [Configuration](#configuration)
5. [CI/CD Integration](#cicd-integration)
6. [Best Practices](#best-practices)

## Architecture

### OODA Loop Integration

Phase 4 QA operates within the Orient and Act phases:

```
Observe → Orient → Decide → Act
           ↓                   ↓
        QA Start           QA Execute
           ↓                   ↓
    Test Generation    Security Scanning
    Evidence Setup    Performance Tests
                          Quality Gates
```

### Component Architecture

```
QAManager (Orchestrator)
    ├── TestGenerator
    │   ├── Unit Test Generation
    │   ├── Integration Test Generation
    │   └── Mock Generation
    ├── SecurityScanner
    │   ├── SAST (npm audit, semgrep)
    │   ├── Dependency Analysis
    │   ├── Secret Detection
    │   └── OWASP Compliance
    └── PerformanceBenchmarker
        ├── Load Testing
        ├── Stress Testing
        ├── Benchmark Execution
        └── Statistical Analysis
```

### Data Flow

```
Task Input
    ↓
QAManager.startQA()
    ↓
Evidence Directory Created
    ↓
┌─────────────────────────────┐
│  Parallel Execution         │
│  ├── Test Generation        │
│  ├── Security Scanning      │
│  └── Performance Benchmarks │
└─────────────────────────────┘
    ↓
Evidence Collection
    ↓
Quality Gate Evaluation
    ↓
Pass/Fail Decision
    ↓
Integration with Code Review
```

## Components

### QAManager

**Purpose:** Orchestrates all QA activities and manages quality gates.

**Key Features:**
- Coordinates test generation, security scanning, and performance testing
- Manages evidence collection
- Enforces quality gates
- Integrates with GitHub for artifact storage

**Lifecycle:**
```typescript
// Initialize
await qaManager.startQA(taskId, config);

// Execute QA
const results = await qaManager.executeQA(taskId, code, metadata);

// Evaluate
const passed = await qaManager.evaluateQualityGates(taskId, results);

// Finalize
await qaManager.finalizeQA(taskId, passed);
```

### TestGenerator

**Purpose:** Automatically generates comprehensive test suites.

**Capabilities:**
- Unit test generation with mocks
- Integration test scaffolding
- Edge case identification
- Coverage optimization

**Test Templates:**
- Unit tests (Jest/Mocha)
- Integration tests (Supertest)
- E2E tests (Playwright)
- Mock generators (Sinon)

### SecurityScanner

**Purpose:** Multi-layer security analysis.

**Scanning Layers:**
1. **SAST (Static Analysis)**
   - npm audit for dependencies
   - Semgrep for code patterns
   - Custom rules for project-specific security

2. **Secret Detection**
   - API keys, tokens, passwords
   - Private keys and certificates
   - Database credentials

3. **Dependency Analysis**
   - Known vulnerabilities (CVE)
   - License compliance
   - Outdated packages

4. **OWASP Top 10 Checks**
   - Injection vulnerabilities
   - Authentication issues
   - XSS, CSRF, etc.

### PerformanceBenchmarker

**Purpose:** Automated performance testing and regression detection.

**Benchmark Types:**
- **Load Testing:** Normal traffic patterns
- **Stress Testing:** Breaking point identification
- **Spike Testing:** Sudden traffic surges
- **Endurance Testing:** Long-term stability

**Metrics Collected:**
- Response time (p50, p95, p99)
- Throughput (req/sec)
- Error rate
- Resource utilization (CPU, memory)

## Quality Gates

### Gate Definitions

Quality gates are checkpoints that code must pass before deployment:

```typescript
interface QualityGates {
  testCoverage: {
    minimum: 80,      // Minimum 80% coverage
    critical: 90      // Critical paths need 90%
  },
  securityScan: {
    maxCritical: 0,   // Zero critical vulnerabilities
    maxHigh: 2,       // Maximum 2 high severity issues
    maxMedium: 5      // Maximum 5 medium severity issues
  },
  performance: {
    maxResponseTime: 200,     // p95 < 200ms
    minThroughput: 1000,      // > 1000 req/sec
    maxErrorRate: 0.01        // < 1% errors
  }
}
```

### Gate Enforcement

**Blocking Gates (Must Pass):**
- Critical security vulnerabilities
- Test coverage below minimum
- Performance regression > 20%

**Warning Gates (Review Required):**
- High severity security issues
- Test coverage 80-90%
- Performance regression 10-20%

**Advisory Gates (Informational):**
- Medium severity security issues
- Test coverage 90-95%
- Performance regression < 10%

### Override Procedures

When gates block deployment:

1. **Technical Override:**
   ```bash
   npx task-sentinel qa override \
     --task-id <task-id> \
     --gate security \
     --reason "False positive in third-party library" \
     --approved-by "tech-lead"
   ```

2. **Management Override:**
   - Requires two approvals
   - Must document business justification
   - Creates technical debt ticket

3. **Emergency Override:**
   - Critical production issues only
   - Post-deployment review required
   - Automatic rollback plan mandatory

## Configuration

### Basic Configuration

Create `.tasksentinel/qa-config.json`:

```json
{
  "qa": {
    "enabled": true,
    "parallel": true,
    "timeout": 300000,
    "evidenceDir": ".tasksentinel/evidence",

    "testGeneration": {
      "enabled": true,
      "framework": "jest",
      "coverageTarget": 80,
      "generateMocks": true,
      "edgeCases": true
    },

    "securityScan": {
      "enabled": true,
      "tools": ["npm-audit", "semgrep", "secret-scan"],
      "failOnCritical": true,
      "ignoreDevDependencies": false
    },

    "performanceBenchmark": {
      "enabled": true,
      "types": ["load", "stress"],
      "duration": 60,
      "thresholds": {
        "responseTime": 200,
        "throughput": 1000,
        "errorRate": 0.01
      }
    },

    "qualityGates": {
      "enforceStrict": true,
      "allowOverride": true,
      "notifyOnFailure": true
    }
  }
}
```

### Advanced Configuration

**Custom Test Templates:**

```json
{
  "testGeneration": {
    "templates": {
      "unit": "templates/jest-unit.template",
      "integration": "templates/supertest-integration.template",
      "e2e": "templates/playwright-e2e.template"
    },
    "mockStrategies": {
      "api": "sinon-stub",
      "database": "in-memory",
      "external": "nock"
    }
  }
}
```

**Custom Security Rules:**

```json
{
  "securityScan": {
    "customRules": [
      {
        "id": "custom-auth-check",
        "pattern": "jwt.verify\\([^,]+,\\s*process\\.env\\.",
        "severity": "high",
        "message": "JWT secret should not be in environment variable"
      }
    ],
    "whitelist": [
      {
        "cve": "CVE-2021-12345",
        "reason": "False positive - not applicable to our use case"
      }
    ]
  }
}
```

**Performance Profiles:**

```json
{
  "performanceBenchmark": {
    "profiles": {
      "development": {
        "duration": 30,
        "concurrency": 10,
        "thresholds": {
          "responseTime": 500,
          "errorRate": 0.05
        }
      },
      "staging": {
        "duration": 60,
        "concurrency": 50,
        "thresholds": {
          "responseTime": 200,
          "errorRate": 0.01
        }
      },
      "production": {
        "duration": 300,
        "concurrency": 100,
        "thresholds": {
          "responseTime": 100,
          "errorRate": 0.001
        }
      }
    }
  }
}
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/qa.yml`:

```yaml
name: Quality Assurance

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  qa:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run QA Suite
        run: |
          npx task-sentinel qa run \
            --task-id ${{ github.event.pull_request.number }} \
            --evidence-dir ./qa-evidence \
            --upload-to-github
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload QA Evidence
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: qa-evidence
          path: ./qa-evidence

      - name: Comment PR
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(
              fs.readFileSync('./qa-evidence/summary.json', 'utf8')
            );

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## QA Results\n\n${report.summary}`
            });

      - name: Quality Gate Check
        run: |
          npx task-sentinel qa check-gates \
            --task-id ${{ github.event.pull_request.number }} \
            --strict
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - qa
  - deploy

qa_suite:
  stage: qa
  image: node:18
  script:
    - npm ci
    - npx task-sentinel qa run --task-id $CI_MERGE_REQUEST_IID
  artifacts:
    paths:
      - .tasksentinel/evidence/
    reports:
      junit: .tasksentinel/evidence/test-results.xml
      coverage_report:
        coverage_format: cobertura
        path: .tasksentinel/evidence/coverage/cobertura.xml
  only:
    - merge_requests
    - main

quality_gates:
  stage: qa
  image: node:18
  script:
    - npx task-sentinel qa check-gates --task-id $CI_MERGE_REQUEST_IID
  dependencies:
    - qa_suite
  only:
    - merge_requests
```

### Jenkins Pipeline

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any

    environment {
        NODE_VERSION = '18'
    }

    stages {
        stage('Setup') {
            steps {
                nodejs(nodeJSInstallationName: env.NODE_VERSION) {
                    sh 'npm ci'
                }
            }
        }

        stage('QA Suite') {
            parallel {
                stage('Test Generation') {
                    steps {
                        nodejs(nodeJSInstallationName: env.NODE_VERSION) {
                            sh '''
                                npx task-sentinel qa test-gen \
                                    --task-id ${BUILD_NUMBER}
                            '''
                        }
                    }
                }

                stage('Security Scan') {
                    steps {
                        nodejs(nodeJSInstallationName: env.NODE_VERSION) {
                            sh '''
                                npx task-sentinel qa security-scan \
                                    --task-id ${BUILD_NUMBER}
                            '''
                        }
                    }
                }

                stage('Performance Test') {
                    steps {
                        nodejs(nodeJSInstallationName: env.NODE_VERSION) {
                            sh '''
                                npx task-sentinel qa perf-test \
                                    --task-id ${BUILD_NUMBER}
                            '''
                        }
                    }
                }
            }
        }

        stage('Quality Gates') {
            steps {
                nodejs(nodeJSInstallationName: env.NODE_VERSION) {
                    sh '''
                        npx task-sentinel qa check-gates \
                            --task-id ${BUILD_NUMBER} \
                            --strict
                    '''
                }
            }
        }

        stage('Publish Results') {
            steps {
                publishHTML([
                    reportDir: '.tasksentinel/evidence',
                    reportFiles: 'report.html',
                    reportName: 'QA Report'
                ])

                junit '.tasksentinel/evidence/test-results.xml'

                archiveArtifacts artifacts: '.tasksentinel/evidence/**/*',
                                allowEmptyArchive: false
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

## Best Practices

### Test Generation

1. **Start with Critical Paths**
   - Identify core business logic
   - Generate tests for critical flows first
   - Ensure edge cases are covered

2. **Mock External Dependencies**
   - API calls
   - Database queries
   - Third-party services

3. **Maintain Test Quality**
   - Review generated tests
   - Add domain-specific assertions
   - Keep tests fast and isolated

4. **Coverage Targets**
   - Critical code: 95%+
   - Business logic: 85%+
   - Utilities: 80%+
   - UI components: 70%+

### Security Scanning

1. **Shift Left Security**
   - Scan early and often
   - Integrate into development workflow
   - Fix vulnerabilities immediately

2. **Prioritize Findings**
   - Critical: Fix within 24 hours
   - High: Fix within 1 week
   - Medium: Fix within 1 month
   - Low: Address in backlog

3. **False Positive Management**
   - Document false positives
   - Create whitelist entries
   - Review periodically

4. **Dependency Management**
   - Keep dependencies updated
   - Remove unused packages
   - Prefer maintained libraries

### Performance Testing

1. **Realistic Scenarios**
   - Use production-like data
   - Simulate actual user behavior
   - Test with realistic network conditions

2. **Baseline Establishment**
   - Establish performance baselines
   - Track trends over time
   - Alert on regressions

3. **Resource Monitoring**
   - Monitor CPU, memory, disk I/O
   - Identify resource bottlenecks
   - Optimize high-impact code

4. **Continuous Benchmarking**
   - Run benchmarks on every commit
   - Compare against baseline
   - Investigate regressions immediately

### Quality Gate Management

1. **Start Lenient, Tighten Gradually**
   - Begin with warning gates
   - Collect baseline metrics
   - Progressively enforce stricter gates

2. **Context-Specific Gates**
   - Different gates for different environments
   - Adjust based on code criticality
   - Consider team maturity

3. **Override Discipline**
   - Require strong justification
   - Document all overrides
   - Review override patterns

4. **Continuous Improvement**
   - Analyze gate failures
   - Refine thresholds based on data
   - Update gates as code evolves

### Evidence Collection

1. **Comprehensive Artifacts**
   - Test results and coverage
   - Security scan reports
   - Performance metrics
   - Quality gate decisions

2. **Organized Storage**
   - Consistent directory structure
   - Clear naming conventions
   - Easy retrieval

3. **Retention Policies**
   - Keep evidence for audits
   - Archive old evidence
   - Comply with regulations

4. **Integration with Tools**
   - Upload to GitHub
   - Integrate with monitoring
   - Link to tickets/PRs

## Troubleshooting

### Common Issues

**QA Timeout:**
```bash
# Increase timeout
npx task-sentinel qa run --timeout 600000

# Run components individually
npx task-sentinel qa test-gen
npx task-sentinel qa security-scan
npx task-sentinel qa perf-test
```

**Test Generation Failures:**
```bash
# Check template syntax
npx task-sentinel qa validate-templates

# Debug generation
npx task-sentinel qa test-gen --debug --verbose
```

**Security Scan False Positives:**
```json
{
  "securityScan": {
    "whitelist": [
      {
        "cve": "CVE-XXXX-XXXXX",
        "reason": "Not applicable to our use case"
      }
    ]
  }
}
```

**Performance Test Failures:**
```bash
# Run with lower thresholds
npx task-sentinel qa perf-test --profile development

# Analyze metrics
npx task-sentinel qa analyze-perf --task-id <task-id>
```

### Debug Mode

Enable detailed logging:

```bash
export DEBUG=task-sentinel:qa:*
npx task-sentinel qa run --verbose
```

### Support

- Documentation: `/docs/qa/`
- API Reference: `/docs/api/qa.md`
- Issues: GitHub Issues
- Slack: #task-sentinel-qa

## Next Steps

1. Review [API Documentation](../api/qa.md)
2. Read detailed guides in `/docs/qa/`
3. Configure quality gates for your project
4. Integrate with CI/CD pipeline
5. Monitor QA metrics and refine thresholds

---

**Version:** 1.0.0
**Last Updated:** 2025-10-30
**Maintainers:** Task Sentinel Team
