import * as fs from 'fs/promises';
import * as path from 'path';
import { GeneratedTest, CodeAnalysis } from './test-generator';

/**
 * TestFileWriter - Writes generated tests to files with proper naming
 */
export class TestFileWriter {
  constructor(private testDirectory: string = 'tests') {}

  /**
   * Write all generated tests to files
   */
  async writeTestFiles(
    sourceFile: string,
    tests: GeneratedTest[],
    analysis: CodeAnalysis
  ): Promise<string[]> {
    const testFiles: string[] = [];

    // Group tests by type
    const functionTests = tests.filter(t => t.type === 'function');
    const classTests = tests.filter(t => t.type === 'method' || t.type === 'constructor' || t.type === 'property');
    const integrationTests = tests.filter(t => t.type === 'integration');

    // Write function tests
    if (functionTests.length > 0) {
      const filePath = await this.writeFunctionTestFile(sourceFile, functionTests);
      testFiles.push(filePath);
    }

    // Write class tests (grouped by class)
    const classesTested = new Set<string>();
    for (const classInfo of analysis.classes) {
      if (classesTested.has(classInfo.name)) continue;

      const classTestsForClass = classTests.filter(t =>
        t.name.startsWith(classInfo.name + '.')
      );

      if (classTestsForClass.length > 0) {
        const filePath = await this.writeClassTestFile(sourceFile, classInfo.name, classTestsForClass);
        testFiles.push(filePath);
        classesTested.add(classInfo.name);
      }
    }

    // Write integration tests
    if (integrationTests.length > 0) {
      const filePath = await this.writeIntegrationTestFile(sourceFile, integrationTests);
      testFiles.push(filePath);
    }

    console.log(`✅ Generated ${testFiles.length} test files`);
    return testFiles;
  }

  /**
   * Write function tests to file
   */
  private async writeFunctionTestFile(sourceFile: string, tests: GeneratedTest[]): Promise<string> {
    const baseName = path.basename(sourceFile, path.extname(sourceFile));
    const testFileName = `${baseName}.test.ts`;
    const testFilePath = this.getTestFilePath(sourceFile, testFileName);

    const content = this.combineTests(tests);

    await this.ensureDirectory(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, content, 'utf-8');

    console.log(`  📝 Generated: ${testFilePath}`);
    return testFilePath;
  }

  /**
   * Write class tests to file
   */
  private async writeClassTestFile(
    sourceFile: string,
    className: string,
    tests: GeneratedTest[]
  ): Promise<string> {
    const testFileName = `${className}.test.ts`;
    const testFilePath = this.getTestFilePath(sourceFile, testFileName);

    const content = this.combineTests(tests);

    await this.ensureDirectory(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, content, 'utf-8');

    console.log(`  📝 Generated: ${testFilePath}`);
    return testFilePath;
  }

  /**
   * Write integration tests to file
   */
  private async writeIntegrationTestFile(sourceFile: string, tests: GeneratedTest[]): Promise<string> {
    const baseName = path.basename(sourceFile, path.extname(sourceFile));
    const testFileName = `${baseName}.integration.test.ts`;
    const testFilePath = this.getTestFilePath(sourceFile, testFileName);

    const content = this.combineTests(tests);

    await this.ensureDirectory(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, content, 'utf-8');

    console.log(`  📝 Generated: ${testFilePath}`);
    return testFilePath;
  }

  /**
   * Combine multiple test code blocks
   */
  private combineTests(tests: GeneratedTest[]): string {
    // Extract imports from all tests (deduplicate)
    const imports = this.extractAndDeduplicateImports(tests.map(t => t.code));

    // Extract test bodies
    const testBodies = tests.map(t => {
      // Remove imports from individual tests
      return this.removeImports(t.code);
    });

    return `${imports}\n\n${testBodies.join('\n\n')}`;
  }

  /**
   * Extract and deduplicate imports
   */
  private extractAndDeduplicateImports(codes: string[]): string {
    const imports = new Set<string>();

    for (const code of codes) {
      const lines = code.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('import ')) {
          imports.add(line.trim());
        }
      }
    }

    return Array.from(imports).join('\n');
  }

  /**
   * Remove import statements from code
   */
  private removeImports(code: string): string {
    return code
      .split('\n')
      .filter(line => !line.trim().startsWith('import '))
      .join('\n')
      .trim();
  }

  /**
   * Get test file path based on source file location
   */
  private getTestFilePath(sourceFile: string, testFileName: string): string {
    const sourceDir = path.dirname(sourceFile);
    const relativePath = path.relative(process.cwd(), sourceDir);

    // Mirror source structure in test directory
    // e.g., src/services/user.ts -> tests/services/user.test.ts
    let testDir: string;

    if (relativePath.startsWith('src')) {
      testDir = path.join(this.testDirectory, relativePath.substring(3));
    } else {
      testDir = path.join(this.testDirectory, relativePath);
    }

    return path.join(testDir, testFileName);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Get test statistics
   */
  async getTestStatistics(testFiles: string[]): Promise<TestStatistics> {
    let totalTests = 0;
    let totalDescribes = 0;
    let totalLines = 0;

    for (const file of testFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        totalTests += (content.match(/\bit\(/g) || []).length;
        totalDescribes += (content.match(/\bdescribe\(/g) || []).length;
        totalLines += content.split('\n').length;
      } catch (error) {
        console.error(`Failed to read ${file}:`, error);
      }
    }

    return {
      files: testFiles.length,
      describes: totalDescribes,
      tests: totalTests,
      lines: totalLines
    };
  }
}

export interface TestStatistics {
  files: number;
  describes: number;
  tests: number;
  lines: number;
}
