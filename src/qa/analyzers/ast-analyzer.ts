import * as ts from 'typescript';
import {
  CodeAnalysis,
  FunctionInfo,
  ClassInfo,
  MethodInfo,
  PropertyInfo,
  ParameterInfo,
  ImportInfo,
  ExportInfo,
  IntegrationPoint,
  ConstructorInfo
} from '../test-generator';

/**
 * ASTAnalyzer - Analyzes TypeScript AST to extract testable units
 */
export class ASTAnalyzer {
  /**
   * Analyze TypeScript source file and extract all testable components
   */
  analyze(sourceFile: ts.SourceFile): CodeAnalysis {
    const analysis: CodeAnalysis = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      integrationPoints: []
    };

    // Visit all nodes in the AST
    const visit = (node: ts.Node) => {
      // Extract imports
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.extractImport(node);
        if (importInfo) analysis.imports.push(importInfo);
      }

      // Extract functions
      if (ts.isFunctionDeclaration(node)) {
        const funcInfo = this.extractFunction(node);
        if (funcInfo) {
          analysis.functions.push(funcInfo);
          if (funcInfo.isExported) {
            analysis.exports.push({
              name: funcInfo.name,
              type: 'function'
            });
          }
        }
      }

      // Extract arrow functions assigned to constants
      if (ts.isVariableStatement(node)) {
        const funcInfo = this.extractVariableFunction(node);
        if (funcInfo) {
          analysis.functions.push(funcInfo);
        }
      }

      // Extract classes
      if (ts.isClassDeclaration(node)) {
        const classInfo = this.extractClass(node);
        if (classInfo) {
          analysis.classes.push(classInfo);
          if (classInfo.isExported) {
            analysis.exports.push({
              name: classInfo.name,
              type: 'class'
            });
          }
        }
      }

      // Recursively visit child nodes
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Detect integration points
    analysis.integrationPoints = this.detectIntegrationPoints(analysis);

    return analysis;
  }

  /**
   * Extract import information
   */
  private extractImport(node: ts.ImportDeclaration): ImportInfo | null {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return null;

    const importClause = node.importClause;
    if (!importClause) return null;

    const imports: string[] = [];
    let isDefault = false;

    // Default import
    if (importClause.name) {
      imports.push(importClause.name.text);
      isDefault = true;
    }

    // Named imports
    if (importClause.namedBindings) {
      if (ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          imports.push(element.name.text);
        }
      } else if (ts.isNamespaceImport(importClause.namedBindings)) {
        imports.push(importClause.namedBindings.name.text);
      }
    }

    return {
      module: moduleSpecifier.text,
      imports,
      isDefault
    };
  }

  /**
   * Extract function declaration information
   */
  private extractFunction(node: ts.FunctionDeclaration): FunctionInfo | null {
    if (!node.name) return null;

    const name = node.name.text;
    const parameters = this.extractParameters(node.parameters);
    const returnType = this.extractReturnType(node);
    const isAsync = !!(node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword));
    const isExported = !!(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
    const throws = this.extractThrows(node);
    const documentation = this.extractDocumentation(node);

    return {
      name,
      parameters,
      returnType,
      isAsync,
      isExported,
      throws,
      documentation
    };
  }

  /**
   * Extract arrow function from variable declaration
   */
  private extractVariableFunction(node: ts.VariableStatement): FunctionInfo | null {
    const declaration = node.declarationList.declarations[0];
    if (!declaration.initializer) return null;

    if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
      const name = (declaration.name as ts.Identifier).text;
      const func = declaration.initializer;
      const parameters = this.extractParameters(func.parameters);
      const returnType = this.extractReturnType(func);
      const isAsync = !!(func.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword));
      const isExported = !!(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));

      return {
        name,
        parameters,
        returnType,
        isAsync,
        isExported,
        throws: [],
        documentation: this.extractDocumentation(node)
      };
    }

    return null;
  }

  /**
   * Extract class information
   */
  private extractClass(node: ts.ClassDeclaration): ClassInfo | null {
    if (!node.name) return null;

    const name = node.name.text;
    const isExported = !!(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
    const methods: MethodInfo[] = [];
    const properties: PropertyInfo[] = [];
    let constructor: ConstructorInfo | undefined;
    let extendsClass: string | undefined;
    const implementsInterfaces: string[] = [];

    // Extract heritage (extends/implements)
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          extendsClass = clause.types[0].expression.getText();
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          implementsInterfaces.push(...clause.types.map(t => t.expression.getText()));
        }
      }
    }

    // Extract members
    for (const member of node.members) {
      // Constructor
      if (ts.isConstructorDeclaration(member)) {
        constructor = {
          parameters: this.extractParameters(member.parameters)
        };
      }

      // Methods
      if (ts.isMethodDeclaration(member)) {
        const methodInfo = this.extractMethod(member);
        if (methodInfo) methods.push(methodInfo);
      }

      // Properties
      if (ts.isPropertyDeclaration(member)) {
        const propInfo = this.extractProperty(member);
        if (propInfo) properties.push(propInfo);
      }
    }

    return {
      name,
      constructor,
      methods,
      properties,
      isExported,
      extends: extendsClass,
      implements: implementsInterfaces
    };
  }

  /**
   * Extract method information
   */
  private extractMethod(node: ts.MethodDeclaration): MethodInfo | null {
    if (!node.name) return null;

    const name = node.name.getText();
    const parameters = this.extractParameters(node.parameters);
    const returnType = this.extractReturnType(node);
    const isAsync = !!(node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword));
    const isStatic = !!(node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword));
    const visibility = this.extractVisibility(node.modifiers);
    const throws = this.extractThrows(node);
    const documentation = this.extractDocumentation(node);

    return {
      name,
      parameters,
      returnType,
      isAsync,
      isExported: false,
      throws,
      documentation,
      visibility,
      isStatic
    };
  }

  /**
   * Extract property information
   */
  private extractProperty(node: ts.PropertyDeclaration): PropertyInfo | null {
    if (!node.name) return null;

    const name = node.name.getText();
    const type = node.type ? node.type.getText() : 'any';
    const visibility = this.extractVisibility(node.modifiers);
    const isReadonly = !!(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword));

    return {
      name,
      type,
      visibility,
      isReadonly,
      hasGetter: false, // Would need to check for getter/setter separately
      hasSetter: false
    };
  }

  /**
   * Extract parameter information
   */
  private extractParameters(params: ts.NodeArray<ts.ParameterDeclaration>): ParameterInfo[] {
    return params.map(param => ({
      name: param.name.getText(),
      type: param.type ? param.type.getText() : 'any',
      optional: !!param.questionToken,
      defaultValue: param.initializer ? param.initializer.getText() : undefined
    }));
  }

  /**
   * Extract return type
   */
  private extractReturnType(node: ts.FunctionLikeDeclaration): string {
    if (node.type) {
      return node.type.getText();
    }

    // Try to infer from async
    if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
      return 'Promise<any>';
    }

    return 'any';
  }

  /**
   * Extract visibility modifier
   */
  private extractVisibility(modifiers?: ts.NodeArray<ts.ModifierLike>): 'public' | 'private' | 'protected' {
    if (!modifiers) return 'public';

    for (const modifier of modifiers) {
      if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
      if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
      if (modifier.kind === ts.SyntaxKind.PublicKeyword) return 'public';
    }

    return 'public';
  }

  /**
   * Extract throws information from JSDoc
   */
  private extractThrows(node: ts.Node): string[] {
    const throws: string[] = [];
    const jsDoc = (node as any).jsDoc;

    if (jsDoc && Array.isArray(jsDoc)) {
      for (const doc of jsDoc) {
        if (doc.tags) {
          for (const tag of doc.tags) {
            if (tag.tagName?.text === 'throws') {
              const throwType = tag.comment || 'Error';
              throws.push(throwType.toString());
            }
          }
        }
      }
    }

    return throws;
  }

  /**
   * Extract JSDoc documentation
   */
  private extractDocumentation(node: ts.Node): string | undefined {
    const jsDoc = (node as any).jsDoc;

    if (jsDoc && Array.isArray(jsDoc) && jsDoc.length > 0) {
      return jsDoc[0].comment?.toString();
    }

    return undefined;
  }

  /**
   * Detect integration points in the code
   */
  private detectIntegrationPoints(analysis: CodeAnalysis): IntegrationPoint[] {
    const points: IntegrationPoint[] = [];

    // Detect API integration points
    const hasHttpImports = analysis.imports.some(imp =>
      imp.module.includes('axios') ||
      imp.module.includes('fetch') ||
      imp.module.includes('http')
    );

    if (hasHttpImports) {
      points.push({
        name: 'API Integration',
        components: ['HTTPClient', 'APIService'],
        type: 'api'
      });
    }

    // Detect database integration
    const hasDbImports = analysis.imports.some(imp =>
      imp.module.includes('mongoose') ||
      imp.module.includes('prisma') ||
      imp.module.includes('typeorm') ||
      imp.module.includes('pg')
    );

    if (hasDbImports) {
      points.push({
        name: 'Database Integration',
        components: ['Database', 'Repository'],
        type: 'database'
      });
    }

    // Detect service integration
    const serviceClasses = analysis.classes.filter(cls =>
      cls.name.toLowerCase().includes('service')
    );

    if (serviceClasses.length > 1) {
      points.push({
        name: 'Service Integration',
        components: serviceClasses.map(cls => cls.name),
        type: 'service'
      });
    }

    // Detect component integration
    const hasReactImports = analysis.imports.some(imp =>
      imp.module === 'react' || imp.module.includes('react')
    );

    if (hasReactImports) {
      const components = analysis.functions.filter(f =>
        f.name[0] === f.name[0].toUpperCase() // PascalCase = likely component
      );

      if (components.length > 0) {
        points.push({
          name: 'Component Integration',
          components: components.map(c => c.name),
          type: 'component'
        });
      }
    }

    return points;
  }
}
