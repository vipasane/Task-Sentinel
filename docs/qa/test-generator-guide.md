# Automated Test Generation System Guide

## Overview

The Automated Test Generation System for Task Sentinel Phase 4 automatically creates comprehensive test suites by analyzing source code and generating unit, integration, E2E, performance, and security tests.

## Features

### 1. **Multi-Type Test Generation**
- **Unit Tests**: Function and class method testing
- **Integration Tests**: API and system integration testing
- **E2E Tests**: Complete workflow testing
- **Performance Tests**: Benchmarking and memory leak detection
- **Security Tests**: Vulnerability and attack prevention testing

### 2. **Intelligent Code Analysis**
- TypeScript AST parsing
- Function signature extraction
- Class structure analysis
- Dependency detection
- Export/import mapping

### 3. **Automatic Mock Generation**
- Complex type mocking
- HTTP client mocks
- Database connection mocks
- Service dependency mocks
- Custom mock implementations

### 4. **Coverage Gap Detection**
- Identifies untested files
- Highlights missing test cases
- Suggests test improvements
- Tracks coverage metrics

### 5. **Multi-Framework Support**
- Jest
- Mocha/Chai
- Vitest
- Configurable assertion styles

## Installation

```bash
npm install --save-dev typescript @types/node
```

## Quick Start

### Basic Usage

```typescript
import { TestGeneratorFactory } from './src/qa/test-generator';

const generator = TestGeneratorFactory.create({
  sourceDir: './src',
  testDir: './tests',
  framework: 'jest',
  testTypes: ['unit', 'integration'],
});

const tests = await generator.generateTests();
await generator.writeGeneratedTests(tests);
```

## Configuration

### TestGeneratorConfig

```typescript
interface TestGeneratorConfig {
  sourceDir: string;           // Source code directory
  testDir: string;             // Test output directory
  framework: 'jest' | 'mocha' | 'vitest';
  testTypes: TestType[];       // Types of tests to generate
  coverageThreshold: number;   // Target coverage percentage
  mockStyle: 'manual' | 'auto' | 'sinon';
  assertionStyle: 'expect' | 'assert' | 'should';
}
```

## Test Types

### Unit Tests

Tests individual functions and class methods in isolation.

```typescript
const generator = TestGeneratorFactory.create({
  testTypes: ['unit'],
  // ... other config
});
```

**Generated Output:**
- Function tests with multiple scenarios
- Class method tests with mocks
- Error handling tests
- Edge case tests
- Async function tests

### Integration Tests

Tests interactions between components and external systems.

```typescript
const generator = TestGeneratorFactory.create({
  testTypes: ['integration'],
  // ... other config
});
```

**Generated Output:**
- API integration tests
- Database integration tests
- Service integration tests
- Setup/teardown hooks
- Mock external dependencies

### E2E Tests

Tests complete user workflows and system behavior.

```typescript
const generator = TestGeneratorFactory.create({
  testTypes: ['e2e'],
  // ... other config
});
```

**Generated Output:**
- Full workflow tests
- Multi-step process tests
- System-wide integration tests
- Failure scenario tests

### Performance Tests

Tests execution speed, memory usage, and scalability.

```typescript
const generator = TestGeneratorFactory.create({
  testTypes: ['performance'],
  // ... other config
});
```

**Generated Output:**
- Execution time benchmarks
- Memory leak detection
- Throughput measurements
- Load testing scenarios

### Security Tests

Tests for vulnerabilities and attack prevention.

```typescript
const generator = TestGeneratorFactory.create({
  testTypes: ['security'],
  // ... other config
});
```

**Generated Output:**
- XSS prevention tests
- SQL injection tests
- Authentication tests
- Authorization tests
- Input sanitization tests

## Advanced Features

### Coverage Gap Detection

```typescript
const generator = TestGeneratorFactory.create({
  sourceDir: './src',
  testDir: './tests',
  framework: 'jest',
  testTypes: ['unit'],
});

const gaps = await generator.detectCoverageGaps();

gaps.forEach(gap => {
  console.log(`File: ${gap.file}`);
  console.log(`Missing: ${gap.function}`);
  console.log(`Suggestion: ${gap.suggestion}`);
});
```

### Custom Mock Generation

The system automatically generates mocks for complex types:

```typescript
// Source code
export async function fetchUser(db: Database): Promise<User> {
  return db.query('SELECT * FROM users');
}

// Generated mock
const mockDb = {
  query: jest.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
};
```

### Test Fixtures

Generate reusable test data:

```typescript
const generator = TestGeneratorFactory.create({
  // ... config
});

const functions = await generator.extractFunctions(sourceFile);
const fixtures = generator.generateFixtures(functions);

// Use fixtures in tests
fixtures.forEach(fixture => {
  console.log(`Fixture: ${fixture.name}`);
  console.log(`Data: ${JSON.stringify(fixture.data)}`);
});
```

## Framework-Specific Configuration

### Jest

```typescript
const generator = TestGeneratorFactory.create({
  framework: 'jest',
  assertionStyle: 'expect',
  mockStyle: 'auto',
});
```

**Generated Import:**
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
```

### Mocha/Chai

```typescript
const generator = TestGeneratorFactory.create({
  framework: 'mocha',
  assertionStyle: 'should',
  mockStyle: 'sinon',
});
```

**Generated Import:**
```typescript
import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
```

### Vitest

```typescript
const generator = TestGeneratorFactory.create({
  framework: 'vitest',
  assertionStyle: 'expect',
  mockStyle: 'auto',
});
```

**Generated Import:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
```

## Best Practices

### 1. Organize Test Files

```
project/
├── src/
│   ├── api/
│   │   └── users.ts
│   └── services/
│       └── auth.ts
└── tests/
    ├── unit/
    │   ├── api/
    │   │   └── users.test.ts
    │   └── services/
    │       └── auth.test.ts
    ├── integration/
    │   └── api.integration.test.ts
    └── e2e/
        └── workflows.e2e.test.ts
```

### 2. Set Coverage Thresholds

```typescript
const generator = TestGeneratorFactory.create({
  coverageThreshold: 90,
  testTypes: ['unit', 'integration'],
});
```

### 3. Incremental Generation

```typescript
// Detect gaps first
const gaps = await generator.detectCoverageGaps();

// Generate only for uncovered files
if (gaps.length > 0) {
  const tests = await generator.generateTests();
  await generator.writeGeneratedTests(tests);
}
```

### 4. CI/CD Integration

```typescript
// In CI pipeline
const generator = TestGeneratorFactory.create({
  sourceDir: './src',
  testDir: './tests',
  framework: 'jest',
  testTypes: ['unit', 'integration', 'security'],
  coverageThreshold: 90,
});

const gaps = await generator.detectCoverageGaps();
if (gaps.length > 0) {
  const tests = await generator.generateTests();
  await generator.writeGeneratedTests(tests);

  // Fail CI if coverage is too low
  process.exit(1);
}
```

## Test Output Examples

### Generated Unit Test

```typescript
describe('calculateDiscount', () => {
  it('should execute successfully with valid inputs', () => {
    const result = calculateDiscount(100, 0.1);
    expect(result).toBeDefined();
    expect(result).toBe(10);
  });

  it('should handle invalid inputs', () => {
    expect(() => calculateDiscount(null, 0.1)).toThrow();
  });

  it('should handle edge cases', () => {
    const result = calculateDiscount(0, 0);
    expect(result).toBeDefined();
  });
});
```

### Generated Integration Test

```typescript
describe('fetchUserData integration', () => {
  const mockHttpClient = {
    get: jest.fn().mockResolvedValue({ data: {} }),
  };

  beforeAll(async () => {
    // Setup integration test environment
  });

  afterAll(async () => {
    // Cleanup integration test environment
  });

  it('should integrate with external systems', async () => {
    const result = await fetchUserData('user-123');
    expect(result).toBeDefined();
  });

  it('should handle integration errors gracefully', async () => {
    await expect(fetchUserData('invalid-id')).rejects.toThrow();
  });
});
```

### Generated Performance Test

```typescript
describe('computeHeavyOperation performance', () => {
  it('should execute within acceptable time', () => {
    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      computeHeavyOperation([1, 2, 3, 4, 5]);
    }

    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;

    expect(avgTime).toBeLessThan(10);
  });

  it('should not leak memory', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 1000; i++) {
      computeHeavyOperation([1, 2, 3, 4, 5]);
    }

    global.gc && global.gc();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

### Generated Security Test

```typescript
describe('authenticateUser security', () => {
  it('should sanitize inputs', async () => {
    const maliciousInput = "<script>alert('xss')</script>";
    await expect(() => authenticateUser(maliciousInput, 'password')).not.toThrow();
  });

  it('should prevent SQL injection', async () => {
    const sqlInjection = "'; DROP TABLE users; --";
    await expect(() => authenticateUser(sqlInjection, 'password')).not.toThrow();
  });

  it('should validate authentication', async () => {
    const invalidToken = 'invalid-token';
    await expect(authenticateUser('user', invalidToken)).rejects.toThrow('Unauthorized');
  });

  it('should enforce authorization', async () => {
    const unauthorizedUser = { role: 'guest' };
    await expect(authenticateUser(unauthorizedUser, 'password')).rejects.toThrow('Forbidden');
  });
});
```

## Troubleshooting

### Common Issues

1. **No tests generated**
   - Check source directory path
   - Verify TypeScript files are present
   - Ensure functions are exported

2. **Invalid TypeScript syntax**
   - Update TypeScript version
   - Check tsconfig.json configuration
   - Validate source code syntax

3. **Mock generation fails**
   - Verify type definitions
   - Check complex type structures
   - Review mock style configuration

4. **Tests don't run**
   - Verify framework installation
   - Check test runner configuration
   - Review generated import statements

## API Reference

### TestGenerator Class

#### Methods

- `generateTests(): Promise<GeneratedTest[]>` - Generate all tests
- `detectCoverageGaps(): Promise<CoverageGap[]>` - Find untested code
- `writeGeneratedTests(tests: GeneratedTest[]): Promise<void>` - Write tests to disk
- `generateFixtures(functions: FunctionSignature[]): TestFixture[]` - Create test fixtures

### TestGeneratorFactory Class

#### Methods

- `static create(config?: Partial<TestGeneratorConfig>): TestGenerator` - Factory method

## Performance Considerations

- **Large codebases**: Process files in batches
- **Memory usage**: Generate tests per module
- **Disk I/O**: Batch file writes
- **Parse time**: Cache AST results

## Contributing

See the main Task Sentinel documentation for contribution guidelines.

## License

MIT License - see LICENSE file for details.
