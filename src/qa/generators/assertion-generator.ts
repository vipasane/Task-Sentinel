import { FunctionInfo, MethodInfo, ClassInfo, PropertyInfo } from '../test-generator';

/**
 * AssertionGenerator - Generates type-based assertions for tests
 */
export class AssertionGenerator {
  /**
   * Generate assertions for happy path tests
   */
  generateHappyPathAssertions(func: FunctionInfo | MethodInfo): string[] {
    const assertions: string[] = [];
    const returnType = func.returnType.replace(/Promise<|>/g, '');

    // Basic existence check
    if (returnType !== 'void') {
      assertions.push('expect(result).toBeDefined();');
    }

    // Type-specific assertions
    assertions.push(...this.generateTypeAssertions(returnType, 'result'));

    return assertions;
  }

  /**
   * Generate assertions for edge cases
   */
  generateEdgeCaseAssertions(
    func: FunctionInfo | MethodInfo,
    edgeCase: 'empty' | 'null' | 'boundary'
  ): string[] {
    const assertions: string[] = [];
    const returnType = func.returnType.replace(/Promise<|>/g, '');

    switch (edgeCase) {
      case 'empty':
        if (returnType.includes('[]')) {
          assertions.push('expect(result).toEqual([]);');
        } else if (returnType.includes('object') || returnType === '{}') {
          assertions.push('expect(result).toEqual({});');
        } else {
          assertions.push('expect(result).toBeDefined();');
        }
        break;

      case 'null':
        assertions.push('expect(result).toBeNull();', '// or', 'expect(result).toBeUndefined();');
        break;

      case 'boundary':
        assertions.push('expect(result).toBeDefined();');
        if (returnType.toLowerCase() === 'number') {
          assertions.push('expect(Number.isFinite(result)).toBe(true);');
        }
        break;
    }

    return assertions;
  }

  /**
   * Generate assertions for constructor tests
   */
  generateConstructorAssertions(cls: ClassInfo): string[] {
    const assertions: string[] = [];

    // Check properties are initialized
    for (const prop of cls.properties.filter(p => p.visibility === 'public')) {
      if (!prop.optional) {
        assertions.push(`expect(instance.${prop.name}).toBeDefined();`);
      }
    }

    return assertions;
  }

  /**
   * Generate assertions for property tests
   */
  generatePropertyAssertions(prop: PropertyInfo): string[] {
    const assertions: string[] = ['expect(value).toBeDefined();'];

    assertions.push(...this.generateTypeAssertions(prop.type, 'value'));

    return assertions;
  }

  /**
   * Generate type-specific assertions
   */
  private generateTypeAssertions(type: string, variableName: string): string[] {
    const assertions: string[] = [];
    const normalizedType = type.toLowerCase();

    // Array types
    if (type.includes('[]')) {
      assertions.push(`expect(Array.isArray(${variableName})).toBe(true);`);
      const elementType = type.replace('[]', '');
      if (elementType && !['any', 'unknown'].includes(elementType.toLowerCase())) {
        assertions.push(`expect(${variableName}.length).toBeGreaterThanOrEqual(0);`);
      }
      return assertions;
    }

    // Primitive types
    switch (normalizedType) {
      case 'string':
        assertions.push(`expect(typeof ${variableName}).toBe('string');`);
        break;

      case 'number':
        assertions.push(`expect(typeof ${variableName}).toBe('number');`);
        assertions.push(`expect(Number.isNaN(${variableName})).toBe(false);`);
        break;

      case 'boolean':
        assertions.push(`expect(typeof ${variableName}).toBe('boolean');`);
        break;

      case 'object':
        assertions.push(`expect(typeof ${variableName}).toBe('object');`);
        assertions.push(`expect(${variableName}).not.toBeNull();`);
        break;

      case 'date':
        assertions.push(`expect(${variableName}).toBeInstanceOf(Date);`);
        assertions.push(`expect(${variableName}.getTime()).not.toBeNaN();`);
        break;

      case 'void':
        // No assertion needed for void
        break;

      default:
        // Custom types - check if it's an object
        if (type[0] === type[0].toUpperCase()) {
          // Likely a class/interface
          assertions.push(`expect(${variableName}).toMatchObject(expect.any(Object));`);
        } else {
          assertions.push(`expect(${variableName}).toBeDefined();`);
        }
    }

    return assertions;
  }

  /**
   * Generate assertions for specific values
   */
  generateValueAssertions(expectedValue: any, variableName: string = 'result'): string[] {
    const assertions: string[] = [];

    if (expectedValue === null) {
      assertions.push(`expect(${variableName}).toBeNull();`);
    } else if (expectedValue === undefined) {
      assertions.push(`expect(${variableName}).toBeUndefined();`);
    } else if (typeof expectedValue === 'string') {
      assertions.push(`expect(${variableName}).toBe('${expectedValue}');`);
    } else if (typeof expectedValue === 'number') {
      assertions.push(`expect(${variableName}).toBe(${expectedValue});`);
    } else if (typeof expectedValue === 'boolean') {
      assertions.push(`expect(${variableName}).toBe(${expectedValue});`);
    } else if (Array.isArray(expectedValue)) {
      assertions.push(`expect(${variableName}).toEqual(${JSON.stringify(expectedValue)});`);
    } else if (typeof expectedValue === 'object') {
      assertions.push(`expect(${variableName}).toMatchObject(${JSON.stringify(expectedValue)});`);
    }

    return assertions;
  }

  /**
   * Generate error assertions
   */
  generateErrorAssertions(errorType: string): string[] {
    return [
      `expect(error).toBeInstanceOf(${errorType});`,
      `expect(error.message).toBeDefined();`
    ];
  }

  /**
   * Generate async assertions
   */
  generateAsyncAssertions(func: FunctionInfo | MethodInfo): string[] {
    const assertions: string[] = [];

    if (func.isAsync) {
      assertions.push('expect(result).resolves.toBeDefined();');

      // Check Promise
      const returnType = func.returnType.replace(/Promise<|>/g, '');
      if (returnType !== 'void') {
        assertions.push(...this.generateTypeAssertions(returnType, 'result'));
      }
    }

    return assertions;
  }

  /**
   * Generate snapshot assertions
   */
  generateSnapshotAssertions(variableName: string = 'result'): string[] {
    return [`expect(${variableName}).toMatchSnapshot();`];
  }

  /**
   * Generate mock call assertions
   */
  generateMockCallAssertions(mockName: string, methodName: string, expectedCalls: number = 1): string[] {
    return [
      `expect(${mockName}.${methodName}).toHaveBeenCalled();`,
      `expect(${mockName}.${methodName}).toHaveBeenCalledTimes(${expectedCalls});`
    ];
  }

  /**
   * Generate spy assertions
   */
  generateSpyAssertions(spyName: string, expectedArgs?: any[]): string[] {
    const assertions: string[] = [`expect(${spyName}).toHaveBeenCalled();`];

    if (expectedArgs) {
      assertions.push(`expect(${spyName}).toHaveBeenCalledWith(${expectedArgs.map(a => JSON.stringify(a)).join(', ')});`);
    }

    return assertions;
  }
}
