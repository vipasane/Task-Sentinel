/**
 * Security Scanner Type Definitions
 * Phase 4: Quality Assurance & Testing
 */

/**
 * Vulnerability severity levels based on CVSS
 */
export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Vulnerability categories for classification
 */
export type VulnerabilityCategory = 'dependency' | 'code' | 'secret' | 'config';

/**
 * Supported report formats
 */
export type ReportFormat = 'json' | 'html' | 'sarif' | 'markdown';

/**
 * Location information for vulnerabilities
 */
export interface VulnerabilityLocation {
  file: string;
  line?: number;
  column?: number;
  snippet?: string;
}

/**
 * Remediation information and suggestions
 */
export interface Remediation {
  suggestion: string;
  auto_fixable: boolean;
  fix_command?: string;
  references?: string[];
}

/**
 * Core vulnerability interface
 */
export interface Vulnerability {
  id: string;
  severity: VulnerabilitySeverity;
  category: VulnerabilityCategory;
  title: string;
  description: string;
  location: VulnerabilityLocation;
  cve?: string;
  cwe?: string;
  cvss_score?: number;
  cvss_vector?: string;
  remediation: Remediation;
  detected_at: Date;
}

/**
 * Dependency vulnerability details
 */
export interface DependencyVulnerability extends Vulnerability {
  package_name: string;
  installed_version: string;
  fixed_version?: string;
  dependency_path: string[];
}

/**
 * Code vulnerability details
 */
export interface CodeVulnerability extends Vulnerability {
  rule_id: string;
  owasp_category?: string;
  pattern: string;
}

/**
 * Secret detection result
 */
export interface SecretVulnerability extends Vulnerability {
  secret_type: string;
  entropy?: number;
  commit_hash?: string;
}

/**
 * Scan configuration options
 */
export interface ScanConfig {
  include_dependencies?: boolean;
  include_code_analysis?: boolean;
  include_secret_detection?: boolean;
  scan_git_history?: boolean;
  max_file_size?: number;
  exclude_patterns?: string[];
  severity_threshold?: VulnerabilitySeverity;
}

/**
 * Scan result summary
 */
export interface ScanResult {
  scan_id: string;
  started_at: Date;
  completed_at: Date;
  duration_ms: number;
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    by_severity: Record<VulnerabilitySeverity, number>;
    by_category: Record<VulnerabilityCategory, number>;
  };
  quality_gate: QualityGateResult;
}

/**
 * Quality gate validation result
 */
export interface QualityGateResult {
  passed: boolean;
  criteria: QualityGateCriteria;
  violations: QualityGateViolation[];
}

/**
 * Quality gate criteria configuration
 */
export interface QualityGateCriteria {
  max_critical: number;
  max_high: number;
  max_medium: number;
  max_low: number;
  allow_secrets: boolean;
  require_dependency_fixes: boolean;
}

/**
 * Quality gate violation details
 */
export interface QualityGateViolation {
  rule: string;
  expected: number;
  actual: number;
  message: string;
}

/**
 * SARIF format result for GitHub Code Scanning
 */
export interface SARIFResult {
  version: string;
  $schema: string;
  runs: SARIFRun[];
}

/**
 * SARIF run object
 */
export interface SARIFRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SARIFRule[];
    };
  };
  results: SARIFResultItem[];
}

/**
 * SARIF rule definition
 */
export interface SARIFRule {
  id: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  help: { text: string };
  properties: {
    tags: string[];
    precision: string;
    'security-severity': string;
  };
}

/**
 * SARIF result item
 */
export interface SARIFResultItem {
  ruleId: string;
  level: string;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number; startColumn?: number };
    };
  }>;
}
