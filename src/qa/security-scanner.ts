/**
 * Security Scanner - Main Orchestrator
 * Phase 4: Quality Assurance & Testing
 *
 * Comprehensive security scanning system with multi-layer detection:
 * - Dependency vulnerabilities
 * - Static code analysis (OWASP Top 10)
 * - Secret detection
 * - Quality gate validation
 */

import * as crypto from 'crypto';
import { DependencyScanner } from './scanners/dependency-scanner';
import { CodeScanner } from './scanners/code-scanner';
import { SecretScanner } from './scanners/secret-scanner';
import { ReportGenerator } from './report-generator';
import {
  ScanConfig,
  ScanResult,
  Vulnerability,
  QualityGateResult,
  QualityGateCriteria,
  QualityGateViolation,
  VulnerabilitySeverity,
} from './types';

/**
 * Main Security Scanner Class
 */
export class SecurityScanner {
  private projectRoot: string;
  private config: Required<ScanConfig>;
  private dependencyScanner: DependencyScanner;
  private codeScanner: CodeScanner;
  private secretScanner: SecretScanner;
  private reportGenerator: ReportGenerator;

  constructor(projectRoot: string, config: ScanConfig = {}) {
    this.projectRoot = projectRoot;
    this.config = this.normalizeConfig(config);

    // Initialize scanners
    this.dependencyScanner = new DependencyScanner(projectRoot);
    this.codeScanner = new CodeScanner(projectRoot);
    this.secretScanner = new SecretScanner(projectRoot);
    this.reportGenerator = new ReportGenerator(projectRoot);
  }

  /**
   * Normalize and set default configuration
   */
  private normalizeConfig(config: ScanConfig): Required<ScanConfig> {
    return {
      include_dependencies: config.include_dependencies ?? true,
      include_code_analysis: config.include_code_analysis ?? true,
      include_secret_detection: config.include_secret_detection ?? true,
      scan_git_history: config.scan_git_history ?? false,
      max_file_size: config.max_file_size ?? 1024 * 1024, // 1MB
      exclude_patterns: config.exclude_patterns ?? [],
      severity_threshold: config.severity_threshold ?? 'low',
    };
  }

  /**
   * Run comprehensive security scan
   */
  async scan(): Promise<ScanResult> {
    const scanId = this.generateScanId();
    const startTime = new Date();
    const vulnerabilities: Vulnerability[] = [];

    console.log('🔍 Starting security scan...');
    console.log(`Scan ID: ${scanId}`);

    try {
      // Layer 1: Dependency Scanning
      if (this.config.include_dependencies) {
        console.log('\n📦 Scanning dependencies...');
        const depVulns = await this.dependencyScanner.scan();
        vulnerabilities.push(...depVulns);
        console.log(`Found ${depVulns.length} dependency vulnerabilities`);
      }

      // Layer 2: Static Code Analysis
      if (this.config.include_code_analysis) {
        console.log('\n🔎 Analyzing code...');
        const codeVulns = await this.codeScanner.scan(this.config.exclude_patterns);
        vulnerabilities.push(...codeVulns);
        console.log(`Found ${codeVulns.length} code vulnerabilities`);
      }

      // Layer 3: Secret Detection
      if (this.config.include_secret_detection) {
        console.log('\n🔐 Detecting secrets...');
        const secretVulns = await this.secretScanner.scan(this.config.scan_git_history);
        vulnerabilities.push(...secretVulns);
        console.log(`Found ${secretVulns.length} secret exposures`);
      }

      // Filter by severity threshold
      const filteredVulns = this.filterBySeverity(vulnerabilities);

      // Generate summary
      const summary = this.generateSummary(filteredVulns);

      // Validate quality gate
      const qualityGate = this.validateQualityGate(filteredVulns);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log('\n✅ Security scan complete');
      console.log(`Duration: ${duration}ms`);
      console.log(`Total vulnerabilities: ${filteredVulns.length}`);
      console.log(`Quality gate: ${qualityGate.passed ? 'PASSED' : 'FAILED'}`);

      return {
        scan_id: scanId,
        started_at: startTime,
        completed_at: endTime,
        duration_ms: duration,
        vulnerabilities: filteredVulns,
        summary,
        quality_gate: qualityGate,
      };
    } catch (error) {
      console.error('❌ Security scan failed:', error);
      throw error;
    }
  }

  /**
   * Run scan and generate reports
   */
  async scanAndReport(formats: Array<'json' | 'html' | 'sarif' | 'markdown'> = ['json']): Promise<ScanResult> {
    const result = await this.scan();

    console.log('\n📄 Generating reports...');
    for (const format of formats) {
      const reportPath = await this.reportGenerator.generate(result, format);
      console.log(`${format.toUpperCase()} report: ${reportPath}`);
    }

    return result;
  }

  /**
   * Filter vulnerabilities by severity threshold
   */
  private filterBySeverity(vulnerabilities: Vulnerability[]): Vulnerability[] {
    const severityOrder: VulnerabilitySeverity[] = ['critical', 'high', 'medium', 'low'];
    const thresholdIndex = severityOrder.indexOf(this.config.severity_threshold);

    return vulnerabilities.filter(vuln => {
      const vulnIndex = severityOrder.indexOf(vuln.severity);
      return vulnIndex <= thresholdIndex;
    });
  }

  /**
   * Generate scan summary statistics
   */
  private generateSummary(vulnerabilities: Vulnerability[]) {
    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const byCategory = {
      dependency: 0,
      code: 0,
      secret: 0,
      config: 0,
    };

    for (const vuln of vulnerabilities) {
      bySeverity[vuln.severity]++;
      byCategory[vuln.category]++;
    }

    return {
      total: vulnerabilities.length,
      by_severity: bySeverity,
      by_category: byCategory,
    };
  }

  /**
   * Validate quality gate criteria
   */
  private validateQualityGate(vulnerabilities: Vulnerability[]): QualityGateResult {
    const criteria: QualityGateCriteria = {
      max_critical: 0,
      max_high: 5,
      max_medium: 20,
      max_low: 50,
      allow_secrets: false,
      require_dependency_fixes: true,
    };

    const violations: QualityGateViolation[] = [];
    const summary = this.generateSummary(vulnerabilities);

    // Check critical vulnerabilities
    if (summary.by_severity.critical > criteria.max_critical) {
      violations.push({
        rule: 'max_critical',
        expected: criteria.max_critical,
        actual: summary.by_severity.critical,
        message: `Found ${summary.by_severity.critical} critical vulnerabilities (max: ${criteria.max_critical})`,
      });
    }

    // Check high severity vulnerabilities
    if (summary.by_severity.high > criteria.max_high) {
      violations.push({
        rule: 'max_high',
        expected: criteria.max_high,
        actual: summary.by_severity.high,
        message: `Found ${summary.by_severity.high} high severity vulnerabilities (max: ${criteria.max_high})`,
      });
    }

    // Check medium severity vulnerabilities
    if (summary.by_severity.medium > criteria.max_medium) {
      violations.push({
        rule: 'max_medium',
        expected: criteria.max_medium,
        actual: summary.by_severity.medium,
        message: `Found ${summary.by_severity.medium} medium severity vulnerabilities (max: ${criteria.max_medium})`,
      });
    }

    // Check for secrets
    if (!criteria.allow_secrets && summary.by_category.secret > 0) {
      violations.push({
        rule: 'allow_secrets',
        expected: 0,
        actual: summary.by_category.secret,
        message: `Found ${summary.by_category.secret} exposed secrets (allowed: 0)`,
      });
    }

    // Check for dependency vulnerabilities with available fixes
    if (criteria.require_dependency_fixes) {
      const fixableDeps = vulnerabilities.filter(
        v => v.category === 'dependency' && v.remediation.auto_fixable
      );
      if (fixableDeps.length > 0) {
        violations.push({
          rule: 'require_dependency_fixes',
          expected: 0,
          actual: fixableDeps.length,
          message: `Found ${fixableDeps.length} dependency vulnerabilities with available fixes`,
        });
      }
    }

    return {
      passed: violations.length === 0,
      criteria,
      violations,
    };
  }

  /**
   * Calculate CVSS score for vulnerability
   */
  calculateCVSS(vulnerability: Vulnerability): number {
    // Simplified CVSS calculation based on severity and category
    let baseScore = 0;

    // Base score from severity
    switch (vulnerability.severity) {
      case 'critical':
        baseScore = 9.5;
        break;
      case 'high':
        baseScore = 7.5;
        break;
      case 'medium':
        baseScore = 5.0;
        break;
      case 'low':
        baseScore = 2.5;
        break;
    }

    // Adjust based on category
    if (vulnerability.category === 'secret') {
      baseScore = Math.min(10, baseScore + 1.0); // Secrets are critical
    }

    return Math.round(baseScore * 10) / 10;
  }

  /**
   * Generate unique scan ID
   */
  private generateScanId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `scan-${timestamp}-${random}`;
  }

  /**
   * Get scan statistics
   */
  getStatistics(result: ScanResult) {
    return {
      total_vulnerabilities: result.vulnerabilities.length,
      critical_count: result.summary.by_severity.critical,
      high_count: result.summary.by_severity.high,
      medium_count: result.summary.by_severity.medium,
      low_count: result.summary.by_severity.low,
      dependency_count: result.summary.by_category.dependency,
      code_count: result.summary.by_category.code,
      secret_count: result.summary.by_category.secret,
      config_count: result.summary.by_category.config,
      auto_fixable: result.vulnerabilities.filter(v => v.remediation.auto_fixable).length,
      quality_gate_passed: result.quality_gate.passed,
      scan_duration_ms: result.duration_ms,
    };
  }
}

// Export main scanner and types
export * from './types';
export { DependencyScanner } from './scanners/dependency-scanner';
export { CodeScanner } from './scanners/code-scanner';
export { SecretScanner } from './scanners/secret-scanner';
