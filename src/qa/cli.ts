#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { TestGenerator } from './test-generator';
import * as fs from 'fs/promises';

/**
 * CLI for automated test generation
 */
const program = new Command();

program
  .name('test-generator')
  .description('Automated test generation system for TypeScript')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate tests for a source file or directory')
  .argument('<path>', 'Source file or directory path')
  .option('-o, --output <dir>', 'Output directory for tests', 'tests')
  .option('-s, --style <style>', 'Test framework style (jest|mocha|vitest)', 'jest')
  .option('-m, --mock-strategy <strategy>', 'Mock strategy (auto|manual|none)', 'auto')
  .option('--no-edge-cases', 'Skip edge case generation')
  .option('--no-error-cases', 'Skip error case generation')
  .option('--pattern <pattern>', 'File pattern for directory scanning', '\\.ts$')
  .action(async (sourcePath: string, options) => {
    try {
      console.log('🧪 Test Generator v1.0.0\n');

      const generator = new TestGenerator({
        coverageTargets: {
          line: 90,
          function: 90,
          branch: 85,
          statement: 80
        },
        testDirectory: options.output,
        templateStyle: options.style,
        mockStrategy: options.mockStrategy,
        generateEdgeCases: options.edgeCases !== false,
        generateErrorCases: options.errorCases !== false
      });

      const absolutePath = path.resolve(sourcePath);
      const stats = await fs.stat(absolutePath);

      if (stats.isFile()) {
        // Generate tests for single file
        const suite = await generator.generateTests(absolutePath);
        printSummary([suite]);
      } else if (stats.isDirectory()) {
        // Generate tests for directory
        const pattern = new RegExp(options.pattern);
        const suites = await generator.generateTestsForDirectory(absolutePath, pattern);
        printSummary(suites);
      } else {
        console.error('❌ Invalid path: not a file or directory');
        process.exit(1);
      }

      console.log('\n✅ Test generation complete!');
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze source code without generating tests')
  .argument('<path>', 'Source file path')
  .action(async (sourcePath: string) => {
    try {
      console.log('🔍 Analyzing source code...\n');

      const generator = new TestGenerator();
      const absolutePath = path.resolve(sourcePath);

      const sourceCode = await fs.readFile(absolutePath, 'utf-8');
      const ast = (generator as any).parseTypeScript(sourceCode, absolutePath);
      const analysis = (generator as any).astAnalyzer.analyze(ast);

      console.log('📊 Analysis Results:\n');
      console.log(`Functions: ${analysis.functions.length}`);
      analysis.functions.forEach((f: any) => {
        console.log(`  - ${f.name}(${f.parameters.map((p: any) => p.name).join(', ')}): ${f.returnType}`);
      });

      console.log(`\nClasses: ${analysis.classes.length}`);
      analysis.classes.forEach((c: any) => {
        console.log(`  - ${c.name}`);
        console.log(`    Methods: ${c.methods.length}`);
        console.log(`    Properties: ${c.properties.length}`);
      });

      console.log(`\nImports: ${analysis.imports.length}`);
      console.log(`Exports: ${analysis.exports.length}`);
      console.log(`Integration Points: ${analysis.integrationPoints.length}`);

      if (analysis.integrationPoints.length > 0) {
        console.log('\n🔗 Integration Points:');
        analysis.integrationPoints.forEach((ip: any) => {
          console.log(`  - ${ip.name} (${ip.type})`);
          console.log(`    Components: ${ip.components.join(', ')}`);
        });
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show statistics for generated tests')
  .argument('<test-dir>', 'Test directory path')
  .action(async (testDir: string) => {
    try {
      console.log('📊 Calculating test statistics...\n');

      const absolutePath = path.resolve(testDir);
      const files = await findTestFiles(absolutePath);

      let totalTests = 0;
      let totalDescribes = 0;
      let totalLines = 0;

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        totalTests += (content.match(/\bit\(/g) || []).length;
        totalDescribes += (content.match(/\bdescribe\(/g) || []).length;
        totalLines += content.split('\n').length;
      }

      console.log('Test Statistics:');
      console.log(`  Files: ${files.length}`);
      console.log(`  Test Suites: ${totalDescribes}`);
      console.log(`  Test Cases: ${totalTests}`);
      console.log(`  Total Lines: ${totalLines}`);
      console.log(`  Avg Tests/Suite: ${(totalTests / totalDescribes).toFixed(1)}`);
      console.log(`  Avg Lines/File: ${(totalLines / files.length).toFixed(0)}`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Print generation summary
 */
function printSummary(suites: any[]): void {
  console.log('\n📊 Generation Summary:');
  console.log(`  Source Files: ${suites.length}`);

  const totalTests = suites.reduce((sum, s) => sum + s.tests.length, 0);
  console.log(`  Tests Generated: ${totalTests}`);

  const totalTestFiles = suites.reduce((sum, s) => sum + s.testFiles.length, 0);
  console.log(`  Test Files: ${totalTestFiles}`);

  const avgCoverage = suites.reduce((sum, s) => sum + s.coverage.line, 0) / suites.length;
  console.log(`  Estimated Coverage: ${avgCoverage.toFixed(1)}%`);

  console.log('\n📁 Generated Test Files:');
  suites.forEach(suite => {
    suite.testFiles.forEach((file: string) => {
      console.log(`  - ${file}`);
    });
  });

  console.log('\n🎯 Coverage Estimates:');
  suites.forEach(suite => {
    console.log(`  ${path.basename(suite.sourceFile)}:`);
    console.log(`    Line: ${suite.coverage.line}%`);
    console.log(`    Branch: ${suite.coverage.branch}%`);
    console.log(`    Function: ${suite.coverage.function}%`);
    console.log(`    Statement: ${suite.coverage.statement}%`);
  });
}

/**
 * Find test files recursively
 */
async function findTestFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && /\.test\.(ts|js)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}

program.parse();
