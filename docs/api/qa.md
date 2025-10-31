# QA API Reference

Complete API documentation for Task Sentinel Phase 4 Quality Assurance components.

## Table of Contents

1. [QAManager](#qamanager)
2. [TestGenerator](#testgenerator)
3. [SecurityScanner](#securityscanner)
4. [PerformanceBenchmarker](#performancebenchmarker)
5. [Types and Interfaces](#types-and-interfaces)

## QAManager

Primary orchestrator for all QA activities.

### Constructor

```typescript
constructor(config: QAConfig, githubService?: GitHubService)
```

**Parameters:**
- `config: QAConfig` - QA configuration object
- `githubService?: GitHubService` - Optional GitHub integration service

**Example:**
```typescript
import { QAManager } from './qa/QAManager';

const qaManager = new QAManager({
  testGeneration: { enabled: true, coverageTarget: 80 },
  securityScan: { enabled: true, failOnCritical: true },
  performanceBenchmark: { enabled: true, duration: 60 },
  qualityGates: { enforceStrict: true }
});
```

### Methods

#### startQA()

Initialize QA process for a task.

```typescript
async startQA(taskId: string, config?: Partial<QAConfig>): Promise<void>
```

**Parameters:**
- `taskId: string` - Unique task identifier
- `config?: Partial<QAConfig>` - Override default configuration

**Returns:** `Promise<void>`

**Example:**
```typescript
await qaManager.startQA('task-123', {
  testGeneration: { coverageTarget: 90 }
});
```

**Behavior:**
1. Creates evidence directory
2. Initializes test generator
3. Prepares security scanner
4. Sets up performance benchmarker
5. Logs start event

---

#### executeQA()

Execute complete QA suite.

```typescript
async executeQA(
  taskId: string,
  code: string,
  metadata: TaskMetadata
): Promise<QAResults>
```

**Parameters:**
- `taskId: string` - Task identifier
- `code: string` - Code to analyze
- `metadata: TaskMetadata` - Task context and metadata

**Returns:** `Promise<QAResults>`

**Example:**
```typescript
const results = await qaManager.executeQA('task-123', codeString, {
  type: 'feature',
  language: 'typescript',
  framework: 'express',
  dependencies: ['lodash', 'axios']
});

console.log(results.testGeneration.coverage); // 85.5
console.log(results.securityScan.vulnerabilities); // []
console.log(results.performanceBenchmark.metrics.responseTime); // 150
```

**QAResults Structure:**
```typescript
{
  testGeneration: {
    coverage: number,
    testsGenerated: number,
    files: string[],
    report: TestReport
  },
  securityScan: {
    vulnerabilities: Vulnerability[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    passed: boolean,
    report: SecurityReport
  },
  performanceBenchmark: {
    metrics: PerformanceMetrics,
    passed: boolean,
    report: PerformanceReport
  }
}
```

---

#### evaluateQualityGates()

Evaluate all quality gates against QA results.

```typescript
async evaluateQualityGates(
  taskId: string,
  results: QAResults
): Promise<boolean>
```

**Parameters:**
- `taskId: string` - Task identifier
- `results: QAResults` - QA execution results

**Returns:** `Promise<boolean>` - True if all gates pass

**Example:**
```typescript
const passed = await qaManager.evaluateQualityGates('task-123', results);

if (!passed) {
  console.error('Quality gates failed');
  // Handle failure
}
```

**Gate Evaluation Logic:**
1. Check test coverage against minimum threshold
2. Verify no critical security vulnerabilities
3. Validate performance metrics within limits
4. Apply override rules if configured
5. Log gate decisions

---

#### finalizeQA()

Finalize QA process and collect evidence.

```typescript
async finalizeQA(taskId: string, passed: boolean): Promise<void>
```

**Parameters:**
- `taskId: string` - Task identifier
- `passed: boolean` - Whether quality gates passed

**Returns:** `Promise<void>`

**Example:**
```typescript
await qaManager.finalizeQA('task-123', true);
```

**Actions:**
1. Generate summary report
2. Upload artifacts to GitHub (if configured)
3. Update task status
4. Send notifications
5. Archive evidence

---

#### overrideQualityGate()

Override a failed quality gate.

```typescript
async overrideQualityGate(
  taskId: string,
  gate: string,
  reason: string,
  approver: string
): Promise<void>
```

**Parameters:**
- `taskId: string` - Task identifier
- `gate: string` - Gate name to override
- `reason: string` - Override justification
- `approver: string` - Approver identifier

**Returns:** `Promise<void>`

**Example:**
```typescript
await qaManager.overrideQualityGate(
  'task-123',
  'security',
  'False positive in third-party library',
  'tech-lead@example.com'
);
```

**Requirements:**
- Valid reason (min 20 characters)
- Authorized approver
- Override allowed in configuration
- Creates audit log entry

---

#### getQAStatus()

Get current QA status for a task.

```typescript
async getQAStatus(taskId: string): Promise<QAStatus>
```

**Parameters:**
- `taskId: string` - Task identifier

**Returns:** `Promise<QAStatus>`

**Example:**
```typescript
const status = await qaManager.getQAStatus('task-123');

console.log(status.phase); // 'executing' | 'evaluating' | 'complete'
console.log(status.progress); // 0.75
console.log(status.components); // { testGen: 'complete', security: 'running', perf: 'pending' }
```

---

## TestGenerator

Automated test generation component.

### Constructor

```typescript
constructor(config: TestGenerationConfig)
```

**Parameters:**
- `config: TestGenerationConfig` - Test generation configuration

**Example:**
```typescript
import { TestGenerator } from './qa/TestGenerator';

const generator = new TestGenerator({
  framework: 'jest',
  coverageTarget: 80,
  generateMocks: true,
  edgeCases: true,
  templates: {
    unit: 'templates/jest-unit.template',
    integration: 'templates/supertest-integration.template'
  }
});
```

### Methods

#### generateTests()

Generate comprehensive test suite for code.

```typescript
async generateTests(
  code: string,
  metadata: CodeMetadata
): Promise<TestGenerationResult>
```

**Parameters:**
- `code: string` - Source code to test
- `metadata: CodeMetadata` - Code context (language, framework, etc.)

**Returns:** `Promise<TestGenerationResult>`

**Example:**
```typescript
const result = await generator.generateTests(sourceCode, {
  language: 'typescript',
  framework: 'express',
  type: 'api-endpoint',
  dependencies: ['mongoose', 'jsonwebtoken']
});

console.log(result.tests); // Array of generated test files
console.log(result.coverage); // Estimated coverage
console.log(result.mocks); // Generated mock files
```

**TestGenerationResult:**
```typescript
{
  tests: Array<{
    path: string,
    content: string,
    type: 'unit' | 'integration' | 'e2e',
    coverage: number
  }>,
  mocks: Array<{
    path: string,
    content: string,
    target: string
  }>,
  coverage: number,
  estimatedRuntime: number
}
```

---

#### generateUnitTests()

Generate unit tests for specific functions.

```typescript
async generateUnitTests(
  functions: FunctionInfo[],
  options?: UnitTestOptions
): Promise<string[]>
```

**Parameters:**
- `functions: FunctionInfo[]` - Functions to test
- `options?: UnitTestOptions` - Generation options

**Returns:** `Promise<string[]>` - Array of test file contents

**Example:**
```typescript
const functions = [
  {
    name: 'calculateTotal',
    params: ['items: CartItem[]'],
    returns: 'number',
    complexity: 'medium'
  },
  {
    name: 'validateEmail',
    params: ['email: string'],
    returns: 'boolean',
    complexity: 'low'
  }
];

const tests = await generator.generateUnitTests(functions, {
  includeEdgeCases: true,
  mockDependencies: true
});
```

---

#### generateIntegrationTests()

Generate integration tests for API endpoints.

```typescript
async generateIntegrationTests(
  endpoints: EndpointInfo[],
  options?: IntegrationTestOptions
): Promise<string[]>
```

**Parameters:**
- `endpoints: EndpointInfo[]` - API endpoints to test
- `options?: IntegrationTestOptions` - Generation options

**Returns:** `Promise<string[]>` - Array of test file contents

**Example:**
```typescript
const endpoints = [
  {
    method: 'POST',
    path: '/api/users',
    auth: 'jwt',
    body: { username: 'string', email: 'string' }
  },
  {
    method: 'GET',
    path: '/api/users/:id',
    auth: 'jwt',
    params: { id: 'string' }
  }
];

const tests = await generator.generateIntegrationTests(endpoints, {
  testAuthentication: true,
  testValidation: true,
  testErrorCases: true
});
```

---

#### generateMocks()

Generate mock objects for dependencies.

```typescript
async generateMocks(
  dependencies: DependencyInfo[]
): Promise<MockDefinition[]>
```

**Parameters:**
- `dependencies: DependencyInfo[]` - Dependencies to mock

**Returns:** `Promise<MockDefinition[]>`

**Example:**
```typescript
const dependencies = [
  { name: 'UserModel', type: 'mongoose-model' },
  { name: 'emailService', type: 'api-client' },
  { name: 'cache', type: 'redis-client' }
];

const mocks = await generator.generateMocks(dependencies);

mocks.forEach(mock => {
  console.log(mock.name); // 'UserModelMock'
  console.log(mock.content); // Mock implementation
  console.log(mock.usage); // How to use the mock
});
```

---

#### estimateCoverage()

Estimate test coverage for generated tests.

```typescript
estimateCoverage(
  code: string,
  tests: string[]
): CoverageEstimate
```

**Parameters:**
- `code: string` - Source code
- `tests: string[]` - Generated tests

**Returns:** `CoverageEstimate`

**Example:**
```typescript
const estimate = generator.estimateCoverage(sourceCode, generatedTests);

console.log(estimate.statements); // 85.5
console.log(estimate.branches); // 78.2
console.log(estimate.functions); // 92.0
console.log(estimate.lines); // 84.1
console.log(estimate.uncovered); // Array of uncovered code locations
```

---

## SecurityScanner

Multi-layer security scanning component.

### Constructor

```typescript
constructor(config: SecurityScanConfig)
```

**Parameters:**
- `config: SecurityScanConfig` - Security scan configuration

**Example:**
```typescript
import { SecurityScanner } from './qa/SecurityScanner';

const scanner = new SecurityScanner({
  tools: ['npm-audit', 'semgrep', 'secret-scan'],
  failOnCritical: true,
  ignoreDevDependencies: false,
  customRules: [
    {
      id: 'custom-rule-1',
      pattern: 'dangerous_pattern',
      severity: 'high',
      message: 'Dangerous pattern detected'
    }
  ]
});
```

### Methods

#### scan()

Execute complete security scan.

```typescript
async scan(
  code: string,
  dependencies: Dependency[]
): Promise<SecurityScanResult>
```

**Parameters:**
- `code: string` - Source code to scan
- `dependencies: Dependency[]` - Project dependencies

**Returns:** `Promise<SecurityScanResult>`

**Example:**
```typescript
const result = await scanner.scan(sourceCode, [
  { name: 'express', version: '4.18.2' },
  { name: 'jsonwebtoken', version: '9.0.0' }
]);

console.log(result.vulnerabilities.length); // 0
console.log(result.riskLevel); // 'low'
console.log(result.passed); // true
console.log(result.summary); // Scan summary
```

**SecurityScanResult:**
```typescript
{
  vulnerabilities: Vulnerability[],
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  passed: boolean,
  summary: {
    critical: number,
    high: number,
    medium: number,
    low: number,
    info: number
  },
  report: SecurityReport
}
```

---

#### scanDependencies()

Scan project dependencies for vulnerabilities.

```typescript
async scanDependencies(
  dependencies: Dependency[]
): Promise<VulnerabilityReport>
```

**Parameters:**
- `dependencies: Dependency[]` - Dependencies to scan

**Returns:** `Promise<VulnerabilityReport>`

**Example:**
```typescript
const report = await scanner.scanDependencies(dependencies);

report.vulnerabilities.forEach(vuln => {
  console.log(vuln.cve); // CVE identifier
  console.log(vuln.severity); // Severity level
  console.log(vuln.package); // Affected package
  console.log(vuln.fixedIn); // Fixed version
  console.log(vuln.recommendation); // Remediation advice
});
```

---

#### scanCode()

Perform static analysis security testing (SAST).

```typescript
async scanCode(code: string): Promise<CodeScanResult>
```

**Parameters:**
- `code: string` - Source code to analyze

**Returns:** `Promise<CodeScanResult>`

**Example:**
```typescript
const result = await scanner.scanCode(sourceCode);

result.findings.forEach(finding => {
  console.log(finding.rule); // Security rule violated
  console.log(finding.severity); // Severity level
  console.log(finding.line); // Line number
  console.log(finding.message); // Issue description
  console.log(finding.recommendation); // Fix recommendation
});
```

---

#### scanSecrets()

Detect hardcoded secrets in code.

```typescript
async scanSecrets(code: string): Promise<SecretScanResult>
```

**Parameters:**
- `code: string` - Source code to scan

**Returns:** `Promise<SecretScanResult>`

**Example:**
```typescript
const result = await scanner.scanSecrets(sourceCode);

if (result.found.length > 0) {
  result.found.forEach(secret => {
    console.log(secret.type); // 'api-key', 'password', 'token'
    console.log(secret.line); // Line number
    console.log(secret.pattern); // Matched pattern
    console.log(secret.confidence); // Detection confidence
  });
}
```

---

#### checkOWASP()

Check for OWASP Top 10 vulnerabilities.

```typescript
async checkOWASP(code: string): Promise<OWASPReport>
```

**Parameters:**
- `code: string` - Source code to check

**Returns:** `Promise<OWASPReport>`

**Example:**
```typescript
const report = await scanner.checkOWASP(sourceCode);

report.findings.forEach(finding => {
  console.log(finding.category); // OWASP category (A01, A02, etc.)
  console.log(finding.title); // Vulnerability title
  console.log(finding.severity); // Severity level
  console.log(finding.location); // Code location
  console.log(finding.remediation); // Fix guidance
});
```

---

## PerformanceBenchmarker

Performance testing and benchmarking component.

### Constructor

```typescript
constructor(config: PerformanceBenchmarkConfig)
```

**Parameters:**
- `config: PerformanceBenchmarkConfig` - Performance benchmark configuration

**Example:**
```typescript
import { PerformanceBenchmarker } from './qa/PerformanceBenchmarker';

const benchmarker = new PerformanceBenchmarker({
  types: ['load', 'stress'],
  duration: 60,
  concurrency: 50,
  thresholds: {
    responseTime: 200,
    throughput: 1000,
    errorRate: 0.01
  }
});
```

### Methods

#### runBenchmark()

Execute performance benchmark suite.

```typescript
async runBenchmark(
  target: BenchmarkTarget,
  options?: BenchmarkOptions
): Promise<BenchmarkResult>
```

**Parameters:**
- `target: BenchmarkTarget` - Target to benchmark
- `options?: BenchmarkOptions` - Benchmark options

**Returns:** `Promise<BenchmarkResult>`

**Example:**
```typescript
const result = await benchmarker.runBenchmark({
  type: 'http',
  url: 'http://localhost:3000/api/users',
  method: 'GET',
  headers: { Authorization: 'Bearer token' }
}, {
  duration: 60,
  concurrency: 50
});

console.log(result.metrics.responseTime); // { p50: 120, p95: 180, p99: 250 }
console.log(result.metrics.throughput); // 1200
console.log(result.metrics.errorRate); // 0.005
console.log(result.passed); // true
```

**BenchmarkResult:**
```typescript
{
  metrics: {
    responseTime: {
      p50: number,
      p95: number,
      p99: number,
      mean: number,
      min: number,
      max: number
    },
    throughput: number,
    errorRate: number,
    requests: {
      total: number,
      successful: number,
      failed: number
    },
    resources: {
      cpu: number,
      memory: number,
      network: number
    }
  },
  passed: boolean,
  baseline: BaselineMetrics,
  regression: RegressionAnalysis
}
```

---

#### runLoadTest()

Execute load test with normal traffic patterns.

```typescript
async runLoadTest(
  target: BenchmarkTarget,
  duration: number,
  rps: number
): Promise<LoadTestResult>
```

**Parameters:**
- `target: BenchmarkTarget` - Target endpoint
- `duration: number` - Test duration in seconds
- `rps: number` - Requests per second

**Returns:** `Promise<LoadTestResult>`

**Example:**
```typescript
const result = await benchmarker.runLoadTest(
  { type: 'http', url: 'http://localhost:3000/api/data' },
  60,
  100
);

console.log(result.sustainedThroughput); // 98.5
console.log(result.averageResponseTime); // 145
console.log(result.errorRate); // 0.002
```

---

#### runStressTest()

Execute stress test to find breaking point.

```typescript
async runStressTest(
  target: BenchmarkTarget,
  maxRPS: number
): Promise<StressTestResult>
```

**Parameters:**
- `target: BenchmarkTarget` - Target endpoint
- `maxRPS: number` - Maximum requests per second

**Returns:** `Promise<StressTestResult>`

**Example:**
```typescript
const result = await benchmarker.runStressTest(
  { type: 'http', url: 'http://localhost:3000/api/heavy' },
  1000
);

console.log(result.breakingPoint); // 850 RPS
console.log(result.maxThroughput); // 840
console.log(result.degradationPoint); // 750 RPS
console.log(result.recovery); // true
```

---

#### analyzeRegression()

Analyze performance regression against baseline.

```typescript
analyzeRegression(
  current: PerformanceMetrics,
  baseline: PerformanceMetrics
): RegressionAnalysis
```

**Parameters:**
- `current: PerformanceMetrics` - Current metrics
- `baseline: PerformanceMetrics` - Baseline metrics

**Returns:** `RegressionAnalysis`

**Example:**
```typescript
const analysis = benchmarker.analyzeRegression(currentMetrics, baselineMetrics);

console.log(analysis.hasRegression); // true
console.log(analysis.severity); // 'moderate'
console.log(analysis.metrics.responseTime.change); // +15%
console.log(analysis.metrics.throughput.change); // -8%
console.log(analysis.recommendations); // Array of optimization suggestions
```

---

#### compareBaseline()

Compare current metrics against stored baseline.

```typescript
async compareBaseline(
  current: PerformanceMetrics,
  baselineId: string
): Promise<ComparisonResult>
```

**Parameters:**
- `current: PerformanceMetrics` - Current metrics
- `baselineId: string` - Baseline identifier

**Returns:** `Promise<ComparisonResult>`

**Example:**
```typescript
const comparison = await benchmarker.compareBaseline(metrics, 'main-branch');

console.log(comparison.status); // 'improved' | 'regressed' | 'neutral'
console.log(comparison.changes); // Detailed metric changes
console.log(comparison.significantChanges); // Only significant changes
```

---

## Types and Interfaces

### QAConfig

```typescript
interface QAConfig {
  testGeneration: TestGenerationConfig;
  securityScan: SecurityScanConfig;
  performanceBenchmark: PerformanceBenchmarkConfig;
  qualityGates: QualityGatesConfig;
  evidenceDir?: string;
  parallel?: boolean;
  timeout?: number;
}
```

### TestGenerationConfig

```typescript
interface TestGenerationConfig {
  enabled: boolean;
  framework: 'jest' | 'mocha' | 'vitest';
  coverageTarget: number;
  generateMocks: boolean;
  edgeCases: boolean;
  templates?: {
    unit?: string;
    integration?: string;
    e2e?: string;
  };
  mockStrategies?: {
    api?: 'sinon-stub' | 'nock' | 'msw';
    database?: 'in-memory' | 'mock' | 'test-container';
    external?: 'nock' | 'mock-server';
  };
}
```

### SecurityScanConfig

```typescript
interface SecurityScanConfig {
  enabled: boolean;
  tools: Array<'npm-audit' | 'semgrep' | 'secret-scan' | 'owasp-check'>;
  failOnCritical: boolean;
  ignoreDevDependencies: boolean;
  customRules?: SecurityRule[];
  whitelist?: VulnerabilityWhitelist[];
}
```

### PerformanceBenchmarkConfig

```typescript
interface PerformanceBenchmarkConfig {
  enabled: boolean;
  types: Array<'load' | 'stress' | 'spike' | 'endurance'>;
  duration: number;
  concurrency: number;
  thresholds: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  baselineMode?: 'manual' | 'auto-update' | 'branch-based';
}
```

### QualityGatesConfig

```typescript
interface QualityGatesConfig {
  enforceStrict: boolean;
  allowOverride: boolean;
  notifyOnFailure: boolean;
  gates: {
    testCoverage: {
      minimum: number;
      critical: number;
    };
    securityScan: {
      maxCritical: number;
      maxHigh: number;
      maxMedium: number;
    };
    performance: {
      maxResponseTime: number;
      minThroughput: number;
      maxErrorRate: number;
      maxRegression: number;
    };
  };
}
```

### Vulnerability

```typescript
interface Vulnerability {
  id: string;
  cve?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  package?: string;
  version?: string;
  title: string;
  description: string;
  fixedIn?: string;
  recommendation: string;
  references: string[];
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
    min: number;
    max: number;
  };
  throughput: number;
  errorRate: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
  };
  resources: {
    cpu: number;
    memory: number;
    network: number;
  };
}
```

## Usage Examples

### Complete QA Workflow

```typescript
import { QAManager } from './qa/QAManager';
import { GitHubService } from './github/GitHubService';

async function runCompleteQA() {
  // Initialize
  const github = new GitHubService(process.env.GITHUB_TOKEN);
  const qaManager = new QAManager({
    testGeneration: { enabled: true, coverageTarget: 85 },
    securityScan: { enabled: true, failOnCritical: true },
    performanceBenchmark: { enabled: true, duration: 60 },
    qualityGates: { enforceStrict: true }
  }, github);

  const taskId = 'feature-123';
  const sourceCode = await readFile('./src/feature.ts', 'utf-8');

  try {
    // Start QA
    await qaManager.startQA(taskId);

    // Execute QA suite
    const results = await qaManager.executeQA(taskId, sourceCode, {
      type: 'feature',
      language: 'typescript',
      framework: 'express'
    });

    // Evaluate quality gates
    const passed = await qaManager.evaluateQualityGates(taskId, results);

    if (!passed) {
      console.error('Quality gates failed:', results);
      // Handle failure
      return false;
    }

    // Finalize
    await qaManager.finalizeQA(taskId, true);

    console.log('QA completed successfully');
    return true;

  } catch (error) {
    console.error('QA failed:', error);
    await qaManager.finalizeQA(taskId, false);
    return false;
  }
}
```

### Selective Component Testing

```typescript
import { TestGenerator, SecurityScanner } from './qa';

async function runSelectiveQA() {
  // Only run test generation and security scan
  const generator = new TestGenerator({
    framework: 'jest',
    coverageTarget: 80,
    generateMocks: true
  });

  const scanner = new SecurityScanner({
    tools: ['npm-audit', 'semgrep'],
    failOnCritical: true
  });

  // Generate tests
  const testResults = await generator.generateTests(sourceCode, {
    language: 'typescript',
    type: 'api-endpoint'
  });

  // Scan security
  const scanResults = await scanner.scan(sourceCode, dependencies);

  return {
    tests: testResults,
    security: scanResults
  };
}
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-30
**Maintainers:** Task Sentinel Team
