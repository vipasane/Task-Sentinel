/**
 * QA Manager - Orchestrates Quality Assurance Activities
 * Integrates testing, security scanning, performance benchmarking, and evidence collection
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  QAConfig,
  QAResult,
  QAOrchestrationOptions,
  TestResults,
  SecurityResults,
  PerformanceResults,
  CodeQualityResults,
  QualityGateStatus,
  EvidenceArtifacts,
  GitHubEvidenceLink
} from './types';
import { TestGenerator } from './generators/test-generator';
import { SecurityScanner } from './scanners/security-scanner';
import { PerformanceBenchmark } from './benchmarks/performance-benchmark';
import { EvidenceCollector } from './reporters/evidence-collector';
import { CodeQualityAnalyzer } from './scanners/code-quality-analyzer';

export class QAManager {
  private config: QAConfig;
  private testGenerator: TestGenerator;
  private securityScanner: SecurityScanner;
  private performanceBenchmark: PerformanceBenchmark;
  private evidenceCollector: EvidenceCollector;
  private codeQualityAnalyzer: CodeQualityAnalyzer;

  constructor(config: QAConfig) {
    this.config = config;
    this.testGenerator = new TestGenerator(config.testGeneration);
    this.securityScanner = new SecurityScanner(config.securityScanning);
    this.performanceBenchmark = new PerformanceBenchmark(config.performanceBenchmark);
    this.evidenceCollector = new EvidenceCollector(config.evidenceCollection);
    this.codeQualityAnalyzer = new CodeQualityAnalyzer();
  }

  /**
   * Run comprehensive QA checks
   */
  async runQA(options: QAOrchestrationOptions): Promise<QAResult> {
    console.log('🔍 Starting QA Orchestration...');
    const startTime = Date.now();

    try {
      // Initialize result structure
      const result: Partial<QAResult> = {
        timestamp: new Date(),
        passed: false,
        qualityGatesPassed: []
      };

      // 1. Test Generation and Execution
      if (options.runTests) {
        console.log('📝 Generating and running tests...');
        result.tests = await this.runTests();
      }

      // 2. Security Scanning
      if (options.runSecurity) {
        console.log('🔒 Running security scans...');
        result.security = await this.runSecurityScans();
      }

      // 3. Performance Benchmarking
      if (options.runPerformance) {
        console.log('⚡ Running performance benchmarks...');
        result.performance = await this.runPerformanceBenchmarks();
      }

      // 4. Code Quality Analysis
      if (options.runQualityChecks) {
        console.log('📊 Analyzing code quality...');
        result.codeQuality = await this.runCodeQualityAnalysis();
      }

      // 5. Evaluate Quality Gates
      console.log('🚪 Evaluating quality gates...');
      result.qualityGatesPassed = this.evaluateQualityGates(
        result.tests,
        result.security,
        result.performance,
        result.codeQuality
      );

      // 6. Collect Evidence
      if (options.generateEvidence) {
        console.log('📦 Collecting evidence artifacts...');
        result.evidence = await this.collectEvidence(result as QAResult);
      }

      // 7. Link to GitHub
      if (options.linkToGitHub && options.issueNumber) {
        console.log('🔗 Linking evidence to GitHub issue...');
        await this.linkEvidenceToGitHub(
          options.issueNumber,
          result.evidence!,
          result.qualityGatesPassed
        );
      }

      // Calculate final result
      result.duration = Date.now() - startTime;
      result.passed = result.qualityGatesPassed.every(gate => gate.passed);

      console.log(`✅ QA Orchestration complete in ${result.duration}ms`);
      console.log(`Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

      return result as QAResult;
    } catch (error) {
      console.error('❌ QA Orchestration failed:', error);
      throw error;
    }
  }

  /**
   * Generate and execute tests
   */
  private async runTests(): Promise<TestResults> {
    // Generate tests if needed
    await this.testGenerator.generateTests();

    // Run tests with coverage
    const testCommand = 'npm test -- --coverage --json --outputFile=test-results.json';

    try {
      execSync(testCommand, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
    } catch (error) {
      console.warn('Some tests failed, but continuing with analysis...');
    }

    // Parse test results
    const resultsPath = path.join(process.cwd(), 'test-results.json');
    const resultsData = await fs.readFile(resultsPath, 'utf-8');
    const results = JSON.parse(resultsData);

    // Parse coverage
    const coverage = await this.parseCoverage();

    return {
      total: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      skipped: results.numPendingTests,
      duration: results.testResults.reduce((sum: number, suite: any) =>
        sum + suite.perfStats.runtime, 0),
      coverage,
      suites: results.testResults.map((suite: any) => ({
        name: suite.name,
        tests: suite.assertionResults.map((test: any) => ({
          name: test.title,
          status: test.status,
          duration: test.duration,
          error: test.failureMessages?.[0],
          stack: test.failureMessages?.[1]
        })),
        duration: suite.perfStats.runtime,
        passed: suite.status === 'passed'
      }))
    };
  }

  /**
   * Parse coverage results
   */
  private async parseCoverage() {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

    try {
      const coverageData = await fs.readFile(coveragePath, 'utf-8');
      const coverage = JSON.parse(coverageData);
      const total = coverage.total;

      return {
        lines: {
          total: total.lines.total,
          covered: total.lines.covered,
          pct: total.lines.pct
        },
        functions: {
          total: total.functions.total,
          covered: total.functions.covered,
          pct: total.functions.pct
        },
        branches: {
          total: total.branches.total,
          covered: total.branches.covered,
          pct: total.branches.pct
        },
        statements: {
          total: total.statements.total,
          covered: total.statements.covered,
          pct: total.statements.pct
        }
      };
    } catch (error) {
      console.warn('Could not parse coverage results:', error);
      return {
        lines: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 },
        statements: { total: 0, covered: 0, pct: 0 }
      };
    }
  }

  /**
   * Run security scans
   */
  private async runSecurityScans(): Promise<SecurityResults> {
    return await this.securityScanner.runScans();
  }

  /**
   * Run performance benchmarks
   */
  private async runPerformanceBenchmarks(): Promise<PerformanceResults> {
    return await this.performanceBenchmark.runBenchmarks();
  }

  /**
   * Run code quality analysis
   */
  private async runCodeQualityAnalysis(): Promise<CodeQualityResults> {
    return await this.codeQualityAnalyzer.analyze();
  }

  /**
   * Evaluate quality gates
   */
  private evaluateQualityGates(
    tests?: TestResults,
    security?: SecurityResults,
    performance?: PerformanceResults,
    codeQuality?: CodeQualityResults
  ): QualityGateStatus[] {
    const gates: QualityGateStatus[] = [];

    // Coverage gates
    if (tests?.coverage) {
      gates.push({
        gate: 'Line Coverage',
        passed: tests.coverage.lines.pct >= this.config.qualityGates.coverage.lines,
        actual: tests.coverage.lines.pct,
        threshold: this.config.qualityGates.coverage.lines,
        message: `Line coverage ${tests.coverage.lines.pct.toFixed(1)}% (threshold: ${this.config.qualityGates.coverage.lines}%)`
      });

      gates.push({
        gate: 'Function Coverage',
        passed: tests.coverage.functions.pct >= this.config.qualityGates.coverage.functions,
        actual: tests.coverage.functions.pct,
        threshold: this.config.qualityGates.coverage.functions,
        message: `Function coverage ${tests.coverage.functions.pct.toFixed(1)}% (threshold: ${this.config.qualityGates.coverage.functions}%)`
      });

      gates.push({
        gate: 'Branch Coverage',
        passed: tests.coverage.branches.pct >= this.config.qualityGates.coverage.branches,
        actual: tests.coverage.branches.pct,
        threshold: this.config.qualityGates.coverage.branches,
        message: `Branch coverage ${tests.coverage.branches.pct.toFixed(1)}% (threshold: ${this.config.qualityGates.coverage.branches}%)`
      });
    }

    // Security gates
    if (security) {
      gates.push({
        gate: 'Critical Vulnerabilities',
        passed: security.summary.critical <= this.config.qualityGates.security.criticalVulnerabilities,
        actual: security.summary.critical,
        threshold: this.config.qualityGates.security.criticalVulnerabilities,
        message: `${security.summary.critical} critical vulnerabilities (max: ${this.config.qualityGates.security.criticalVulnerabilities})`
      });

      gates.push({
        gate: 'High Vulnerabilities',
        passed: security.summary.high <= this.config.qualityGates.security.highVulnerabilities,
        actual: security.summary.high,
        threshold: this.config.qualityGates.security.highVulnerabilities,
        message: `${security.summary.high} high vulnerabilities (max: ${this.config.qualityGates.security.highVulnerabilities})`
      });
    }

    // Performance gates
    if (performance?.benchmarks.length) {
      const p95Benchmark = performance.benchmarks.find(b => b.name.includes('p95'));
      if (p95Benchmark) {
        gates.push({
          gate: 'P95 Response Time',
          passed: p95Benchmark.stats.p95 < this.config.qualityGates.performance.p95ResponseTime,
          actual: p95Benchmark.stats.p95,
          threshold: this.config.qualityGates.performance.p95ResponseTime,
          message: `P95 ${p95Benchmark.stats.p95.toFixed(2)}ms (max: ${this.config.qualityGates.performance.p95ResponseTime}ms)`
        });
      }
    }

    // Code quality gates
    if (codeQuality) {
      gates.push({
        gate: 'Code Quality Score',
        passed: codeQuality.overallScore >= this.config.qualityGates.codeQuality.overallScore,
        actual: codeQuality.overallScore,
        threshold: this.config.qualityGates.codeQuality.overallScore,
        message: `Quality score ${codeQuality.overallScore}/100 (min: ${this.config.qualityGates.codeQuality.overallScore})`
      });

      gates.push({
        gate: 'Cyclomatic Complexity',
        passed: codeQuality.cyclomaticComplexity <= this.config.qualityGates.codeQuality.complexity,
        actual: codeQuality.cyclomaticComplexity,
        threshold: this.config.qualityGates.codeQuality.complexity,
        message: `Complexity ${codeQuality.cyclomaticComplexity} (max: ${this.config.qualityGates.codeQuality.complexity})`
      });
    }

    return gates;
  }

  /**
   * Collect evidence artifacts
   */
  private async collectEvidence(result: QAResult): Promise<EvidenceArtifacts> {
    return await this.evidenceCollector.collect(result);
  }

  /**
   * Link evidence to GitHub issue
   */
  private async linkEvidenceToGitHub(
    issueNumber: number,
    evidence: EvidenceArtifacts,
    qualityGates: QualityGateStatus[]
  ): Promise<GitHubEvidenceLink> {
    const summary = this.generateQASummary(qualityGates);

    // Upload artifacts to GitHub (requires github CLI or API)
    const artifactUrls: string[] = [];

    // Comment on issue with results
    const comment = this.formatGitHubComment(summary, evidence, qualityGates);

    try {
      execSync(`gh issue comment ${issueNumber} --body "${comment.replace(/"/g, '\\"')}"`, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
    } catch (error) {
      console.warn('Could not comment on GitHub issue:', error);
    }

    return {
      issueNumber,
      artifactUrls,
      summary,
      timestamp: new Date()
    };
  }

  /**
   * Generate QA summary
   */
  private generateQASummary(qualityGates: QualityGateStatus[]): string {
    const passed = qualityGates.filter(g => g.passed).length;
    const total = qualityGates.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    return `QA Results: ${passed}/${total} quality gates passed (${percentage}%)`;
  }

  /**
   * Format GitHub comment
   */
  private formatGitHubComment(
    summary: string,
    evidence: EvidenceArtifacts,
    qualityGates: QualityGateStatus[]
  ): string {
    const passed = qualityGates.every(g => g.passed);

    let comment = `## ${passed ? '✅' : '❌'} QA Report\n\n`;
    comment += `${summary}\n\n`;
    comment += `### Quality Gates\n\n`;

    for (const gate of qualityGates) {
      comment += `- ${gate.passed ? '✅' : '❌'} **${gate.gate}**: ${gate.message}\n`;
    }

    comment += `\n### Evidence Artifacts\n\n`;
    comment += `- Test Reports: ${evidence.testReports.length}\n`;
    comment += `- Coverage Reports: ${evidence.coverageReports.length}\n`;
    comment += `- Security Reports: ${evidence.securityReports.length}\n`;
    comment += `- Performance Reports: ${evidence.performanceReports.length}\n`;

    comment += `\n*Generated by Task Sentinel QA Manager*\n`;

    return comment;
  }

  /**
   * Get QA configuration
   */
  getConfig(): QAConfig {
    return this.config;
  }

  /**
   * Update QA configuration
   */
  updateConfig(updates: Partial<QAConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Default QA configuration
 */
export const defaultQAConfig: QAConfig = {
  qualityGates: {
    coverage: {
      lines: 85,
      functions: 85,
      branches: 85,
      statements: 85
    },
    security: {
      criticalVulnerabilities: 0,
      highVulnerabilities: 2,
      mediumVulnerabilities: 5
    },
    performance: {
      p95ResponseTime: 200,
      p99ResponseTime: 500,
      throughput: 100,
      memoryUsage: 512
    },
    codeQuality: {
      overallScore: 80,
      maintainability: 70,
      complexity: 15
    },
    documentation: {
      apiDocumentation: true,
      readmeComplete: true,
      inlineComments: 20
    }
  },
  testGeneration: {
    unit: {
      enabled: true,
      coverage: 85,
      pattern: '**/*.test.ts'
    },
    integration: {
      enabled: true,
      pattern: '**/*.integration.test.ts'
    },
    e2e: {
      enabled: true,
      pattern: '**/*.e2e.test.ts'
    },
    performance: {
      enabled: true,
      iterations: 100
    },
    security: {
      enabled: true,
      scanDepth: 'deep'
    }
  },
  securityScanning: {
    npm: {
      enabled: true,
      level: 'moderate'
    },
    static: {
      enabled: true,
      rules: ['security/detect-unsafe-regex', 'security/detect-non-literal-regexp']
    },
    sast: {
      enabled: true,
      tools: ['eslint-plugin-security', 'semgrep']
    },
    secrets: {
      enabled: true,
      patterns: ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN']
    }
  },
  performanceBenchmark: {
    endpoints: ['/api/tasks', '/api/projects', '/api/reports'],
    iterations: 100,
    warmupRuns: 10,
    concurrency: 10,
    timeout: 5000,
    metrics: ['responseTime', 'throughput', 'memoryUsage']
  },
  evidenceCollection: {
    outputDir: './qa-evidence',
    formats: ['json', 'html', 'markdown'],
    githubIntegration: true,
    retention: 30
  }
};
