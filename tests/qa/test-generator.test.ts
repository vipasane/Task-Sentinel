/**
 * Tests for Automated Test Generation System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TestGenerator,
  TestGeneratorFactory,
  TestGeneratorConfig,
  TestType,
  GeneratedTest,
  CoverageGap,
  FunctionSignature,
} from '../../src/qa/test-generator';

describe('TestGenerator', () => {
  let generator: TestGenerator;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp-test-gen');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'tests'), { recursive: true });

    const config: TestGeneratorConfig = {
      sourceDir: path.join(tempDir, 'src'),
      testDir: path.join(tempDir, 'tests'),
      framework: 'jest',
      testTypes: ['unit', 'integration', 'performance'],
      coverageThreshold: 80,
      mockStyle: 'auto',
      assertionStyle: 'expect',
    };

    generator = new TestGenerator(config);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should create generator with valid configuration', () => {
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(TestGenerator);
    });

    it('should initialize with default configuration using factory', () => {
      const defaultGenerator = TestGeneratorFactory.create();
      expect(defaultGenerator).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customGenerator = TestGeneratorFactory.create({
        framework: 'mocha',
        testTypes: ['unit'],
        coverageThreshold: 90,
      });
      expect(customGenerator).toBeDefined();
    });
  });

  describe('source file discovery', () => {
    beforeEach(async () => {
      // Create sample source files
      await fs.writeFile(
        path.join(tempDir, 'src', 'module1.ts'),
        'export function add(a: number, b: number): number { return a + b; }'
      );
      await fs.writeFile(
        path.join(tempDir, 'src', 'module2.ts'),
        'export class Calculator { multiply(a: number, b: number): number { return a * b; } }'
      );
    });

    it('should discover all TypeScript source files', async () => {
      const tests = await generator.generateTests();
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should skip test files during discovery', async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'module1.test.ts'),
        'test content'
      );
      const tests = await generator.generateTests();
      expect(tests.every(t => !t.filePath.includes('.test.ts'))).toBe(true);
    });
  });

  describe('unit test generation', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'math.ts'),
        `
export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export async function asyncOperation(value: string): Promise<string> {
  return Promise.resolve(value.toUpperCase());
}
        `
      );
    });

    it('should generate unit tests for exported functions', async () => {
      const tests = await generator.generateTests();
      const unitTests = tests.filter(t => t.testType === 'unit');

      expect(unitTests.length).toBeGreaterThan(0);
      expect(unitTests[0].content).toContain('describe');
      expect(unitTests[0].content).toContain('it');
      expect(unitTests[0].content).toContain('expect');
    });

    it('should generate tests for async functions', async () => {
      const tests = await generator.generateTests();
      const asyncTests = tests.filter(t => t.content.includes('asyncOperation'));

      expect(asyncTests.length).toBeGreaterThan(0);
      expect(asyncTests[0].content).toContain('async');
      expect(asyncTests[0].content).toContain('await');
    });

    it('should include error handling tests', async () => {
      const tests = await generator.generateTests();
      const errorTests = tests.filter(t => t.content.includes('should handle invalid inputs'));

      expect(errorTests.length).toBeGreaterThan(0);
    });

    it('should include edge case tests', async () => {
      const tests = await generator.generateTests();
      const edgeCaseTests = tests.filter(t => t.content.includes('should handle edge cases'));

      expect(edgeCaseTests.length).toBeGreaterThan(0);
    });
  });

  describe('class test generation', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'calculator.ts'),
        `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  async divide(a: number, b: number): Promise<number> {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }
}
        `
      );
    });

    it('should generate tests for class methods', async () => {
      const tests = await generator.generateTests();
      const classTests = tests.filter(t => t.content.includes('Calculator'));

      expect(classTests.length).toBeGreaterThan(0);
      expect(classTests[0].content).toContain('beforeEach');
    });

    it('should generate tests for all public methods', async () => {
      const tests = await generator.generateTests();
      const calculatorTests = tests.filter(t => t.content.includes('Calculator'));

      const testContent = calculatorTests[0]?.content || '';
      expect(testContent).toContain('add');
      expect(testContent).toContain('multiply');
    });
  });

  describe('integration test generation', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'api.ts'),
        `
export async function fetchUserData(userId: string): Promise<User> {
  const response = await fetch(\`/api/users/\${userId}\`);
  return response.json();
}

export async function saveUser(user: User): Promise<void> {
  await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}
        `
      );
    });

    it('should generate integration tests for API functions', async () => {
      const tests = await generator.generateTests();
      const integrationTests = tests.filter(t => t.testType === 'integration');

      expect(integrationTests.length).toBeGreaterThan(0);
    });

    it('should include setup and teardown hooks', async () => {
      const tests = await generator.generateTests();
      const integrationTests = tests.filter(t => t.testType === 'integration');

      if (integrationTests.length > 0) {
        expect(integrationTests[0].content).toContain('beforeAll');
        expect(integrationTests[0].content).toContain('afterAll');
      }
    });

    it('should generate mocks for HTTP clients', async () => {
      const tests = await generator.generateTests();
      const integrationTests = tests.filter(t => t.testType === 'integration');

      if (integrationTests.length > 0) {
        expect(integrationTests[0].mocks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('performance test generation', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'heavy.ts'),
        `
export function computeHeavyOperation(data: number[]): number {
  return data.reduce((sum, val) => sum + val, 0);
}

export async function asyncHeavyOperation(data: string[]): Promise<string[]> {
  return data.map(s => s.toUpperCase());
}
        `
      );
    });

    it('should generate performance tests', async () => {
      const tests = await generator.generateTests();
      const perfTests = tests.filter(t => t.testType === 'performance');

      expect(perfTests.length).toBeGreaterThan(0);
    });

    it('should include timing assertions', async () => {
      const tests = await generator.generateTests();
      const perfTests = tests.filter(t => t.testType === 'performance');

      if (perfTests.length > 0) {
        expect(perfTests[0].content).toContain('Date.now()');
        expect(perfTests[0].content).toContain('toBeLessThan');
      }
    });

    it('should include memory leak tests', async () => {
      const tests = await generator.generateTests();
      const perfTests = tests.filter(t => t.testType === 'performance');

      if (perfTests.length > 0) {
        expect(perfTests[0].content).toContain('memoryUsage');
      }
    });
  });

  describe('security test generation', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'auth.ts'),
        `
export async function authenticateUser(username: string, password: string): Promise<string> {
  // Authentication logic
  return 'token';
}

export async function validateToken(token: string): Promise<boolean> {
  // Token validation
  return true;
}
        `
      );
    });

    it('should generate security tests for auth functions', async () => {
      const tests = await generator.generateTests();
      const securityTests = tests.filter(t => t.testType === 'security');

      expect(securityTests.length).toBeGreaterThan(0);
    });

    it('should include XSS prevention tests', async () => {
      const tests = await generator.generateTests();
      const securityTests = tests.filter(t => t.testType === 'security');

      if (securityTests.length > 0) {
        expect(securityTests[0].content).toContain('script');
      }
    });

    it('should include SQL injection tests', async () => {
      const tests = await generator.generateTests();
      const securityTests = tests.filter(t => t.testType === 'security');

      if (securityTests.length > 0) {
        expect(securityTests[0].content).toContain('SQL');
      }
    });

    it('should include authentication tests', async () => {
      const tests = await generator.generateTests();
      const securityTests = tests.filter(t => t.testType === 'security');

      if (securityTests.length > 0) {
        expect(securityTests[0].content).toContain('Unauthorized');
      }
    });
  });

  describe('mock generation', () => {
    it('should generate mocks for complex types', async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'service.ts'),
        `
export interface Database {
  query(sql: string): Promise<any>;
}

export async function fetchData(db: Database): Promise<any> {
  return db.query('SELECT * FROM users');
}
        `
      );

      const tests = await generator.generateTests();
      const testsWithMocks = tests.filter(t => t.mocks.length > 0);

      expect(testsWithMocks.length).toBeGreaterThan(0);
    });

    it('should not generate mocks for primitive types', async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'simple.ts'),
        `
export function processString(value: string): string {
  return value.toUpperCase();
}
        `
      );

      const tests = await generator.generateTests();
      const simpleTests = tests.filter(t => t.content.includes('processString'));

      if (simpleTests.length > 0) {
        expect(simpleTests[0].mocks.length).toBe(0);
      }
    });
  });

  describe('coverage gap detection', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'uncovered.ts'),
        'export function uncoveredFunction(): void {}'
      );
    });

    it('should detect files without tests', async () => {
      const gaps = await generator.detectCoverageGaps();
      expect(gaps.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for coverage gaps', async () => {
      const gaps = await generator.detectCoverageGaps();
      expect(gaps[0].suggestion).toBeDefined();
    });
  });

  describe('test file writing', () => {
    it('should write generated tests to disk', async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'example.ts'),
        'export function example(): void {}'
      );

      const tests = await generator.generateTests();
      await generator.writeGeneratedTests(tests);

      const testFiles = await fs.readdir(path.join(tempDir, 'tests'), { recursive: true });
      expect(testFiles.length).toBeGreaterThan(0);
    });

    it('should create necessary directories', async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'nested', 'module.ts'),
        'export function nested(): void {}'
      );

      const tests = await generator.generateTests();
      await generator.writeGeneratedTests(tests);

      const testDir = path.join(tempDir, 'tests', 'nested');
      const exists = await fs.access(testDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('fixture generation', () => {
    it('should generate test fixtures', async () => {
      const functions: FunctionSignature[] = [
        {
          name: 'testFunc',
          parameters: [
            { name: 'id', type: 'string', optional: false },
            { name: 'count', type: 'number', optional: false },
          ],
          returnType: 'void',
          isAsync: false,
          isExported: true,
        },
      ];

      const fixtures = generator.generateFixtures(functions);
      expect(fixtures.length).toBe(2);
      expect(fixtures[0].name).toContain('testFunc');
    });

    it('should generate appropriate data types', async () => {
      const functions: FunctionSignature[] = [
        {
          name: 'testFunc',
          parameters: [
            { name: 'flag', type: 'boolean', optional: false },
          ],
          returnType: 'void',
          isAsync: false,
          isExported: true,
        },
      ];

      const fixtures = generator.generateFixtures(functions);
      expect(fixtures[0].data).toBe(true);
    });
  });

  describe('test framework support', () => {
    it('should generate Jest-compatible tests', async () => {
      const jestGenerator = TestGeneratorFactory.create({
        sourceDir: path.join(tempDir, 'src'),
        testDir: path.join(tempDir, 'tests'),
        framework: 'jest',
      });

      await fs.writeFile(
        path.join(tempDir, 'src', 'jest-test.ts'),
        'export function jestFunc(): void {}'
      );

      const tests = await jestGenerator.generateTests();
      expect(tests[0].content).toContain('@jest/globals');
    });

    it('should generate Mocha-compatible tests', async () => {
      const mochaGenerator = TestGeneratorFactory.create({
        sourceDir: path.join(tempDir, 'src'),
        testDir: path.join(tempDir, 'tests'),
        framework: 'mocha',
      });

      await fs.writeFile(
        path.join(tempDir, 'src', 'mocha-test.ts'),
        'export function mochaFunc(): void {}'
      );

      const tests = await mochaGenerator.generateTests();
      expect(tests[0].content).toContain('mocha');
    });

    it('should generate Vitest-compatible tests', async () => {
      const vitestGenerator = TestGeneratorFactory.create({
        sourceDir: path.join(tempDir, 'src'),
        testDir: path.join(tempDir, 'tests'),
        framework: 'vitest',
      });

      await fs.writeFile(
        path.join(tempDir, 'src', 'vitest-test.ts'),
        'export function vitestFunc(): void {}'
      );

      const tests = await vitestGenerator.generateTests();
      expect(tests[0].content).toContain('vitest');
    });
  });

  describe('error handling', () => {
    it('should handle missing source directory', async () => {
      const invalidGenerator = TestGeneratorFactory.create({
        sourceDir: '/nonexistent/path',
        testDir: path.join(tempDir, 'tests'),
      });

      const tests = await invalidGenerator.generateTests();
      expect(tests.length).toBe(0);
    });

    it('should handle invalid TypeScript files', async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'invalid.ts'),
        'this is not valid typescript {{{'
      );

      const tests = await generator.generateTests();
      // Should not crash, may have empty tests
      expect(Array.isArray(tests)).toBe(true);
    });
  });

  describe('test quality metrics', () => {
    it('should track coverage increase', async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'metrics.ts'),
        'export function testMetrics(): void {}'
      );

      const tests = await generator.generateTests();
      expect(tests[0].coverageIncrease).toBeGreaterThan(0);
    });

    it('should generate multiple test types', async () => {
      await fs.writeFile(
        path.join(tempDir, 'src', 'multi.ts'),
        `
export async function fetchData(): Promise<any> {
  return {};
}
        `
      );

      const tests = await generator.generateTests();
      const testTypes = new Set(tests.map(t => t.testType));
      expect(testTypes.size).toBeGreaterThan(1);
    });
  });
});
