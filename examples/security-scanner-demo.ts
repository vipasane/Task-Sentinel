/**
 * Security Scanner Demonstration
 * Shows comprehensive security scanning capabilities
 */

import { SecurityScanner } from '../src/qa/security-scanner';
import { DependencyScanner } from '../src/qa/scanners/dependency-scanner';
import { CodeScanner } from '../src/qa/scanners/code-scanner';
import { SecretScanner } from '../src/qa/scanners/secret-scanner';

/**
 * Demo 1: Basic Security Scan
 */
async function demoBasicScan() {
  console.log('=== Demo 1: Basic Security Scan ===\n');

  const scanner = new SecurityScanner(process.cwd());
  const result = await scanner.scan();

  console.log(`Scan ID: ${result.scan_id}`);
  console.log(`Duration: ${result.duration_ms}ms`);
  console.log(`\nVulnerabilities Found: ${result.summary.total}`);
  console.log(`  Critical: ${result.summary.by_severity.critical}`);
  console.log(`  High: ${result.summary.by_severity.high}`);
  console.log(`  Medium: ${result.summary.by_severity.medium}`);
  console.log(`  Low: ${result.summary.by_severity.low}`);
  console.log(`\nBy Category:`);
  console.log(`  Dependencies: ${result.summary.by_category.dependency}`);
  console.log(`  Code: ${result.summary.by_category.code}`);
  console.log(`  Secrets: ${result.summary.by_category.secret}`);
  console.log(`  Config: ${result.summary.by_category.config}`);
  console.log(`\nQuality Gate: ${result.quality_gate.passed ? '✅ PASSED' : '❌ FAILED'}`);

  if (!result.quality_gate.passed) {
    console.log(`\nViolations:`);
    for (const violation of result.quality_gate.violations) {
      console.log(`  - ${violation.message}`);
    }
  }

  return result;
}

/**
 * Demo 2: Dependency Vulnerability Scan
 */
async function demoDependencyScan() {
  console.log('\n=== Demo 2: Dependency Vulnerability Scan ===\n');

  const scanner = new DependencyScanner(process.cwd());
  const vulnerabilities = await scanner.scan();

  console.log(`Found ${vulnerabilities.length} dependency issues\n`);

  // Show critical and high severity vulnerabilities
  const criticalAndHigh = vulnerabilities.filter(
    v => v.severity === 'critical' || v.severity === 'high'
  );

  if (criticalAndHigh.length > 0) {
    console.log('Critical/High Severity Dependencies:');
    for (const vuln of criticalAndHigh.slice(0, 5)) {
      console.log(`\n  ${vuln.severity.toUpperCase()}: ${vuln.title}`);
      console.log(`  Package: ${vuln.package_name}@${vuln.installed_version}`);
      if (vuln.fixed_version) {
        console.log(`  Fix Available: ${vuln.fixed_version}`);
      }
      if (vuln.remediation.auto_fixable) {
        console.log(`  Auto-fix: ${vuln.remediation.fix_command}`);
      }
    }
  } else {
    console.log('✅ No critical/high severity dependency vulnerabilities!');
  }

  return vulnerabilities;
}

/**
 * Demo 3: Code Security Analysis (OWASP Top 10)
 */
async function demoCodeAnalysis() {
  console.log('\n=== Demo 3: Code Security Analysis (OWASP Top 10) ===\n');

  const scanner = new CodeScanner(process.cwd());
  const vulnerabilities = await scanner.scan();

  console.log(`Found ${vulnerabilities.length} code vulnerabilities\n`);

  // Group by OWASP category
  const byOwasp = vulnerabilities.reduce((acc, vuln) => {
    const category = vuln.owasp_category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(vuln);
    return acc;
  }, {} as Record<string, typeof vulnerabilities>);

  console.log('Vulnerabilities by OWASP Category:');
  for (const [category, vulns] of Object.entries(byOwasp)) {
    console.log(`\n  ${category} (${vulns.length} issues)`);
    for (const vuln of vulns.slice(0, 2)) {
      console.log(`    - ${vuln.title}`);
      console.log(`      ${vuln.location.file}:${vuln.location.line}`);
      console.log(`      ${vuln.remediation.suggestion}`);
    }
  }

  return vulnerabilities;
}

/**
 * Demo 4: Secret Detection
 */
async function demoSecretDetection() {
  console.log('\n=== Demo 4: Secret Detection ===\n');

  const scanner = new SecretScanner(process.cwd());
  const vulnerabilities = await scanner.scan(false); // Don't scan git history for demo

  console.log(`Found ${vulnerabilities.length} exposed secrets\n`);

  if (vulnerabilities.length > 0) {
    console.log('Detected Secrets:');
    for (const vuln of vulnerabilities.slice(0, 5)) {
      console.log(`\n  ${vuln.secret_type}`);
      console.log(`  Location: ${vuln.location.file}${vuln.location.line ? ':' + vuln.location.line : ''}`);
      console.log(`  Severity: ${vuln.severity}`);
      if (vuln.entropy) {
        console.log(`  Entropy: ${vuln.entropy.toFixed(2)}`);
      }
      console.log(`  Snippet: ${vuln.location.snippet}`);
    }
  } else {
    console.log('✅ No hardcoded secrets detected!');
  }

  return vulnerabilities;
}

/**
 * Demo 5: Comprehensive Scan with Reports
 */
async function demoComprehensiveScanWithReports() {
  console.log('\n=== Demo 5: Comprehensive Scan with Reports ===\n');

  const scanner = new SecurityScanner(process.cwd(), {
    include_dependencies: true,
    include_code_analysis: true,
    include_secret_detection: true,
    scan_git_history: false,
    severity_threshold: 'low',
  });

  console.log('Running comprehensive scan...\n');

  const result = await scanner.scanAndReport(['json', 'markdown']);

  console.log('✅ Scan complete!');
  console.log('\nReports generated:');
  console.log(`  - security-reports/scan-${result.scan_id}.json`);
  console.log(`  - security-reports/scan-${result.scan_id}.md`);

  return result;
}

/**
 * Demo 6: Custom Quality Gates
 */
async function demoCustomQualityGates() {
  console.log('\n=== Demo 6: Custom Quality Gates ===\n');

  const scanner = new SecurityScanner(process.cwd(), {
    include_dependencies: true,
    include_code_analysis: true,
    include_secret_detection: true,
  });

  const result = await scanner.scan();

  // Custom validation logic
  const customGates = {
    noCritical: result.summary.by_severity.critical === 0,
    maxHigh: result.summary.by_severity.high <= 3,
    noSecrets: result.summary.by_category.secret === 0,
    autoFixable: result.vulnerabilities.filter(v => v.remediation.auto_fixable).length > 0,
  };

  console.log('Custom Quality Gates:');
  console.log(`  No Critical Issues: ${customGates.noCritical ? '✅' : '❌'}`);
  console.log(`  High Issues ≤ 3: ${customGates.maxHigh ? '✅' : '❌'}`);
  console.log(`  No Secrets: ${customGates.noSecrets ? '✅' : '❌'}`);
  console.log(`  Auto-fixable Available: ${customGates.autoFixable ? '✅' : '❌'}`);

  const allPassed = Object.values(customGates).every(v => v);
  console.log(`\nOverall: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

  return result;
}

/**
 * Demo 7: CVSS Score Calculation
 */
async function demoCVSSCalculation() {
  console.log('\n=== Demo 7: CVSS Score Calculation ===\n');

  const scanner = new SecurityScanner(process.cwd());
  const result = await scanner.scan();

  console.log('Vulnerability Risk Assessment (CVSS Scores):');

  // Calculate CVSS for all vulnerabilities
  const withScores = result.vulnerabilities.map(vuln => ({
    ...vuln,
    cvss_calculated: scanner.calculateCVSS(vuln),
  }));

  // Sort by CVSS score
  withScores.sort((a, b) => b.cvss_calculated - a.cvss_calculated);

  // Show top 10 highest risk
  console.log('\nTop 10 Highest Risk Vulnerabilities:');
  for (const vuln of withScores.slice(0, 10)) {
    console.log(`\n  [${vuln.cvss_calculated.toFixed(1)}] ${vuln.title}`);
    console.log(`  Severity: ${vuln.severity.toUpperCase()}`);
    console.log(`  Category: ${vuln.category}`);
    console.log(`  Location: ${vuln.location.file}`);
  }

  return withScores;
}

/**
 * Demo 8: Statistics and Metrics
 */
async function demoStatistics() {
  console.log('\n=== Demo 8: Statistics and Metrics ===\n');

  const scanner = new SecurityScanner(process.cwd());
  const result = await scanner.scan();
  const stats = scanner.getStatistics(result);

  console.log('Security Scan Statistics:');
  console.log(`\nVulnerabilities:`);
  console.log(`  Total: ${stats.total_vulnerabilities}`);
  console.log(`  Critical: ${stats.critical_count}`);
  console.log(`  High: ${stats.high_count}`);
  console.log(`  Medium: ${stats.medium_count}`);
  console.log(`  Low: ${stats.low_count}`);

  console.log(`\nBy Category:`);
  console.log(`  Dependencies: ${stats.dependency_count}`);
  console.log(`  Code: ${stats.code_count}`);
  console.log(`  Secrets: ${stats.secret_count}`);
  console.log(`  Config: ${stats.config_count}`);

  console.log(`\nRemediations:`);
  console.log(`  Auto-fixable: ${stats.auto_fixable}`);
  console.log(`  Manual fixes: ${stats.total_vulnerabilities - stats.auto_fixable}`);

  console.log(`\nQuality:`);
  console.log(`  Quality Gate: ${stats.quality_gate_passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Scan Duration: ${stats.scan_duration_ms}ms`);

  return stats;
}

/**
 * Demo 9: CI/CD Simulation
 */
async function demoCICD() {
  console.log('\n=== Demo 9: CI/CD Simulation ===\n');

  const scanner = new SecurityScanner(process.cwd(), {
    include_dependencies: true,
    include_code_analysis: true,
    include_secret_detection: true,
    severity_threshold: 'high', // Only fail on high/critical in CI
  });

  console.log('Simulating CI/CD pipeline security scan...\n');

  try {
    const result = await scanner.scan();

    console.log('Security Scan Results:');
    console.log(`  Status: ${result.quality_gate.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Critical: ${result.summary.by_severity.critical}`);
    console.log(`  High: ${result.summary.by_severity.high}`);

    if (!result.quality_gate.passed) {
      console.log('\n❌ Build would FAIL in CI/CD');
      console.log('Violations:');
      for (const violation of result.quality_gate.violations) {
        console.log(`  - ${violation.message}`);
      }
      return false;
    } else {
      console.log('\n✅ Build would PASS in CI/CD');
      return true;
    }
  } catch (error) {
    console.error('❌ Scan failed:', error);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const demos = [
    { name: 'basic', fn: demoBasicScan, desc: 'Basic security scan' },
    { name: 'dependencies', fn: demoDependencyScan, desc: 'Dependency vulnerabilities' },
    { name: 'code', fn: demoCodeAnalysis, desc: 'Code analysis (OWASP)' },
    { name: 'secrets', fn: demoSecretDetection, desc: 'Secret detection' },
    { name: 'comprehensive', fn: demoComprehensiveScanWithReports, desc: 'Full scan with reports' },
    { name: 'quality-gates', fn: demoCustomQualityGates, desc: 'Custom quality gates' },
    { name: 'cvss', fn: demoCVSSCalculation, desc: 'CVSS scoring' },
    { name: 'stats', fn: demoStatistics, desc: 'Statistics and metrics' },
    { name: 'ci', fn: demoCICD, desc: 'CI/CD simulation' },
  ];

  const command = process.argv[2];

  if (!command || command === 'all') {
    console.log('🔒 Security Scanner Demonstration\n');
    console.log('Running all demos...\n');

    for (const demo of demos) {
      try {
        await demo.fn();
        console.log('\n' + '='.repeat(60) + '\n');
      } catch (error) {
        console.error(`Error in ${demo.name} demo:`, error);
      }
    }
  } else {
    const demo = demos.find(d => d.name === command);
    if (demo) {
      console.log(`🔒 Security Scanner - ${demo.desc}\n`);
      await demo.fn();
    } else {
      console.log('Available demos:');
      for (const demo of demos) {
        console.log(`  ${demo.name.padEnd(20)} - ${demo.desc}`);
      }
      console.log('\nUsage: ts-node security-scanner-demo.ts <demo-name>');
      console.log('       ts-node security-scanner-demo.ts all');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  demoBasicScan,
  demoDependencyScan,
  demoCodeAnalysis,
  demoSecretDetection,
  demoComprehensiveScanWithReports,
  demoCustomQualityGates,
  demoCVSSCalculation,
  demoStatistics,
  demoCICD,
};
