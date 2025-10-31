import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ASTAnalyzer } from './analyzers/ast-analyzer';
import { MockGenerator } from './generators/mock-generator';
import { AssertionGenerator } from './generators/assertion-generator';
import { TestTemplateEngine } from './templates/template-engine';
import { TestFileWriter } from './test-file-writer';

/**
 * TestGenerator - Automated test generation system
 * Parses TypeScript source code and generates comprehensive test suites
 */
export class TestGenerator {
  private astAnalyzer: ASTAnalyzer;
  private mockGenerator: MockGenerator;
  private assertionGenerator: AssertionGenerator;
  private templateEngine: TestTemplateEngine;
  private testFileWriter: TestFileWriter;

  constructor(
    private config: TestGeneratorConfig = {
      coverageTargets: {
        line: 90,
        function: 90,
        branch: 85,
        statement: 80
      },
      testDirectory: 'tests',
      templateStyle: 'jest',
      mockStrategy: 'auto',
      generateEdgeCases: true,
      generateErrorCases: true
    }
  ) {
    this.astAnalyzer = new ASTAnalyzer();
    this.mockGenerator = new MockGenerator(config.mockStrategy);
    this.assertionGenerator = new AssertionGenerator();
    this.templateEngine = new TestTemplateEngine(config.templateStyle);
    this.testFileWriter = new TestFileWriter(config.testDirectory);
  }

  /**
   * Generate comprehensive tests for a source file
   */
  async generateTests(sourceFile: string): Promise<GeneratedTestSuite> {
    console.log(`🧪 Generating tests for: ${sourceFile}`);

    // 1. Parse source code and create AST
    const sourceCode = await fs.readFile(sourceFile, 'utf-8');
    const ast = this.parseTypeScript(sourceCode, sourceFile);

    // 2. Extract testable units
    const analysis = this.astAnalyzer.analyze(ast);
    console.log(`📊 Found: ${analysis.functions.length} functions, ${analysis.classes.length} classes`);

    const generatedTests: GeneratedTest[] = [];

    // 3. Generate unit tests for functions
    for (const func of analysis.functions) {
      const test = await this.generateFunctionTest(func, analysis);
      generatedTests.push(test);
    }

    // 4. Generate class tests
    for (const cls of analysis.classes) {
      const tests = await this.generateClassTests(cls, analysis);
      generatedTests.push(...tests);
    }

    // 5. Generate integration tests
    if (analysis.integrationPoints.length > 0) {
      const integrationTests = await this.generateIntegrationTests(analysis);
      generatedTests.push(...integrationTests);
    }

    // 6. Write test files
    const testFiles = await this.testFileWriter.writeTestFiles(
      sourceFile,
      generatedTests,
      analysis
    );

    return {
      sourceFile,
      testFiles,
      tests: generatedTests,
      coverage: this.estimateCoverage(generatedTests, analysis),
      analysis
    };
  }

  /**
   * Generate tests for multiple source files
   */
  async generateTestsForDirectory(directory: string, pattern: RegExp = /\.ts$/): Promise<GeneratedTestSuite[]> {
    const files = await this.findSourceFiles(directory, pattern);
    console.log(`📁 Found ${files.length} source files to test`);

    const results: GeneratedTestSuite[] = [];
    for (const file of files) {
      try {
        const suite = await this.generateTests(file);
        results.push(suite);
      } catch (error) {
        console.error(`❌ Failed to generate tests for ${file}:`, error);
      }
    }

    return results;
  }

  /**
   * Parse TypeScript source code into AST
   */
  private parseTypeScript(sourceCode: string, fileName: string): ts.SourceFile {
    return ts.createSourceFile(
      fileName,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );
  }

  /**
   * Generate test for a single function
   */
  private async generateFunctionTest(
    func: FunctionInfo,
    analysis: CodeAnalysis
  ): Promise<GeneratedTest> {
    console.log(`  ⚡ Generating test for function: ${func.name}`);

    // Generate mocks for dependencies
    const mocks = await this.mockGenerator.generateMocksForFunction(func, analysis);

    // Generate test cases
    const testCases: TestCase[] = [];

    // Happy path test
    testCases.push(await this.generateHappyPathTest(func, mocks));

    // Edge cases
    if (this.config.generateEdgeCases) {
      testCases.push(...await this.generateEdgeCaseTests(func, mocks));
    }

    // Error cases
    if (this.config.generateErrorCases) {
      testCases.push(...await this.generateErrorCaseTests(func, mocks));
    }

    // Generate test code from template
    const testCode = this.templateEngine.renderFunctionTest({
      function: func,
      testCases,
      mocks,
      imports: analysis.imports
    });

    return {
      type: 'function',
      name: func.name,
      testCases,
      code: testCode,
      mocks,
      coverage: this.estimateTestCoverage(testCases, func)
    };
  }

  /**
   * Generate tests for a class
   */
  private async generateClassTests(
    cls: ClassInfo,
    analysis: CodeAnalysis
  ): Promise<GeneratedTest[]> {
    console.log(`  🏗️  Generating tests for class: ${cls.name}`);

    const tests: GeneratedTest[] = [];

    // Constructor tests
    if (cls.constructor) {
      tests.push(await this.generateConstructorTest(cls, analysis));
    }

    // Method tests
    for (const method of cls.methods) {
      const methodTest = await this.generateMethodTest(cls, method, analysis);
      tests.push(methodTest);
    }

    // Property tests
    if (cls.properties.length > 0) {
      tests.push(await this.generatePropertyTests(cls, analysis));
    }

    return tests;
  }

  /**
   * Generate method test for a class
   */
  private async generateMethodTest(
    cls: ClassInfo,
    method: MethodInfo,
    analysis: CodeAnalysis
  ): Promise<GeneratedTest> {
    console.log(`    🔧 Generating test for method: ${cls.name}.${method.name}`);

    // Generate mocks
    const mocks = await this.mockGenerator.generateMocksForMethod(cls, method, analysis);

    // Generate test cases
    const testCases: TestCase[] = [];

    // Happy path
    testCases.push(await this.generateMethodHappyPathTest(cls, method, mocks));

    // Edge cases
    if (this.config.generateEdgeCases) {
      testCases.push(...await this.generateMethodEdgeCaseTests(cls, method, mocks));
    }

    // Error cases
    if (this.config.generateErrorCases) {
      testCases.push(...await this.generateMethodErrorCaseTests(cls, method, mocks));
    }

    // Generate test code
    const testCode = this.templateEngine.renderMethodTest({
      class: cls,
      method,
      testCases,
      mocks,
      imports: analysis.imports
    });

    return {
      type: 'method',
      name: `${cls.name}.${method.name}`,
      testCases,
      code: testCode,
      mocks,
      coverage: this.estimateTestCoverage(testCases, method)
    };
  }

  /**
   * Generate constructor test
   */
  private async generateConstructorTest(
    cls: ClassInfo,
    analysis: CodeAnalysis
  ): Promise<GeneratedTest> {
    const testCases: TestCase[] = [];

    // Valid construction
    testCases.push({
      name: `should create instance of ${cls.name} with valid parameters`,
      type: 'happy-path',
      setup: this.mockGenerator.generateSetupCode(cls.constructor?.parameters || []),
      action: `const instance = new ${cls.name}(${this.generateConstructorArgs(cls.constructor)});`,
      assertions: [
        `expect(instance).toBeInstanceOf(${cls.name});`,
        ...this.assertionGenerator.generateConstructorAssertions(cls)
      ]
    });

    // Invalid parameters
    if (this.config.generateErrorCases && cls.constructor) {
      testCases.push(...this.generateConstructorErrorTests(cls));
    }

    const testCode = this.templateEngine.renderConstructorTest({
      class: cls,
      testCases,
      imports: analysis.imports
    });

    return {
      type: 'constructor',
      name: `${cls.name}.constructor`,
      testCases,
      code: testCode,
      mocks: [],
      coverage: { line: 100, branch: 80, function: 100, statement: 100 }
    };
  }

  /**
   * Generate property tests
   */
  private async generatePropertyTests(
    cls: ClassInfo,
    analysis: CodeAnalysis
  ): Promise<GeneratedTest> {
    const testCases: TestCase[] = [];

    for (const prop of cls.properties) {
      // Getter test
      if (prop.hasGetter) {
        testCases.push({
          name: `should get ${prop.name} property`,
          type: 'happy-path',
          setup: `const instance = new ${cls.name}();`,
          action: `const value = instance.${prop.name};`,
          assertions: this.assertionGenerator.generatePropertyAssertions(prop)
        });
      }

      // Setter test
      if (prop.hasSetter) {
        testCases.push({
          name: `should set ${prop.name} property`,
          type: 'happy-path',
          setup: `const instance = new ${cls.name}();`,
          action: `instance.${prop.name} = ${this.generateTestValue(prop.type)};`,
          assertions: [
            `expect(instance.${prop.name}).toBe(${this.generateTestValue(prop.type)});`
          ]
        });
      }
    }

    const testCode = this.templateEngine.renderPropertyTest({
      class: cls,
      testCases,
      imports: analysis.imports
    });

    return {
      type: 'property',
      name: `${cls.name}.properties`,
      testCases,
      code: testCode,
      mocks: [],
      coverage: { line: 90, branch: 75, function: 90, statement: 90 }
    };
  }

  /**
   * Generate integration tests
   */
  private async generateIntegrationTests(analysis: CodeAnalysis): Promise<GeneratedTest[]> {
    console.log(`  🔗 Generating integration tests`);

    const tests: GeneratedTest[] = [];

    for (const integrationPoint of analysis.integrationPoints) {
      const testCases = await this.generateIntegrationTestCases(integrationPoint, analysis);

      const testCode = this.templateEngine.renderIntegrationTest({
        integrationPoint,
        testCases,
        imports: analysis.imports
      });

      tests.push({
        type: 'integration',
        name: integrationPoint.name,
        testCases,
        code: testCode,
        mocks: [],
        coverage: { line: 85, branch: 70, function: 85, statement: 85 }
      });
    }

    return tests;
  }

  /**
   * Generate happy path test case
   */
  private async generateHappyPathTest(
    func: FunctionInfo,
    mocks: Mock[]
  ): Promise<TestCase> {
    const args = this.generateFunctionArgs(func.parameters, 'valid');

    return {
      name: `should ${func.name} successfully with valid input`,
      type: 'happy-path',
      setup: this.mockGenerator.generateSetupCode(mocks),
      action: `const result = ${func.isAsync ? 'await ' : ''}${func.name}(${args});`,
      assertions: this.assertionGenerator.generateHappyPathAssertions(func)
    };
  }

  /**
   * Generate edge case tests
   */
  private async generateEdgeCaseTests(
    func: FunctionInfo,
    mocks: Mock[]
  ): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Empty input
    if (this.hasArrayOrObjectParam(func.parameters)) {
      testCases.push({
        name: `should handle empty input for ${func.name}`,
        type: 'edge-case',
        setup: this.mockGenerator.generateSetupCode(mocks),
        action: `const result = ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateEmptyArgs(func.parameters)});`,
        assertions: this.assertionGenerator.generateEdgeCaseAssertions(func, 'empty')
      });
    }

    // Null/undefined
    for (let i = 0; i < func.parameters.length; i++) {
      const param = func.parameters[i];
      if (param.optional || param.type.includes('null') || param.type.includes('undefined')) {
        testCases.push({
          name: `should handle null/undefined ${param.name} for ${func.name}`,
          type: 'edge-case',
          setup: this.mockGenerator.generateSetupCode(mocks),
          action: `const result = ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateNullArgs(func.parameters, i)});`,
          assertions: this.assertionGenerator.generateEdgeCaseAssertions(func, 'null')
        });
      }
    }

    // Boundary values
    testCases.push(...this.generateBoundaryTests(func, mocks));

    return testCases;
  }

  /**
   * Generate error case tests
   */
  private async generateErrorCaseTests(
    func: FunctionInfo,
    mocks: Mock[]
  ): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Invalid input types
    testCases.push({
      name: `should throw error for invalid input in ${func.name}`,
      type: 'error-case',
      setup: this.mockGenerator.generateSetupCode(mocks),
      action: func.isAsync
        ? `await expect(${func.name}(${this.generateInvalidArgs(func.parameters)})).rejects.toThrow();`
        : `expect(() => ${func.name}(${this.generateInvalidArgs(func.parameters)})).toThrow();`,
      assertions: []
    });

    // Error conditions
    if (func.throws.length > 0) {
      for (const errorType of func.throws) {
        testCases.push({
          name: `should throw ${errorType} when error condition occurs`,
          type: 'error-case',
          setup: this.mockGenerator.generateErrorSetupCode(mocks, errorType),
          action: func.isAsync
            ? `await expect(${func.name}(${this.generateFunctionArgs(func.parameters, 'valid')})).rejects.toThrow(${errorType});`
            : `expect(() => ${func.name}(${this.generateFunctionArgs(func.parameters, 'valid')})).toThrow(${errorType});`,
          assertions: []
        });
      }
    }

    return testCases;
  }

  /**
   * Generate method-specific test cases
   */
  private async generateMethodHappyPathTest(
    cls: ClassInfo,
    method: MethodInfo,
    mocks: Mock[]
  ): Promise<TestCase> {
    return {
      name: `should ${method.name} successfully`,
      type: 'happy-path',
      setup: [
        `const instance = new ${cls.name}(${this.generateConstructorArgs(cls.constructor)});`,
        ...this.mockGenerator.generateSetupCode(mocks)
      ].join('\n'),
      action: `const result = ${method.isAsync ? 'await ' : ''}instance.${method.name}(${this.generateFunctionArgs(method.parameters, 'valid')});`,
      assertions: this.assertionGenerator.generateHappyPathAssertions(method)
    };
  }

  private async generateMethodEdgeCaseTests(
    cls: ClassInfo,
    method: MethodInfo,
    mocks: Mock[]
  ): Promise<TestCase[]> {
    return this.generateEdgeCaseTests({ ...method, name: `${cls.name}.${method.name}` } as any, mocks);
  }

  private async generateMethodErrorCaseTests(
    cls: ClassInfo,
    method: MethodInfo,
    mocks: Mock[]
  ): Promise<TestCase[]> {
    return this.generateErrorCaseTests({ ...method, name: `${cls.name}.${method.name}` } as any, mocks);
  }

  /**
   * Helper: Generate constructor arguments
   */
  private generateConstructorArgs(constructor?: ConstructorInfo): string {
    if (!constructor || constructor.parameters.length === 0) return '';
    return this.generateFunctionArgs(constructor.parameters, 'valid');
  }

  private generateConstructorErrorTests(cls: ClassInfo): TestCase[] {
    const testCases: TestCase[] = [];

    if (cls.constructor) {
      testCases.push({
        name: `should throw error with invalid constructor parameters`,
        type: 'error-case',
        setup: '',
        action: `expect(() => new ${cls.name}(${this.generateInvalidArgs(cls.constructor.parameters)})).toThrow();`,
        assertions: []
      });
    }

    return testCases;
  }

  /**
   * Helper: Generate function arguments
   */
  private generateFunctionArgs(parameters: ParameterInfo[], variant: 'valid' | 'invalid' | 'empty' | 'null'): string {
    return parameters
      .map(param => {
        switch (variant) {
          case 'valid': return this.generateTestValue(param.type);
          case 'invalid': return this.generateInvalidValue(param.type);
          case 'empty': return this.generateEmptyValue(param.type);
          case 'null': return 'null';
        }
      })
      .join(', ');
  }

  private generateEmptyArgs(parameters: ParameterInfo[]): string {
    return parameters
      .map(param => this.generateEmptyValue(param.type))
      .join(', ');
  }

  private generateNullArgs(parameters: ParameterInfo[], nullIndex: number): string {
    return parameters
      .map((param, i) => i === nullIndex ? 'null' : this.generateTestValue(param.type))
      .join(', ');
  }

  private generateInvalidArgs(parameters: ParameterInfo[]): string {
    return parameters
      .map(param => this.generateInvalidValue(param.type))
      .join(', ');
  }

  /**
   * Helper: Generate test values based on type
   */
  private generateTestValue(type: string): string {
    const normalizedType = type.toLowerCase().replace(/\[\]/g, '');

    if (type.includes('[]')) {
      return `[${this.generateTestValue(normalizedType)}]`;
    }

    switch (normalizedType) {
      case 'string': return "'test-value'";
      case 'number': return '42';
      case 'boolean': return 'true';
      case 'date': return 'new Date()';
      case 'object': return '{}';
      case 'any': return "{ test: 'value' }";
      case 'promise': return 'Promise.resolve(true)';
      default: return `new ${type}()`;
    }
  }

  private generateInvalidValue(type: string): string {
    // Return wrong type
    const normalizedType = type.toLowerCase();
    switch (normalizedType) {
      case 'string': return '123';
      case 'number': return "'invalid'";
      case 'boolean': return "'not-boolean'";
      case 'object': return 'null';
      case 'array': return 'null';
      default: return 'undefined';
    }
  }

  private generateEmptyValue(type: string): string {
    const normalizedType = type.toLowerCase();
    if (type.includes('[]')) return '[]';
    switch (normalizedType) {
      case 'string': return "''";
      case 'number': return '0';
      case 'object': return '{}';
      case 'array': return '[]';
      default: return 'null';
    }
  }

  /**
   * Helper: Check if function has array or object parameters
   */
  private hasArrayOrObjectParam(parameters: ParameterInfo[]): boolean {
    return parameters.some(p =>
      p.type.includes('[]') ||
      p.type.toLowerCase().includes('object') ||
      p.type.toLowerCase().includes('array')
    );
  }

  /**
   * Generate boundary value tests
   */
  private generateBoundaryTests(func: FunctionInfo, mocks: Mock[]): TestCase[] {
    const testCases: TestCase[] = [];

    for (const param of func.parameters) {
      if (param.type.toLowerCase() === 'number') {
        // Min value
        testCases.push({
          name: `should handle minimum value for ${param.name}`,
          type: 'edge-case',
          setup: this.mockGenerator.generateSetupCode(mocks),
          action: `const result = ${func.isAsync ? 'await ' : ''}${func.name}(Number.MIN_SAFE_INTEGER);`,
          assertions: this.assertionGenerator.generateEdgeCaseAssertions(func, 'boundary')
        });

        // Max value
        testCases.push({
          name: `should handle maximum value for ${param.name}`,
          type: 'edge-case',
          setup: this.mockGenerator.generateSetupCode(mocks),
          action: `const result = ${func.isAsync ? 'await ' : ''}${func.name}(Number.MAX_SAFE_INTEGER);`,
          assertions: this.assertionGenerator.generateEdgeCaseAssertions(func, 'boundary')
        });
      }

      if (param.type.includes('string')) {
        // Max length
        testCases.push({
          name: `should handle maximum length string for ${param.name}`,
          type: 'edge-case',
          setup: this.mockGenerator.generateSetupCode(mocks),
          action: `const result = ${func.isAsync ? 'await ' : ''}${func.name}('${'a'.repeat(10000)}');`,
          assertions: this.assertionGenerator.generateEdgeCaseAssertions(func, 'boundary')
        });
      }
    }

    return testCases;
  }

  /**
   * Generate integration test cases
   */
  private async generateIntegrationTestCases(
    integrationPoint: IntegrationPoint,
    analysis: CodeAnalysis
  ): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    testCases.push({
      name: `should integrate ${integrationPoint.components.join(' and ')} successfully`,
      type: 'integration',
      setup: this.generateIntegrationSetup(integrationPoint),
      action: this.generateIntegrationAction(integrationPoint),
      assertions: this.generateIntegrationAssertions(integrationPoint)
    });

    return testCases;
  }

  private generateIntegrationSetup(point: IntegrationPoint): string {
    return point.components
      .map(comp => `const ${comp.toLowerCase()} = new ${comp}();`)
      .join('\n');
  }

  private generateIntegrationAction(point: IntegrationPoint): string {
    return `const result = await ${point.name}();`;
  }

  private generateIntegrationAssertions(point: IntegrationPoint): string[] {
    return [
      'expect(result).toBeDefined();',
      'expect(result).toMatchSnapshot();'
    ];
  }

  /**
   * Estimate test coverage
   */
  private estimateTestCoverage(testCases: TestCase[], unit: FunctionInfo | MethodInfo): CoverageEstimate {
    const hasHappyPath = testCases.some(tc => tc.type === 'happy-path');
    const hasEdgeCases = testCases.some(tc => tc.type === 'edge-case');
    const hasErrorCases = testCases.some(tc => tc.type === 'error-case');

    let line = hasHappyPath ? 85 : 50;
    let branch = hasHappyPath && hasEdgeCases ? 80 : 50;
    let func = hasHappyPath ? 100 : 50;
    let statement = hasHappyPath ? 85 : 50;

    if (hasEdgeCases) line += 5;
    if (hasErrorCases) {
      line += 5;
      branch += 10;
    }

    return {
      line: Math.min(line, 95),
      branch: Math.min(branch, 90),
      function: func,
      statement: Math.min(statement, 95)
    };
  }

  private estimateCoverage(tests: GeneratedTest[], analysis: CodeAnalysis): CoverageEstimate {
    const coverages = tests.map(t => t.coverage);

    return {
      line: this.average(coverages.map(c => c.line)),
      branch: this.average(coverages.map(c => c.branch)),
      function: this.average(coverages.map(c => c.function)),
      statement: this.average(coverages.map(c => c.statement))
    };
  }

  private average(numbers: number[]): number {
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }

  /**
   * Find source files in directory
   */
  private async findSourceFiles(directory: string, pattern: RegExp): Promise<string[]> {
    const files: string[] = [];

    async function scan(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scan(fullPath);
          }
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    await scan(directory);
    return files;
  }
}

// Type Definitions
export interface TestGeneratorConfig {
  coverageTargets: {
    line: number;
    function: number;
    branch: number;
    statement: number;
  };
  testDirectory: string;
  templateStyle: 'jest' | 'mocha' | 'vitest';
  mockStrategy: 'auto' | 'manual' | 'none';
  generateEdgeCases: boolean;
  generateErrorCases: boolean;
}

export interface GeneratedTestSuite {
  sourceFile: string;
  testFiles: string[];
  tests: GeneratedTest[];
  coverage: CoverageEstimate;
  analysis: CodeAnalysis;
}

export interface GeneratedTest {
  type: 'function' | 'method' | 'constructor' | 'property' | 'integration';
  name: string;
  testCases: TestCase[];
  code: string;
  mocks: Mock[];
  coverage: CoverageEstimate;
}

export interface TestCase {
  name: string;
  type: 'happy-path' | 'edge-case' | 'error-case' | 'integration';
  setup: string;
  action: string;
  assertions: string[];
}

export interface Mock {
  name: string;
  type: string;
  methods: string[];
  properties: string[];
}

export interface CoverageEstimate {
  line: number;
  branch: number;
  function: number;
  statement: number;
}

export interface CodeAnalysis {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  integrationPoints: IntegrationPoint[];
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  throws: string[];
  documentation?: string;
}

export interface MethodInfo extends FunctionInfo {
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
}

export interface ClassInfo {
  name: string;
  constructor?: ConstructorInfo;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  isExported: boolean;
  extends?: string;
  implements: string[];
}

export interface ConstructorInfo {
  parameters: ParameterInfo[];
}

export interface PropertyInfo {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  isReadonly: boolean;
  hasGetter: boolean;
  hasSetter: boolean;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isDefault: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'const' | 'type';
}

export interface IntegrationPoint {
  name: string;
  components: string[];
  type: 'api' | 'database' | 'service' | 'component';
}
