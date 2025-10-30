import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * CoverageAnalyzer - Analyzes test coverage and generates reports
 */
export class CoverageAnalyzer {
  constructor(
    private config: CoverageConfig = {
      threshold: {
        line: 90,
        function: 90,
        branch: 85,
        statement: 80
      },
      reportFormats: ['text', 'lcov', 'html'],
      outputDir: 'coverage'
    }
  ) {}

  /**
   * Run coverage analysis
   */
  async analyzeCoverage(testDir: string = 'tests'): Promise<CoverageReport> {
    console.log('📊 Running coverage analysis...');

    try {
      // Run tests with coverage
      const { stdout, stderr } = await execAsync(
        `npx jest --coverage --coverageDirectory=${this.config.outputDir} ${testDir}`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      // Parse coverage results
      const coverage = await this.parseCoverageResults();

      // Check thresholds
      const thresholdResults = this.checkThresholds(coverage);

      // Generate reports
      await this.generateReports(coverage);

      console.log('✅ Coverage analysis complete');

      return {
        coverage,
        thresholdResults,
        passed: thresholdResults.every(r => r.passed),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Coverage analysis failed:', error);
      throw error;
    }
  }

  /**
   * Parse coverage results from coverage-summary.json
   */
  private async parseCoverageResults(): Promise<Coverage> {
    const summaryPath = path.join(this.config.outputDir, 'coverage-summary.json');

    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      const summary = JSON.parse(content);

      const total = summary.total;

      return {
        line: total.lines.pct,
        function: total.functions.pct,
        branch: total.branches.pct,
        statement: total.statements.pct,
        details: this.extractFileDetails(summary)
      };
    } catch (error) {
      console.warn('⚠️ Could not parse coverage summary, using estimates');
      return {
        line: 0,
        function: 0,
        branch: 0,
        statement: 0,
        details: []
      };
    }
  }

  /**
   * Extract per-file coverage details
   */
  private extractFileDetails(summary: any): FileCoverage[] {
    const details: FileCoverage[] = [];

    for (const [filePath, data] of Object.entries(summary)) {
      if (filePath === 'total') continue;

      const fileData = data as any;
      details.push({
        file: filePath,
        line: fileData.lines.pct,
        function: fileData.functions.pct,
        branch: fileData.branches.pct,
        statement: fileData.statements.pct,
        uncoveredLines: this.extractUncoveredLines(fileData.lines)
      });
    }

    return details.sort((a, b) => a.line - b.line); // Sort by worst coverage first
  }

  /**
   * Extract uncovered line numbers
   */
  private extractUncoveredLines(linesData: any): number[] {
    const uncovered: number[] = [];

    if (linesData.detail) {
      for (const [line, hits] of Object.entries(linesData.detail)) {
        if (hits === 0) {
          uncovered.push(parseInt(line));
        }
      }
    }

    return uncovered;
  }

  /**
   * Check coverage against thresholds
   */
  private checkThresholds(coverage: Coverage): ThresholdResult[] {
    const results: ThresholdResult[] = [];

    const metrics: Array<keyof typeof this.config.threshold> = ['line', 'function', 'branch', 'statement'];

    for (const metric of metrics) {
      const actual = coverage[metric];
      const threshold = this.config.threshold[metric];
      const passed = actual >= threshold;

      results.push({
        metric,
        actual,
        threshold,
        passed,
        delta: actual - threshold
      });
    }

    return results;
  }

  /**
   * Generate coverage reports
   */
  private async generateReports(coverage: Coverage): Promise<void> {
    console.log('\n📄 Generating coverage reports...');

    // Text report
    if (this.config.reportFormats.includes('text')) {
      await this.generateTextReport(coverage);
    }

    // HTML report
    if (this.config.reportFormats.includes('html')) {
      console.log(`  HTML report: ${path.join(this.config.outputDir, 'lcov-report/index.html')}`);
    }

    // LCOV report
    if (this.config.reportFormats.includes('lcov')) {
      console.log(`  LCOV report: ${path.join(this.config.outputDir, 'lcov.info')}`);
    }
  }

  /**
   * Generate text coverage report
   */
  private async generateTextReport(coverage: Coverage): Promise<void> {
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════════╗');
    lines.push('║                 COVERAGE REPORT                           ║');
    lines.push('╠═══════════════════════════════════════════════════════════╣');
    lines.push('║ Metric     │ Coverage │ Threshold │ Status               ║');
    lines.push('╠════════════╪══════════╪═══════════╪══════════════════════╣');

    const metrics: Array<{ name: string; key: keyof Coverage }> = [
      { name: 'Line      ', key: 'line' },
      { name: 'Function  ', key: 'function' },
      { name: 'Branch    ', key: 'branch' },
      { name: 'Statement ', key: 'statement' }
    ];

    for (const { name, key } of metrics) {
      const actual = coverage[key];
      const threshold = this.config.threshold[key as keyof typeof this.config.threshold];
      const status = actual >= threshold ? '✅ PASS' : '❌ FAIL';
      const actualStr = `${actual.toFixed(1)}%`.padStart(7);
      const thresholdStr = `${threshold}%`.padStart(8);

      lines.push(`║ ${name} │ ${actualStr} │ ${thresholdStr} │ ${status.padEnd(20)} ║`);
    }

    lines.push('╚════════════╧══════════╧═══════════╧══════════════════════╝');

    // Worst covered files
    if (coverage.details && coverage.details.length > 0) {
      lines.push('');
      lines.push('📉 Files needing attention (lowest coverage):');
      lines.push('');

      const worstFiles = coverage.details.slice(0, 5);
      for (const file of worstFiles) {
        lines.push(`  ${path.basename(file.file)}`);
        lines.push(`    Line: ${file.line.toFixed(1)}% | Branch: ${file.branch.toFixed(1)}%`);
        if (file.uncoveredLines.length > 0) {
          const lineNumbers = file.uncoveredLines.slice(0, 10).join(', ');
          lines.push(`    Uncovered lines: ${lineNumbers}${file.uncoveredLines.length > 10 ? '...' : ''}`);
        }
        lines.push('');
      }
    }

    const report = lines.join('\n');
    console.log('\n' + report);

    // Write to file
    const reportPath = path.join(this.config.outputDir, 'coverage-report.txt');
    await fs.writeFile(reportPath, report, 'utf-8');
    console.log(`  Text report: ${reportPath}`);
  }

  /**
   * Get coverage trend over time
   */
  async getCoverageTrend(days: number = 30): Promise<CoverageTrend[]> {
    const trendFile = path.join(this.config.outputDir, 'coverage-trend.json');

    try {
      const content = await fs.readFile(trendFile, 'utf-8');
      const trends: CoverageTrend[] = JSON.parse(content);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      return trends.filter(t => new Date(t.timestamp) >= cutoff);
    } catch (error) {
      return [];
    }
  }

  /**
   * Save coverage to trend history
   */
  async saveCoverageTrend(coverage: Coverage): Promise<void> {
    const trendFile = path.join(this.config.outputDir, 'coverage-trend.json');

    let trends: CoverageTrend[] = [];

    try {
      const content = await fs.readFile(trendFile, 'utf-8');
      trends = JSON.parse(content);
    } catch (error) {
      // File doesn't exist yet
    }

    trends.push({
      timestamp: new Date(),
      line: coverage.line,
      function: coverage.function,
      branch: coverage.branch,
      statement: coverage.statement
    });

    // Keep only last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    trends = trends.filter(t => new Date(t.timestamp) >= cutoff);

    await fs.writeFile(trendFile, JSON.stringify(trends, null, 2), 'utf-8');
  }

  /**
   * Generate coverage badge
   */
  generateBadge(coverage: Coverage): string {
    const pct = coverage.line;
    let color = 'red';

    if (pct >= 90) color = 'brightgreen';
    else if (pct >= 80) color = 'green';
    else if (pct >= 70) color = 'yellowgreen';
    else if (pct >= 60) color = 'yellow';
    else if (pct >= 50) color = 'orange';

    return `https://img.shields.io/badge/coverage-${pct.toFixed(0)}%25-${color}`;
  }
}

// Type Definitions
export interface CoverageConfig {
  threshold: {
    line: number;
    function: number;
    branch: number;
    statement: number;
  };
  reportFormats: Array<'text' | 'lcov' | 'html' | 'json'>;
  outputDir: string;
}

export interface Coverage {
  line: number;
  function: number;
  branch: number;
  statement: number;
  details?: FileCoverage[];
}

export interface FileCoverage {
  file: string;
  line: number;
  function: number;
  branch: number;
  statement: number;
  uncoveredLines: number[];
}

export interface CoverageReport {
  coverage: Coverage;
  thresholdResults: ThresholdResult[];
  passed: boolean;
  timestamp: Date;
}

export interface ThresholdResult {
  metric: string;
  actual: number;
  threshold: number;
  passed: boolean;
  delta: number;
}

export interface CoverageTrend {
  timestamp: Date;
  line: number;
  function: number;
  branch: number;
  statement: number;
}
