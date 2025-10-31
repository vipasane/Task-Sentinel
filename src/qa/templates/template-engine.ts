import {
  FunctionInfo,
  MethodInfo,
  ClassInfo,
  PropertyInfo,
  TestCase,
  Mock,
  ImportInfo,
  IntegrationPoint
} from '../test-generator';

/**
 * TestTemplateEngine - Renders test code from templates
 */
export class TestTemplateEngine {
  constructor(private style: 'jest' | 'mocha' | 'vitest' = 'jest') {}

  /**
   * Render function test
   */
  renderFunctionTest(context: {
    function: FunctionInfo;
    testCases: TestCase[];
    mocks: Mock[];
    imports: ImportInfo[];
  }): string {
    const { function: func, testCases, mocks, imports } = context;

    const template = `${this.renderImports(imports, func.name)}
${this.renderMockImports(mocks)}

describe('${func.name}', () => {
${this.renderBeforeEach(mocks)}
${testCases.map(tc => this.renderTestCase(tc)).join('\n\n')}
});
`;

    return this.formatCode(template);
  }

  /**
   * Render method test
   */
  renderMethodTest(context: {
    class: ClassInfo;
    method: MethodInfo;
    testCases: TestCase[];
    mocks: Mock[];
    imports: ImportInfo[];
  }): string {
    const { class: cls, method, testCases, mocks, imports } = context;

    const template = `${this.renderImports(imports, cls.name)}
${this.renderMockImports(mocks)}

describe('${cls.name}.${method.name}', () => {
  let instance: ${cls.name};
${this.renderMockDeclarations(mocks)}

${this.renderBeforeEach(mocks, cls)}
${testCases.map(tc => this.renderTestCase(tc)).join('\n\n')}
});
`;

    return this.formatCode(template);
  }

  /**
   * Render constructor test
   */
  renderConstructorTest(context: {
    class: ClassInfo;
    testCases: TestCase[];
    imports: ImportInfo[];
  }): string {
    const { class: cls, testCases, imports } = context;

    const template = `${this.renderImports(imports, cls.name)}

describe('${cls.name} Constructor', () => {
${testCases.map(tc => this.renderTestCase(tc)).join('\n\n')}
});
`;

    return this.formatCode(template);
  }

  /**
   * Render property test
   */
  renderPropertyTest(context: {
    class: ClassInfo;
    testCases: TestCase[];
    imports: ImportInfo[];
  }): string {
    const { class: cls, testCases, imports } = context;

    const template = `${this.renderImports(imports, cls.name)}

describe('${cls.name} Properties', () => {
${testCases.map(tc => this.renderTestCase(tc)).join('\n\n')}
});
`;

    return this.formatCode(template);
  }

  /**
   * Render integration test
   */
  renderIntegrationTest(context: {
    integrationPoint: IntegrationPoint;
    testCases: TestCase[];
    imports: ImportInfo[];
  }): string {
    const { integrationPoint, testCases, imports } = context;

    const template = `${this.renderImports(imports)}

describe('${integrationPoint.name} Integration', () => {
${testCases.map(tc => this.renderTestCase(tc)).join('\n\n')}
});
`;

    return this.formatCode(template);
  }

  /**
   * Render E2E test
   */
  renderE2ETest(context: {
    name: string;
    testCases: TestCase[];
    imports: ImportInfo[];
  }): string {
    const { name, testCases, imports } = context;

    const template = `${this.renderImports(imports)}

describe('${name} E2E', () => {
  beforeAll(async () => {
    // Setup E2E environment
    await setupTestEnvironment();
  });

  afterAll(async () => {
    // Cleanup E2E environment
    await cleanupTestEnvironment();
  });

${testCases.map(tc => this.renderTestCase(tc)).join('\n\n')}
});
`;

    return this.formatCode(template);
  }

  /**
   * Render imports section
   */
  private renderImports(imports: ImportInfo[], mainImport?: string): string {
    const lines: string[] = [];

    // Add test framework import
    switch (this.style) {
      case 'jest':
        lines.push("import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';");
        break;
      case 'mocha':
        lines.push("import { describe, it, beforeEach, afterEach } from 'mocha';");
        lines.push("import { expect } from 'chai';");
        break;
      case 'vitest':
        lines.push("import { describe, it, expect, beforeEach, afterEach } from 'vitest';");
        break;
    }

    // Add source imports
    if (mainImport) {
      const sourceImport = imports.find(imp => imp.imports.includes(mainImport));
      if (sourceImport) {
        lines.push(`import { ${mainImport} } from '${this.getRelativeImportPath(sourceImport.module)}';`);
      } else {
        // Assume it's in the same directory
        lines.push(`import { ${mainImport} } from '../src/${mainImport}';`);
      }
    }

    // Add other necessary imports
    const otherImports = imports.filter(imp => !mainImport || !imp.imports.includes(mainImport));
    for (const imp of otherImports.slice(0, 5)) { // Limit to prevent clutter
      if (imp.isDefault) {
        lines.push(`import ${imp.imports[0]} from '${this.getRelativeImportPath(imp.module)}';`);
      } else {
        lines.push(`import { ${imp.imports.join(', ')} } from '${this.getRelativeImportPath(imp.module)}';`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render mock imports
   */
  private renderMockImports(mocks: Mock[]): string {
    if (mocks.length === 0) return '';

    const lines: string[] = [''];

    switch (this.style) {
      case 'jest':
        for (const mock of mocks) {
          lines.push(`// Mock ${mock.type} will be created in beforeEach`);
        }
        break;
      case 'mocha':
        lines.push("import sinon from 'sinon';");
        break;
      case 'vitest':
        lines.push("import { vi } from 'vitest';");
        break;
    }

    return lines.join('\n');
  }

  /**
   * Render mock declarations
   */
  private renderMockDeclarations(mocks: Mock[]): string {
    if (mocks.length === 0) return '';

    return mocks.map(mock => `  let ${mock.name}: any;`).join('\n');
  }

  /**
   * Render beforeEach hook
   */
  private renderBeforeEach(mocks: Mock[], cls?: ClassInfo): string {
    if (mocks.length === 0 && !cls) return '';

    const lines: string[] = ['  beforeEach(() => {'];

    // Setup mocks
    for (const mock of mocks) {
      lines.push(`    ${mock.name} = {`);
      for (const method of mock.methods) {
        lines.push(`      ${method}: ${this.getMockFunction()},`);
      }
      for (const prop of mock.properties) {
        lines.push(`      ${prop}: undefined,`);
      }
      lines.push('    };');
    }

    // Create class instance if needed
    if (cls) {
      const args = cls.constructor?.parameters.map(p => {
        const mock = mocks.find(m => m.type === p.type);
        return mock ? mock.name : this.getDefaultValue(p.type);
      }).join(', ') || '';

      lines.push(`    instance = new ${cls.name}(${args});`);
    }

    lines.push('  });');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Render individual test case
   */
  private renderTestCase(testCase: TestCase): string {
    const lines: string[] = [];

    // Test declaration
    const testMethod = testCase.action.includes('await') ? 'it' : 'it';
    const isAsync = testCase.action.includes('await');

    lines.push(`  ${testMethod}('${testCase.name}', ${isAsync ? 'async ' : ''}() => {`);

    // Setup
    if (testCase.setup) {
      lines.push('    // Arrange');
      testCase.setup.split('\n').forEach(line => {
        if (line.trim()) lines.push(`    ${line.trim()}`);
      });
      lines.push('');
    }

    // Action
    lines.push('    // Act');
    if (testCase.action.includes('expect(')) {
      // Action is also an assertion (error cases)
      lines.push(`    ${testCase.action}`);
    } else {
      lines.push(`    ${testCase.action}`);
      lines.push('');
    }

    // Assertions
    if (testCase.assertions.length > 0) {
      lines.push('    // Assert');
      testCase.assertions.forEach(assertion => {
        if (!assertion.startsWith('//')) {
          lines.push(`    ${assertion}`);
        }
      });
    }

    lines.push('  });');

    return lines.join('\n');
  }

  /**
   * Get mock function based on test framework
   */
  private getMockFunction(): string {
    switch (this.style) {
      case 'jest': return 'jest.fn()';
      case 'mocha': return 'sinon.stub()';
      case 'vitest': return 'vi.fn()';
    }
  }

  /**
   * Get default value for type
   */
  private getDefaultValue(type: string): string {
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
      case 'string': return "''";
      case 'number': return '0';
      case 'boolean': return 'false';
      case 'object': return '{}';
      default: return 'undefined';
    }
  }

  /**
   * Convert absolute import to relative
   */
  private getRelativeImportPath(module: string): string {
    // If it's a package import, return as-is
    if (!module.startsWith('.') && !module.startsWith('/')) {
      return module;
    }

    // Convert to relative import from test directory
    if (module.startsWith('../src/')) {
      return module;
    }

    return `../src/${module}`;
  }

  /**
   * Format code with proper indentation
   */
  private formatCode(code: string): string {
    // Remove extra blank lines
    return code
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n';
  }
}
