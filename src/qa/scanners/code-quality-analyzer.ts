/**
 * Code Quality Analyzer
 * Analyzes code quality metrics and maintainability
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import { CodeQualityResults, CodeQualityIssue } from '../types';

export class CodeQualityAnalyzer {
  /**
   * Analyze code quality
   */
  async analyze(): Promise<CodeQualityResults> {
    console.log('📊 Analyzing code quality...');
    const startTime = Date.now();

    const metrics = await Promise.all([
      this.calculateComplexity(),
      this.calculateMaintainability(),
      this.countLinesOfCode(),
      this.detectIssues()
    ]);

    const [complexity, maintainability, linesOfCode, issues] = metrics;

    // Calculate overall score (0-100)
    const overallScore = this.calculateOverallScore(
      complexity,
      maintainability,
      issues
    );

    const passed = overallScore >= 80 && complexity <= 15;

    console.log(`✅ Code quality analysis complete in ${Date.now() - startTime}ms`);
    console.log(`   Overall score: ${overallScore}/100`);

    return {
      overallScore,
      maintainabilityIndex: maintainability,
      cyclomaticComplexity: complexity,
      linesOfCode,
      technicalDebt: this.estimateTechnicalDebt(issues, linesOfCode),
      issues,
      passed
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  private async calculateComplexity(): Promise<number> {
    const files = await glob('src/**/*.ts', {
      ignore: ['**/*.test.ts', '**/*.spec.ts']
    });

    let totalComplexity = 0;
    let functionCount = 0;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const fileComplexity = this.analyzeComplexity(content);
      totalComplexity += fileComplexity.total;
      functionCount += fileComplexity.functions;
    }

    return functionCount > 0 ? totalComplexity / functionCount : 0;
  }

  /**
   * Analyze complexity of a file
   */
  private analyzeComplexity(code: string): { total: number; functions: number } {
    let complexity = 1; // Base complexity
    let functions = 0;

    // Count decision points
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\&\&/g,
      /\|\|/g,
      /\?/g
    ];

    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    // Count functions
    const functionMatches = code.match(/function\s+\w+|=>\s*{|\w+\s*\(/g);
    if (functionMatches) {
      functions = functionMatches.length;
    }

    return { total: complexity, functions: Math.max(functions, 1) };
  }

  /**
   * Calculate maintainability index
   */
  private async calculateMaintainability(): Promise<number> {
    const files = await glob('src/**/*.ts', {
      ignore: ['**/*.test.ts', '**/*.spec.ts']
    });

    let totalMaintainability = 0;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const mi = this.calculateFileMaintainability(content);
      totalMaintainability += mi;
    }

    return files.length > 0 ? totalMaintainability / files.length : 0;
  }

  /**
   * Calculate maintainability index for a file
   * Simplified version of Maintainability Index formula
   */
  private calculateFileMaintainability(code: string): number {
    const lines = code.split('\n');
    const loc = lines.filter(line => line.trim().length > 0).length;
    const comments = lines.filter(line => line.trim().startsWith('//')).length;
    const complexity = this.analyzeComplexity(code).total;

    // Simplified MI formula: 171 - 5.2 * ln(Volume) - 0.23 * Complexity - 16.2 * ln(LOC)
    // Normalized to 0-100 scale
    const volume = loc * Math.log(loc + 1);
    const mi = 171 - 5.2 * Math.log(volume + 1) - 0.23 * complexity - 16.2 * Math.log(loc + 1);

    // Add bonus for comments
    const commentRatio = loc > 0 ? comments / loc : 0;
    const bonus = commentRatio * 10;

    return Math.max(0, Math.min(100, mi + bonus));
  }

  /**
   * Count lines of code
   */
  private async countLinesOfCode(): Promise<number> {
    const files = await glob('src/**/*.ts', {
      ignore: ['**/*.test.ts', '**/*.spec.ts']
    });

    let totalLines = 0;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      totalLines += lines.length;
    }

    return totalLines;
  }

  /**
   * Detect code quality issues
   */
  private async detectIssues(): Promise<CodeQualityIssue[]> {
    const issues: CodeQualityIssue[] = [];

    try {
      // Run ESLint
      const output = execSync('npx eslint . --format json', {
        cwd: process.cwd(),
        encoding: 'utf-8'
      });

      const results = JSON.parse(output);

      for (const file of results) {
        for (const message of file.messages) {
          issues.push({
            severity: this.mapESLintSeverity(message.severity),
            type: message.ruleId || 'unknown',
            file: file.filePath,
            line: message.line,
            message: message.message,
            rule: message.ruleId || 'unknown'
          });
        }
      }
    } catch (error) {
      // ESLint might fail, but we continue
      console.warn('  ⚠️  ESLint analysis failed:', error);
    }

    return issues;
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(
    complexity: number,
    maintainability: number,
    issues: CodeQualityIssue[]
  ): number {
    // Base score from maintainability (0-100)
    let score = maintainability;

    // Deduct for high complexity (max -20 points)
    if (complexity > 15) {
      score -= Math.min(20, (complexity - 15) * 2);
    }

    // Deduct for issues
    const blockers = issues.filter(i => i.severity === 'blocker').length;
    const critical = issues.filter(i => i.severity === 'critical').length;
    const major = issues.filter(i => i.severity === 'major').length;

    score -= blockers * 5;
    score -= critical * 3;
    score -= major * 1;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estimate technical debt
   */
  private estimateTechnicalDebt(
    issues: CodeQualityIssue[],
    linesOfCode: number
  ): string {
    const blockers = issues.filter(i => i.severity === 'blocker').length;
    const critical = issues.filter(i => i.severity === 'critical').length;
    const major = issues.filter(i => i.severity === 'major').length;

    // Estimate in hours (rough approximation)
    const hours = blockers * 4 + critical * 2 + major * 0.5;
    const days = Math.ceil(hours / 8);

    if (days === 0) {
      return 'None';
    } else if (days <= 1) {
      return `${hours.toFixed(1)} hours`;
    } else {
      return `${days} days`;
    }
  }

  /**
   * Map ESLint severity to quality severity
   */
  private mapESLintSeverity(severity: number): 'blocker' | 'critical' | 'major' | 'minor' | 'info' {
    return severity === 2 ? 'major' : 'minor';
  }
}
