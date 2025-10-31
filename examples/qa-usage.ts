/**
 * QA System Usage Examples
 * Demonstrates how to use the QA Manager
 */

import { QAManager, defaultQAConfig } from '../src/qa';
import { QAOrchestrationOptions } from '../src/qa/types';

/**
 * Example 1: Run full QA suite
 */
async function runFullQA() {
  console.log('=== Running Full QA Suite ===\n');

  const qaManager = new QAManager(defaultQAConfig);

  const options: QAOrchestrationOptions = {
    runTests: true,
    runSecurity: true,
    runPerformance: true,
    runQualityChecks: true,
    generateEvidence: true,
    linkToGitHub: true,
    issueNumber: 123 // Link to GitHub issue #123
  };

  try {
    const result = await qaManager.runQA(options);

    console.log('\n=== QA Results ===');
    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Quality Gates: ${result.qualityGatesPassed.filter(g => g.passed).length}/${result.qualityGatesPassed.length} passed`);

    if (result.tests) {
      console.log(`\nTests: ${result.tests.passed}/${result.tests.total} passed`);
      console.log(`Coverage: ${result.tests.coverage.lines.pct.toFixed(1)}%`);
    }

    if (result.security) {
      console.log(`\nSecurity: ${result.security.summary.critical} critical, ${result.security.summary.high} high`);
    }

    if (result.performance) {
      console.log(`\nPerformance: ${result.performance.metrics.filter(m => m.passed).length}/${result.performance.metrics.length} metrics passed`);
    }

    return result;
  } catch (error) {
    console.error('QA failed:', error);
    throw error;
  }
}

/**
 * Example 2: Run tests only
 */
async function runTestsOnly() {
  console.log('=== Running Tests Only ===\n');

  const qaManager = new QAManager(defaultQAConfig);

  const options: QAOrchestrationOptions = {
    runTests: true,
    runSecurity: false,
    runPerformance: false,
    runQualityChecks: false,
    generateEvidence: true,
    linkToGitHub: false
  };

  const result = await qaManager.runQA(options);

  console.log('\n=== Test Results ===');
  console.log(`Tests: ${result.tests.passed}/${result.tests.total} passed`);
  console.log(`Coverage: ${result.tests.coverage.lines.pct.toFixed(1)}%`);

  return result;
}

/**
 * Example 3: Run security scan only
 */
async function runSecurityOnly() {
  console.log('=== Running Security Scan Only ===\n');

  const qaManager = new QAManager(defaultQAConfig);

  const options: QAOrchestrationOptions = {
    runTests: false,
    runSecurity: true,
    runPerformance: false,
    runQualityChecks: false,
    generateEvidence: true,
    linkToGitHub: false
  };

  const result = await qaManager.runQA(options);

  console.log('\n=== Security Results ===');
  console.log(`Vulnerabilities Found:`);
  console.log(`  Critical: ${result.security.summary.critical}`);
  console.log(`  High: ${result.security.summary.high}`);
  console.log(`  Medium: ${result.security.summary.medium}`);
  console.log(`  Low: ${result.security.summary.low}`);

  return result;
}

/**
 * Example 4: Run performance benchmarks
 */
async function runPerformanceOnly() {
  console.log('=== Running Performance Benchmarks Only ===\n');

  const qaManager = new QAManager(defaultQAConfig);

  const options: QAOrchestrationOptions = {
    runTests: false,
    runSecurity: false,
    runPerformance: true,
    runQualityChecks: false,
    generateEvidence: true,
    linkToGitHub: false
  };

  const result = await qaManager.runQA(options);

  console.log('\n=== Performance Results ===');
  for (const metric of result.performance.metrics) {
    console.log(`${metric.name}: ${metric.value.toFixed(2)}${metric.unit} (threshold: ${metric.threshold}${metric.unit}) ${metric.passed ? '✅' : '❌'}`);
  }

  return result;
}

/**
 * Example 5: Custom QA configuration
 */
async function runWithCustomConfig() {
  console.log('=== Running QA with Custom Config ===\n');

  // Create custom config with stricter requirements
  const customConfig = {
    ...defaultQAConfig,
    qualityGates: {
      ...defaultQAConfig.qualityGates,
      coverage: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        mediumVulnerabilities: 2
      }
    }
  };

  const qaManager = new QAManager(customConfig);

  const options: QAOrchestrationOptions = {
    runTests: true,
    runSecurity: true,
    runPerformance: true,
    runQualityChecks: true,
    generateEvidence: true,
    linkToGitHub: false
  };

  const result = await qaManager.runQA(options);

  console.log('\n=== Custom Config Results ===');
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

  return result;
}

/**
 * Example 6: CI/CD Integration
 */
async function runForCI() {
  console.log('=== Running QA for CI/CD ===\n');

  const qaManager = new QAManager(defaultQAConfig);

  const options: QAOrchestrationOptions = {
    runTests: true,
    runSecurity: true,
    runPerformance: true,
    runQualityChecks: true,
    generateEvidence: true,
    linkToGitHub: true,
    issueNumber: process.env.GITHUB_PR_NUMBER ? parseInt(process.env.GITHUB_PR_NUMBER) : undefined
  };

  try {
    const result = await qaManager.runQA(options);

    // Exit with appropriate code for CI/CD
    if (result.passed) {
      console.log('\n✅ All quality gates passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some quality gates failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ QA execution failed:', error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'full':
      runFullQA();
      break;
    case 'tests':
      runTestsOnly();
      break;
    case 'security':
      runSecurityOnly();
      break;
    case 'performance':
      runPerformanceOnly();
      break;
    case 'custom':
      runWithCustomConfig();
      break;
    case 'ci':
      runForCI();
      break;
    default:
      console.log('Usage: ts-node qa-usage.ts <command>');
      console.log('Commands: full, tests, security, performance, custom, ci');
      process.exit(1);
  }
}

export {
  runFullQA,
  runTestsOnly,
  runSecurityOnly,
  runPerformanceOnly,
  runWithCustomConfig,
  runForCI
};
