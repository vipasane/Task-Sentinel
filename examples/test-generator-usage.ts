/**
 * Example usage of the Automated Test Generation System
 */

import {
  TestGenerator,
  TestGeneratorFactory,
  TestGeneratorConfig,
} from '../src/qa/test-generator';

/**
 * Example 1: Basic test generation
 */
async function basicTestGeneration() {
  console.log('Example 1: Basic Test Generation\n');

  const generator = TestGeneratorFactory.create({
    sourceDir: './src',
    testDir: './tests',
    framework: 'jest',
    testTypes: ['unit'],
  });

  const tests = await generator.generateTests();
  console.log(`Generated ${tests.length} unit tests`);

  // Write tests to disk
  await generator.writeGeneratedTests(tests);
  console.log('Tests written to ./tests directory\n');
}

/**
 * Example 2: Comprehensive test generation
 */
async function comprehensiveTestGeneration() {
  console.log('Example 2: Comprehensive Test Generation\n');

  const generator = TestGeneratorFactory.create({
    sourceDir: './src',
    testDir: './tests',
    framework: 'jest',
    testTypes: ['unit', 'integration', 'performance', 'security'],
    coverageThreshold: 90,
    mockStyle: 'auto',
  });

  const tests = await generator.generateTests();

  const summary = tests.reduce((acc, test) => {
    acc[test.testType] = (acc[test.testType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Test Generation Summary:');
  console.log(JSON.stringify(summary, null, 2));

  await generator.writeGeneratedTests(tests);
  console.log('All tests written successfully\n');
}

/**
 * Example 3: Coverage gap detection
 */
async function detectCoverageGaps() {
  console.log('Example 3: Coverage Gap Detection\n');

  const generator = TestGeneratorFactory.create({
    sourceDir: './src',
    testDir: './tests',
    framework: 'jest',
    testTypes: ['unit'],
  });

  const gaps = await generator.detectCoverageGaps();

  console.log(`Found ${gaps.length} coverage gaps:\n`);
  gaps.forEach(gap => {
    console.log(`File: ${gap.file}`);
    console.log(`Type: ${gap.type}`);
    console.log(`Suggestion: ${gap.suggestion}`);
    console.log('---');
  });
}

/**
 * Example 4: Custom configuration
 */
async function customConfiguration() {
  console.log('Example 4: Custom Configuration\n');

  const config: TestGeneratorConfig = {
    sourceDir: './src/api',
    testDir: './tests/api',
    framework: 'mocha',
    testTypes: ['integration', 'e2e'],
    coverageThreshold: 85,
    mockStyle: 'sinon',
    assertionStyle: 'should',
  };

  const generator = new TestGenerator(config);
  const tests = await generator.generateTests();

  console.log(`Generated ${tests.length} API tests with Mocha/Sinon`);

  const e2eTests = tests.filter(t => t.testType === 'e2e');
  console.log(`E2E tests: ${e2eTests.length}`);

  const integrationTests = tests.filter(t => t.testType === 'integration');
  console.log(`Integration tests: ${integrationTests.length}\n`);
}

/**
 * Example 5: Performance test generation
 */
async function performanceTestGeneration() {
  console.log('Example 5: Performance Test Generation\n');

  const generator = TestGeneratorFactory.create({
    sourceDir: './src',
    testDir: './tests/performance',
    framework: 'jest',
    testTypes: ['performance'],
  });

  const tests = await generator.generateTests();

  console.log(`Generated ${tests.length} performance tests`);
  console.log('Performance tests include:');
  console.log('- Execution time benchmarks');
  console.log('- Memory leak detection');
  console.log('- Throughput measurements\n');

  await generator.writeGeneratedTests(tests);
}

/**
 * Example 6: Security test generation
 */
async function securityTestGeneration() {
  console.log('Example 6: Security Test Generation\n');

  const generator = TestGeneratorFactory.create({
    sourceDir: './src',
    testDir: './tests/security',
    framework: 'jest',
    testTypes: ['security'],
  });

  const tests = await generator.generateTests();

  console.log(`Generated ${tests.length} security tests`);
  console.log('Security tests check for:');
  console.log('- XSS vulnerabilities');
  console.log('- SQL injection');
  console.log('- Authentication bypass');
  console.log('- Authorization issues\n');

  await generator.writeGeneratedTests(tests);
}

/**
 * Example 7: Test fixture generation
 */
async function fixtureGeneration() {
  console.log('Example 7: Test Fixture Generation\n');

  const generator = TestGeneratorFactory.create({
    sourceDir: './src',
    testDir: './tests',
    framework: 'jest',
    testTypes: ['unit'],
  });

  // Generate tests first to analyze functions
  const tests = await generator.generateTests();

  console.log('Sample test fixtures:');
  tests.forEach(test => {
    if (test.mocks.length > 0) {
      console.log(`\nTest: ${test.filePath}`);
      test.mocks.forEach(mock => {
        console.log(`  Mock: ${mock.name}`);
        console.log(`  Type: ${mock.type}`);
        console.log(`  Implementation: ${mock.implementation.substring(0, 50)}...`);
      });
    }
  });
}

/**
 * Example 8: Multi-framework support
 */
async function multiFrameworkSupport() {
  console.log('Example 8: Multi-Framework Support\n');

  const frameworks = ['jest', 'mocha', 'vitest'] as const;

  for (const framework of frameworks) {
    console.log(`Generating tests for ${framework}...`);

    const generator = TestGeneratorFactory.create({
      sourceDir: './src',
      testDir: `./tests/${framework}`,
      framework,
      testTypes: ['unit'],
    });

    const tests = await generator.generateTests();
    console.log(`  Generated ${tests.length} tests`);
  }

  console.log('\nAll framework tests generated\n');
}

/**
 * Example 9: Incremental test generation
 */
async function incrementalTestGeneration() {
  console.log('Example 9: Incremental Test Generation\n');

  const generator = TestGeneratorFactory.create({
    sourceDir: './src',
    testDir: './tests',
    framework: 'jest',
    testTypes: ['unit'],
  });

  // Detect what needs testing
  const gaps = await generator.detectCoverageGaps();
  console.log(`Found ${gaps.length} files needing tests`);

  // Generate only for gap files
  const tests = await generator.generateTests();
  const newTests = tests.filter(test =>
    gaps.some(gap => test.filePath.includes(gap.file))
  );

  console.log(`Generated ${newTests.length} new tests for uncovered files`);
  await generator.writeGeneratedTests(newTests);
  console.log('Incremental tests written\n');
}

/**
 * Example 10: Complete CI/CD integration
 */
async function cicdIntegration() {
  console.log('Example 10: CI/CD Integration\n');

  const generator = TestGeneratorFactory.create({
    sourceDir: './src',
    testDir: './tests',
    framework: 'jest',
    testTypes: ['unit', 'integration', 'security'],
    coverageThreshold: 90,
  });

  console.log('Step 1: Detecting coverage gaps...');
  const gaps = await generator.detectCoverageGaps();

  if (gaps.length > 0) {
    console.log(`Found ${gaps.length} gaps - generating tests...`);

    console.log('Step 2: Generating comprehensive tests...');
    const tests = await generator.generateTests();

    console.log('Step 3: Writing tests to repository...');
    await generator.writeGeneratedTests(tests);

    console.log('Step 4: Test summary:');
    const summary = tests.reduce((acc, test) => {
      acc[test.testType] = (acc[test.testType] || 0) + 1;
      acc.totalCoverage = (acc.totalCoverage || 0) + test.coverageIncrease;
      return acc;
    }, {} as Record<string, number>);

    console.log(JSON.stringify(summary, null, 2));
    console.log('\nReady for CI/CD pipeline execution');
  } else {
    console.log('No coverage gaps found - all files have tests');
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  const examples = [
    basicTestGeneration,
    comprehensiveTestGeneration,
    detectCoverageGaps,
    customConfiguration,
    performanceTestGeneration,
    securityTestGeneration,
    fixtureGeneration,
    multiFrameworkSupport,
    incrementalTestGeneration,
    cicdIntegration,
  ];

  for (const example of examples) {
    try {
      await example();
    } catch (error) {
      console.error(`Error in ${example.name}:`, error);
    }
    console.log('='.repeat(80) + '\n');
  }
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicTestGeneration,
  comprehensiveTestGeneration,
  detectCoverageGaps,
  customConfiguration,
  performanceTestGeneration,
  securityTestGeneration,
  fixtureGeneration,
  multiFrameworkSupport,
  incrementalTestGeneration,
  cicdIntegration,
};
