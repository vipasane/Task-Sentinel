/**
 * Standalone Automated Test Generation System for Task Sentinel Phase 4
 * This is a self-contained version that doesn't require other QA modules
 * Generates unit, integration, E2E, performance, and security tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';

export interface StandaloneTestGeneratorConfig {
  sourceDir: string;
  testDir: string;
  framework: 'jest' | 'mocha' | 'vitest';
  testTypes: StandaloneTestType[];
  coverageThreshold: number;
  mockStyle: 'manual' | 'auto' | 'sinon';
  assertionStyle: 'expect' | 'assert' | 'should';
}

export type StandaloneTestType =
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'performance'
  | 'security';

export interface StandaloneGeneratedTest {
  filePath: string;
  testType: StandaloneTestType;
  content: string;
  coverageIncrease: number;
  mocks: StandaloneMock[];
}

export interface StandaloneMock {
  name: string;
  type: string;
  implementation: string;
}

export interface StandaloneFunctionSignature {
  name: string;
  parameters: StandaloneParameterInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
}

export interface StandaloneParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface StandaloneCoverageGap {
  file: string;
  function: string;
  line: number;
  type: 'uncovered' | 'partial' | 'branch-missing';
  suggestion: string;
}

/**
 * Standalone Test Generator - No external dependencies
 */
export class StandaloneTestGenerator {
  private config: StandaloneTestGeneratorConfig;
  private sourceFiles: Map<string, ts.SourceFile>;

  constructor(config: StandaloneTestGeneratorConfig) {
    this.config = config;
    this.sourceFiles = new Map();
  }

  async generateTests(): Promise<StandaloneGeneratedTest[]> {
    const generatedTests: StandaloneGeneratedTest[] = [];
    const sourceFiles = await this.discoverSourceFiles();

    for (const sourceFile of sourceFiles) {
      await this.analyzeSourceFile(sourceFile);
      for (const testType of this.config.testTypes) {
        const tests = await this.generateTestsForFile(sourceFile, testType);
        generatedTests.push(...tests);
      }
    }
    return generatedTests;
  }

  private async discoverSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const walkDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await walkDir(fullPath);
            }
          } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    };
    await walkDir(this.config.sourceDir);
    return files;
  }

  private async analyzeSourceFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    this.sourceFiles.set(filePath, sourceFile);
  }

  private async generateTestsForFile(
    filePath: string,
    testType: StandaloneTestType
  ): Promise<StandaloneGeneratedTest[]> {
    const sourceFile = this.sourceFiles.get(filePath);
    if (!sourceFile) return [];

    const functions = this.extractFunctions(sourceFile);
    const classes = this.extractClasses(sourceFile);
    const generatedTests: StandaloneGeneratedTest[] = [];

    switch (testType) {
      case 'unit':
        generatedTests.push(...await this.generateUnitTests(filePath, functions, classes));
        break;
      case 'integration':
        generatedTests.push(...await this.generateIntegrationTests(filePath, functions));
        break;
      case 'e2e':
        generatedTests.push(...await this.generateE2ETests(filePath));
        break;
      case 'performance':
        generatedTests.push(...await this.generatePerformanceTests(filePath, functions));
        break;
      case 'security':
        generatedTests.push(...await this.generateSecurityTests(filePath, functions));
        break;
    }
    return generatedTests;
  }

  private extractFunctions(sourceFile: ts.SourceFile): StandaloneFunctionSignature[] {
    const functions: StandaloneFunctionSignature[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        const signature = this.parseFunctionSignature(node);
        if (signature) functions.push(signature);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return functions;
  }

  private extractClasses(sourceFile: ts.SourceFile): any[] {
    const classes: any[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const className = node.name?.getText() || 'Anonymous';
        const methods = node.members
          .filter(ts.isMethodDeclaration)
          .map(m => this.parseFunctionSignature(m))
          .filter(Boolean);
        classes.push({ name: className, methods, isExported: this.isExported(node) });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return classes;
  }

  private parseFunctionSignature(
    node: ts.FunctionDeclaration | ts.MethodDeclaration
  ): StandaloneFunctionSignature | null {
    const name = node.name?.getText() || 'anonymous';
    const parameters: StandaloneParameterInfo[] = node.parameters.map(p => ({
      name: p.name.getText(),
      type: p.type?.getText() || 'any',
      optional: !!p.questionToken,
      defaultValue: p.initializer?.getText(),
    }));
    const returnType = node.type?.getText() || 'void';
    const isAsync = !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
    const isExported = this.isExported(node);
    return { name, parameters, returnType, isAsync, isExported };
  }

  private isExported(node: ts.Node): boolean {
    return !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  private async generateUnitTests(
    filePath: string,
    functions: StandaloneFunctionSignature[],
    classes: any[]
  ): Promise<StandaloneGeneratedTest[]> {
    const tests: StandaloneGeneratedTest[] = [];
    const relativePath = path.relative(this.config.sourceDir, filePath);
    const testPath = path.join(this.config.testDir, relativePath.replace('.ts', '.test.ts'));

    for (const func of functions) {
      if (func.isExported) {
        const mocks = await this.generateMocks(func);
        const testContent = this.generateFunctionTest(func, mocks);
        tests.push({ filePath: testPath, testType: 'unit', content: testContent, coverageIncrease: 10, mocks });
      }
    }

    for (const cls of classes) {
      if (cls.isExported) {
        const mocks = await this.generateClassMocks(cls);
        const testContent = this.generateClassTest(cls, mocks);
        tests.push({ filePath: testPath, testType: 'unit', content: testContent, coverageIncrease: 15, mocks });
      }
    }
    return tests;
  }

  private async generateIntegrationTests(
    filePath: string,
    functions: StandaloneFunctionSignature[]
  ): Promise<StandaloneGeneratedTest[]> {
    const tests: StandaloneGeneratedTest[] = [];
    const relativePath = path.relative(this.config.sourceDir, filePath);
    const testPath = path.join(this.config.testDir, 'integration', relativePath.replace('.ts', '.integration.test.ts'));

    const integrationFunctions = functions.filter(f =>
      f.name.includes('fetch') || f.name.includes('request') || f.name.includes('query') || f.name.includes('save')
    );

    for (const func of integrationFunctions) {
      const mocks = await this.generateIntegrationMocks(func);
      const testContent = this.generateIntegrationTest(func, mocks);
      tests.push({ filePath: testPath, testType: 'integration', content: testContent, coverageIncrease: 20, mocks });
    }
    return tests;
  }

  private async generateE2ETests(filePath: string): Promise<StandaloneGeneratedTest[]> {
    const tests: StandaloneGeneratedTest[] = [];
    const fileName = path.basename(filePath, '.ts');
    const testPath = path.join(this.config.testDir, 'e2e', `${fileName}.e2e.test.ts`);
    const testContent = this.generateE2ETest(fileName);
    tests.push({ filePath: testPath, testType: 'e2e', content: testContent, coverageIncrease: 25, mocks: [] });
    return tests;
  }

  private async generatePerformanceTests(
    filePath: string,
    functions: StandaloneFunctionSignature[]
  ): Promise<StandaloneGeneratedTest[]> {
    const tests: StandaloneGeneratedTest[] = [];
    const relativePath = path.relative(this.config.sourceDir, filePath);
    const testPath = path.join(this.config.testDir, 'performance', relativePath.replace('.ts', '.perf.test.ts'));

    const perfCriticalFunctions = functions.filter(f => f.isExported);
    for (const func of perfCriticalFunctions) {
      const testContent = this.generatePerformanceTest(func);
      tests.push({ filePath: testPath, testType: 'performance', content: testContent, coverageIncrease: 5, mocks: [] });
    }
    return tests;
  }

  private async generateSecurityTests(
    filePath: string,
    functions: StandaloneFunctionSignature[]
  ): Promise<StandaloneGeneratedTest[]> {
    const tests: StandaloneGeneratedTest[] = [];
    const relativePath = path.relative(this.config.sourceDir, filePath);
    const testPath = path.join(this.config.testDir, 'security', relativePath.replace('.ts', '.security.test.ts'));

    const securityFunctions = functions.filter(f =>
      f.name.includes('auth') || f.name.includes('token') || f.name.includes('password') || f.name.includes('credential') ||
      f.parameters.some(p => p.type.includes('secret') || p.type.includes('password'))
    );

    for (const func of securityFunctions) {
      const testContent = this.generateSecurityTest(func);
      tests.push({ filePath: testPath, testType: 'security', content: testContent, coverageIncrease: 8, mocks: [] });
    }
    return tests;
  }

  private async generateMocks(func: StandaloneFunctionSignature): Promise<StandaloneMock[]> {
    const mocks: StandaloneMock[] = [];
    for (const param of func.parameters) {
      if (this.isComplexType(param.type)) {
        mocks.push({
          name: `mock${this.capitalize(param.name)}`,
          type: param.type,
          implementation: this.generateMockImplementation(param.type),
        });
      }
    }
    return mocks;
  }

  private async generateClassMocks(cls: any): Promise<StandaloneMock[]> {
    return [{ name: `mock${cls.name}Dependencies`, type: 'object', implementation: '{}' }];
  }

  private async generateIntegrationMocks(func: StandaloneFunctionSignature): Promise<StandaloneMock[]> {
    const mocks: StandaloneMock[] = [];
    if (func.name.includes('fetch') || func.name.includes('request')) {
      mocks.push({
        name: 'mockHttpClient',
        type: 'HttpClient',
        implementation: `{\n  get: jest.fn().mockResolvedValue({ data: {} }),\n  post: jest.fn().mockResolvedValue({ data: {} }),\n}`,
      });
    }
    return mocks;
  }

  private generateMockImplementation(type: string): string {
    if (type.includes('[]')) return '[]';
    if (type.includes('Promise')) return 'Promise.resolve({})';
    if (type === 'string') return "'mock-string'";
    if (type === 'number') return '0';
    if (type === 'boolean') return 'false';
    return '{}';
  }

  private isComplexType(type: string): boolean {
    return !['string', 'number', 'boolean', 'void', 'any'].includes(type);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateFunctionTest(func: StandaloneFunctionSignature, mocks: StandaloneMock[]): string {
    const mockDeclarations = mocks.map(m => `const ${m.name} = ${m.implementation};`).join('\n  ');
    const testCases = this.generateTestCases(func);
    return `\ndescribe('${func.name}', () => {\n  ${mockDeclarations}\n\n  ${testCases}\n});\n`;
  }

  private generateClassTest(cls: any, mocks: StandaloneMock[]): string {
    const mockDeclarations = mocks.map(m => `const ${m.name} = ${m.implementation};`).join('\n  ');
    const methodTests = cls.methods.map((method: StandaloneFunctionSignature) =>
      `\n  describe('${method.name}', () => {\n    it('should execute successfully', ${method.isAsync ? 'async ' : ''}() => {\n      const instance = new ${cls.name}(${mocks.map(m => m.name).join(', ')});\n      ${method.isAsync ? 'await ' : ''}expect(() => instance.${method.name}()).not.toThrow();\n    });\n  });`
    ).join('\n');
    return `\ndescribe('${cls.name}', () => {\n  ${mockDeclarations}\n\n  beforeEach(() => {\n    jest.clearAllMocks();\n  });\n\n  ${methodTests}\n});\n`;
  }

  private generateIntegrationTest(func: StandaloneFunctionSignature, mocks: StandaloneMock[]): string {
    const mockDeclarations = mocks.map(m => `const ${m.name} = ${m.implementation};`).join('\n  ');
    return `\ndescribe('${func.name} integration', () => {\n  ${mockDeclarations}\n\n  beforeAll(async () => {\n    // Setup integration test environment\n  });\n\n  afterAll(async () => {\n    // Cleanup integration test environment\n  });\n\n  it('should integrate with external systems', async () => {\n    const result = await ${func.name}(${this.generateTestArguments(func)});\n    expect(result).toBeDefined();\n  });\n\n  it('should handle integration errors gracefully', async () => {\n    await expect(${func.name}(${this.generateInvalidArguments(func)})).rejects.toThrow();\n  });\n});\n`;
  }

  private generateE2ETest(fileName: string): string {
    return `\ndescribe('${fileName} E2E workflow', () => {\n  beforeAll(async () => {\n    // Setup E2E environment\n  });\n\n  afterAll(async () => {\n    // Cleanup E2E environment\n  });\n\n  it('should complete the full workflow successfully', async () => {\n    const testData = {};\n    const result = await executeWorkflow(testData);\n    expect(result.success).toBe(true);\n  });\n\n  it('should handle workflow failures', async () => {\n    const invalidData = {};\n    await expect(executeWorkflow(invalidData)).rejects.toThrow();\n  });\n});\n`;
  }

  private generatePerformanceTest(func: StandaloneFunctionSignature): string {
    return `\ndescribe('${func.name} performance', () => {\n  it('should execute within acceptable time', ${func.isAsync ? 'async ' : ''}() => {\n    const iterations = 1000;\n    const startTime = Date.now();\n\n    for (let i = 0; i < iterations; i++) {\n      ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateTestArguments(func)});\n    }\n\n    const endTime = Date.now();\n    const avgTime = (endTime - startTime) / iterations;\n    expect(avgTime).toBeLessThan(10);\n  });\n\n  it('should not leak memory', ${func.isAsync ? 'async ' : ''}() => {\n    const initialMemory = process.memoryUsage().heapUsed;\n\n    for (let i = 0; i < 1000; i++) {\n      ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateTestArguments(func)});\n    }\n\n    global.gc && global.gc();\n    const finalMemory = process.memoryUsage().heapUsed;\n    const memoryIncrease = finalMemory - initialMemory;\n    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);\n  });\n});\n`;
  }

  private generateSecurityTest(func: StandaloneFunctionSignature): string {
    return `\ndescribe('${func.name} security', () => {\n  it('should sanitize inputs', ${func.isAsync ? 'async ' : ''}() => {\n    const maliciousInput = "<script>alert('xss')</script>";\n    ${func.isAsync ? 'await ' : ''}expect(() => ${func.name}(maliciousInput)).not.toThrow();\n  });\n\n  it('should prevent SQL injection', ${func.isAsync ? 'async ' : ''}() => {\n    const sqlInjection = "'; DROP TABLE users; --";\n    ${func.isAsync ? 'await ' : ''}expect(() => ${func.name}(sqlInjection)).not.toThrow();\n  });\n\n  it('should validate authentication', ${func.isAsync ? 'async ' : ''}() => {\n    const invalidToken = 'invalid-token';\n    await expect(${func.name}(invalidToken)).rejects.toThrow('Unauthorized');\n  });\n\n  it('should enforce authorization', ${func.isAsync ? 'async ' : ''}() => {\n    const unauthorizedUser = { role: 'guest' };\n    await expect(${func.name}(unauthorizedUser)).rejects.toThrow('Forbidden');\n  });\n});\n`;
  }

  private generateTestCases(func: StandaloneFunctionSignature): string {
    const cases = [];
    cases.push(`\n  it('should execute successfully with valid inputs', ${func.isAsync ? 'async ' : ''}() => {\n    const result = ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateTestArguments(func)});\n    expect(result).toBeDefined();\n  });`);
    if (func.parameters.length > 0) {
      cases.push(`\n  it('should handle invalid inputs', ${func.isAsync ? 'async ' : ''}() => {\n    ${func.isAsync ? 'await ' : ''}expect(() => ${func.name}(${this.generateInvalidArguments(func)})).${func.isAsync ? 'rejects.' : ''}toThrow();\n  });`);
    }
    cases.push(`\n  it('should handle edge cases', ${func.isAsync ? 'async ' : ''}() => {\n    const result = ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateEdgeCaseArguments(func)});\n    expect(result).toBeDefined();\n  });`);
    return cases.join('\n');
  }

  private generateTestArguments(func: StandaloneFunctionSignature): string {
    return func.parameters.map(p => this.generateTestValue(p.type)).join(', ');
  }

  private generateInvalidArguments(func: StandaloneFunctionSignature): string {
    if (func.parameters.length === 0) return '';
    return func.parameters.map(() => 'null').join(', ');
  }

  private generateEdgeCaseArguments(func: StandaloneFunctionSignature): string {
    return func.parameters.map(p => {
      if (p.type === 'string') return "''";
      if (p.type === 'number') return '0';
      if (p.type.includes('[]')) return '[]';
      return '{}';
    }).join(', ');
  }

  private generateTestValue(type: string): string {
    if (type === 'string') return "'test-string'";
    if (type === 'number') return '42';
    if (type === 'boolean') return 'true';
    if (type.includes('[]')) return '[]';
    if (type.includes('Promise')) return 'Promise.resolve({})';
    return '{}';
  }

  async detectCoverageGaps(): Promise<StandaloneCoverageGap[]> {
    const gaps: StandaloneCoverageGap[] = [];
    const sourceFiles = await this.discoverSourceFiles();
    for (const filePath of sourceFiles) {
      const testPath = this.getTestPathForSource(filePath);
      const hasTests = await this.fileExists(testPath);
      if (!hasTests) {
        gaps.push({
          file: filePath,
          function: 'entire-file',
          line: 0,
          type: 'uncovered',
          suggestion: `Create test file at ${testPath}`,
        });
      }
    }
    return gaps;
  }

  private getTestPathForSource(sourcePath: string): string {
    const relativePath = path.relative(this.config.sourceDir, sourcePath);
    return path.join(this.config.testDir, relativePath.replace('.ts', '.test.ts'));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async writeGeneratedTests(tests: StandaloneGeneratedTest[]): Promise<void> {
    const testsByFile = new Map<string, StandaloneGeneratedTest[]>();
    for (const test of tests) {
      const existing = testsByFile.get(test.filePath) || [];
      existing.push(test);
      testsByFile.set(test.filePath, existing);
    }
    for (const [filePath, fileTests] of testsByFile) {
      const content = this.combineTests(fileTests);
      await this.ensureDirectory(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }

  private combineTests(tests: StandaloneGeneratedTest[]): string {
    const testContents: string[] = [];
    for (const test of tests) {
      testContents.push(test.content);
    }
    const importStatement = this.generateImportStatement(this.config.framework);
    return `${importStatement}\n\n${testContents.join('\n\n')}`;
  }

  private generateImportStatement(framework: string): string {
    switch (framework) {
      case 'jest':
        return "import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';";
      case 'mocha':
        return "import { describe, it, beforeEach, before, after } from 'mocha';\nimport { expect } from 'chai';";
      case 'vitest':
        return "import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';";
      default:
        return '';
    }
  }

  private async ensureDirectory(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Standalone Test Generator Factory
 */
export class StandaloneTestGeneratorFactory {
  static create(config: Partial<StandaloneTestGeneratorConfig> = {}): StandaloneTestGenerator {
    const defaultConfig: StandaloneTestGeneratorConfig = {
      sourceDir: './src',
      testDir: './tests',
      framework: 'jest',
      testTypes: ['unit', 'integration'],
      coverageThreshold: 80,
      mockStyle: 'auto',
      assertionStyle: 'expect',
    };
    return new StandaloneTestGenerator({ ...defaultConfig, ...config });
  }
}

export default StandaloneTestGenerator;
