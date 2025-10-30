/**
 * QA Configuration
 * Centralized configuration for QA system
 */

import { QAConfig } from './types';

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

/**
 * Strict QA configuration (for production)
 */
export const strictQAConfig: QAConfig = {
  ...defaultQAConfig,
  qualityGates: {
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
    },
    performance: {
      p95ResponseTime: 150,
      p99ResponseTime: 300,
      throughput: 200,
      memoryUsage: 256
    },
    codeQuality: {
      overallScore: 85,
      maintainability: 75,
      complexity: 10
    },
    documentation: {
      apiDocumentation: true,
      readmeComplete: true,
      inlineComments: 30
    }
  }
};

/**
 * Lenient QA configuration (for development)
 */
export const lenientQAConfig: QAConfig = {
  ...defaultQAConfig,
  qualityGates: {
    coverage: {
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70
    },
    security: {
      criticalVulnerabilities: 0,
      highVulnerabilities: 5,
      mediumVulnerabilities: 10
    },
    performance: {
      p95ResponseTime: 300,
      p99ResponseTime: 1000,
      throughput: 50,
      memoryUsage: 1024
    },
    codeQuality: {
      overallScore: 70,
      maintainability: 60,
      complexity: 20
    },
    documentation: {
      apiDocumentation: false,
      readmeComplete: false,
      inlineComments: 10
    }
  }
};
