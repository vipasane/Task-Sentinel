import { Mock, FunctionInfo, ClassInfo, MethodInfo, CodeAnalysis, ParameterInfo } from '../test-generator';

/**
 * MockGenerator - Generates mocks for external dependencies
 */
export class MockGenerator {
  constructor(private strategy: 'auto' | 'manual' | 'none' = 'auto') {}

  /**
   * Generate mocks for function dependencies
   */
  async generateMocksForFunction(func: FunctionInfo, analysis: CodeAnalysis): Promise<Mock[]> {
    if (this.strategy === 'none') return [];

    const mocks: Mock[] = [];

    // Identify external dependencies from parameters
    for (const param of func.parameters) {
      if (this.isComplexType(param.type)) {
        const mock = this.createMock(param.name, param.type, analysis);
        if (mock) mocks.push(mock);
      }
    }

    // Identify dependencies from imports
    const dependencies = this.findDependencies(func, analysis);
    for (const dep of dependencies) {
      const mock = this.createMockFromImport(dep, analysis);
      if (mock) mocks.push(mock);
    }

    return mocks;
  }

  /**
   * Generate mocks for method dependencies
   */
  async generateMocksForMethod(
    cls: ClassInfo,
    method: MethodInfo,
    analysis: CodeAnalysis
  ): Promise<Mock[]> {
    if (this.strategy === 'none') return [];

    const mocks: Mock[] = [];

    // Mock constructor dependencies
    if (cls.constructor) {
      for (const param of cls.constructor.parameters) {
        if (this.isComplexType(param.type)) {
          const mock = this.createMock(param.name, param.type, analysis);
          if (mock) mocks.push(mock);
        }
      }
    }

    // Mock method parameters
    for (const param of method.parameters) {
      if (this.isComplexType(param.type)) {
        const mock = this.createMock(param.name, param.type, analysis);
        if (mock) mocks.push(mock);
      }
    }

    return mocks;
  }

  /**
   * Generate setup code for mocks
   */
  generateSetupCode(mocks: Mock[] | ParameterInfo[]): string {
    if (Array.isArray(mocks) && mocks.length === 0) return '';

    // Handle ParameterInfo[] (for simple cases)
    if (mocks.length > 0 && 'optional' in mocks[0]) {
      return ''; // No setup needed for primitive parameters
    }

    // Handle Mock[]
    const mockObjects = mocks as Mock[];
    const setupLines: string[] = [];

    for (const mock of mockObjects) {
      setupLines.push(`const ${mock.name} = {`);

      // Add mock methods
      for (const method of mock.methods) {
        setupLines.push(`  ${method}: jest.fn(),`);
      }

      // Add mock properties
      for (const prop of mock.properties) {
        setupLines.push(`  ${prop}: undefined,`);
      }

      setupLines.push(`};`);
      setupLines.push('');
    }

    return setupLines.join('\n');
  }

  /**
   * Generate setup code that throws errors
   */
  generateErrorSetupCode(mocks: Mock[], errorType: string): string {
    const setupLines: string[] = [];

    for (const mock of mocks) {
      setupLines.push(`const ${mock.name} = {`);

      for (const method of mock.methods) {
        setupLines.push(`  ${method}: jest.fn().mockRejectedValue(new ${errorType}()),`);
      }

      for (const prop of mock.properties) {
        setupLines.push(`  ${prop}: undefined,`);
      }

      setupLines.push(`};`);
    }

    return setupLines.join('\n');
  }

  /**
   * Create a mock object
   */
  private createMock(name: string, type: string, analysis: CodeAnalysis): Mock | null {
    // Find class definition for the type
    const classInfo = analysis.classes.find(cls => cls.name === type);

    if (classInfo) {
      return {
        name: `mock${this.capitalize(name)}`,
        type,
        methods: classInfo.methods
          .filter(m => m.visibility === 'public')
          .map(m => m.name),
        properties: classInfo.properties
          .filter(p => p.visibility === 'public')
          .map(p => p.name)
      };
    }

    // Create generic mock for unknown types
    if (this.isComplexType(type)) {
      return {
        name: `mock${this.capitalize(name)}`,
        type,
        methods: this.inferMethods(name),
        properties: []
      };
    }

    return null;
  }

  /**
   * Create mock from import
   */
  private createMockFromImport(dependency: string, analysis: CodeAnalysis): Mock | null {
    const importInfo = analysis.imports.find(imp => imp.imports.includes(dependency));

    if (importInfo) {
      return {
        name: `mock${dependency}`,
        type: dependency,
        methods: this.inferMethodsFromImport(importInfo.module),
        properties: []
      };
    }

    return null;
  }

  /**
   * Find dependencies for a function
   */
  private findDependencies(func: FunctionInfo, analysis: CodeAnalysis): string[] {
    const deps: string[] = [];

    // Look for common patterns
    const commonDeps = ['logger', 'database', 'cache', 'api', 'service', 'repository'];

    for (const dep of commonDeps) {
      if (func.name.toLowerCase().includes(dep) || func.documentation?.toLowerCase().includes(dep)) {
        deps.push(dep);
      }
    }

    return deps;
  }

  /**
   * Check if type is complex (needs mocking)
   */
  private isComplexType(type: string): boolean {
    const primitiveTypes = ['string', 'number', 'boolean', 'any', 'void', 'null', 'undefined'];
    const normalizedType = type.toLowerCase().replace(/\[\]/g, '');

    return !primitiveTypes.includes(normalizedType) &&
           !normalizedType.startsWith('promise<') &&
           type !== 'Date';
  }

  /**
   * Infer methods based on naming conventions
   */
  private inferMethods(name: string): string[] {
    const lowerName = name.toLowerCase();

    // Common patterns
    if (lowerName.includes('repository') || lowerName.includes('dao')) {
      return ['find', 'findById', 'save', 'update', 'delete'];
    }

    if (lowerName.includes('service')) {
      return ['execute', 'process', 'handle'];
    }

    if (lowerName.includes('logger')) {
      return ['info', 'warn', 'error', 'debug'];
    }

    if (lowerName.includes('cache')) {
      return ['get', 'set', 'delete', 'clear'];
    }

    if (lowerName.includes('api') || lowerName.includes('client')) {
      return ['get', 'post', 'put', 'delete'];
    }

    return ['execute'];
  }

  /**
   * Infer methods from module name
   */
  private inferMethodsFromImport(module: string): string[] {
    if (module.includes('axios')) {
      return ['get', 'post', 'put', 'delete'];
    }

    if (module.includes('logger') || module.includes('winston')) {
      return ['info', 'warn', 'error', 'debug'];
    }

    if (module.includes('prisma') || module.includes('mongoose')) {
      return ['find', 'findOne', 'create', 'update', 'delete'];
    }

    return [];
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
