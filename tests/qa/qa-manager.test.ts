/**
 * Unit tests for QA Manager
 * Tests comprehensive quality assurance orchestration
 */

import { QAManager, defaultQAConfig } from '../../src/qa';
import { QAOrchestrationOptions } from '../../src/qa/types';

describe('QAManager', () => {
  let qaManager: QAManager;

  beforeEach(() => {
    qaManager = new QAManager(defaultQAConfig);
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(qaManager).toBeDefined();
      expect(qaManager.getConfig()).toEqual(defaultQAConfig);
    });

    it('should allow config updates', () => {
      const newConfig = {
        ...defaultQAConfig,
        qualityGates: {
          ...defaultQAConfig.qualityGates,
          coverage: {
            lines: 90,
            functions: 90,
            branches: 85,
            statements: 90
          }
        }
      };

      qaManager.updateConfig(newConfig);
      expect(qaManager.getConfig().qualityGates.coverage.lines).toBe(90);
    });
  });

  describe('runQA', () => {
    it('should run full QA suite', async () => {
      const options: QAOrchestrationOptions = {
        runTests: true,
        runSecurity: true,
        runPerformance: true,
        runQualityChecks: true,
        generateEvidence: true,
        linkToGitHub: false
      };

      const result = await qaManager.runQA(options);

      expect(result).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.passed).toBe('boolean');
      expect(Array.isArray(result.qualityGatesPassed)).toBe(true);
    });

    it('should run tests only', async () => {
      const options: QAOrchestrationOptions = {
        runTests: true,
        runSecurity: false,
        runPerformance: false,
        runQualityChecks: false,
        generateEvidence: false,
        linkToGitHub: false
      };

      const result = await qaManager.runQA(options);

      expect(result.tests).toBeDefined();
      expect(result.security).toBeUndefined();
      expect(result.performance).toBeUndefined();
      expect(result.codeQuality).toBeUndefined();
    });

    it('should run security scan only', async () => {
      const options: QAOrchestrationOptions = {
        runTests: false,
        runSecurity: true,
        runPerformance: false,
        runQualityChecks: false,
        generateEvidence: false,
        linkToGitHub: false
      };

      const result = await qaManager.runQA(options);

      expect(result.security).toBeDefined();
      expect(result.tests).toBeUndefined();
      expect(result.performance).toBeUndefined();
      expect(result.codeQuality).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      const options: QAOrchestrationOptions = {
        runTests: true,
        runSecurity: true,
        runPerformance: true,
        runQualityChecks: true,
        generateEvidence: false,
        linkToGitHub: false
      };

      // Mock test failure
      jest.spyOn(qaManager as any, 'runTests').mockRejectedValue(new Error('Test failed'));

      await expect(qaManager.runQA(options)).rejects.toThrow('Test failed');
    });
  });

  describe('quality gates', () => {
    it('should evaluate coverage gates', () => {
      const testResults = {
        total: 100,
        passed: 95,
        failed: 5,
        skipped: 0,
        duration: 1000,
        coverage: {
          lines: { total: 1000, covered: 900, pct: 90 },
          functions: { total: 100, covered: 90, pct: 90 },
          branches: { total: 200, covered: 180, pct: 90 },
          statements: { total: 1000, covered: 900, pct: 90 }
        },
        suites: []
      };

      const gates = (qaManager as any).evaluateQualityGates(testResults);

      const coverageGate = gates.find((g: any) => g.gate === 'Line Coverage');
      expect(coverageGate).toBeDefined();
      expect(coverageGate.passed).toBe(true);
      expect(coverageGate.actual).toBe(90);
    });

    it('should evaluate security gates', () => {
      const securityResults = {
        timestamp: new Date(),
        vulnerabilities: [],
        summary: {
          critical: 0,
          high: 1,
          medium: 3,
          low: 5,
          info: 10
        },
        passed: true,
        scans: []
      };

      const gates = (qaManager as any).evaluateQualityGates(
        undefined,
        securityResults
      );

      const criticalGate = gates.find((g: any) => g.gate === 'Critical Vulnerabilities');
      expect(criticalGate).toBeDefined();
      expect(criticalGate.passed).toBe(true);
      expect(criticalGate.actual).toBe(0);
    });

    it('should fail when thresholds not met', () => {
      const testResults = {
        total: 100,
        passed: 70,
        failed: 30,
        skipped: 0,
        duration: 1000,
        coverage: {
          lines: { total: 1000, covered: 700, pct: 70 },
          functions: { total: 100, covered: 70, pct: 70 },
          branches: { total: 200, covered: 140, pct: 70 },
          statements: { total: 1000, covered: 700, pct: 70 }
        },
        suites: []
      };

      const gates = (qaManager as any).evaluateQualityGates(testResults);

      const coverageGate = gates.find((g: any) => g.gate === 'Line Coverage');
      expect(coverageGate.passed).toBe(false);
      expect(coverageGate.actual).toBe(70);
      expect(coverageGate.threshold).toBe(85);
    });
  });

  describe('evidence collection', () => {
    it('should generate evidence artifacts', async () => {
      const options: QAOrchestrationOptions = {
        runTests: true,
        runSecurity: true,
        runPerformance: true,
        runQualityChecks: true,
        generateEvidence: true,
        linkToGitHub: false
      };

      const result = await qaManager.runQA(options);

      expect(result.evidence).toBeDefined();
      expect(Array.isArray(result.evidence.testReports)).toBe(true);
      expect(Array.isArray(result.evidence.securityReports)).toBe(true);
      expect(Array.isArray(result.evidence.performanceReports)).toBe(true);
      expect(Array.isArray(result.evidence.qualityReports)).toBe(true);
    });

    it('should skip evidence when not requested', async () => {
      const options: QAOrchestrationOptions = {
        runTests: true,
        runSecurity: false,
        runPerformance: false,
        runQualityChecks: false,
        generateEvidence: false,
        linkToGitHub: false
      };

      const result = await qaManager.runQA(options);

      expect(result.evidence).toBeUndefined();
    });
  });

  describe('GitHub integration', () => {
    it('should link evidence to GitHub issue', async () => {
      const options: QAOrchestrationOptions = {
        runTests: true,
        runSecurity: true,
        runPerformance: true,
        runQualityChecks: true,
        generateEvidence: true,
        linkToGitHub: true,
        issueNumber: 123
      };

      // Mock GitHub CLI
      jest.spyOn(require('child_process'), 'execSync').mockImplementation(() => '');

      const result = await qaManager.runQA(options);

      expect(result.evidence).toBeDefined();
      // Verify GitHub CLI was called
      expect(require('child_process').execSync).toHaveBeenCalled();
    });

    it('should handle GitHub linking failure gracefully', async () => {
      const options: QAOrchestrationOptions = {
        runTests: true,
        runSecurity: false,
        runPerformance: false,
        runQualityChecks: false,
        generateEvidence: true,
        linkToGitHub: true,
        issueNumber: 123
      };

      // Mock GitHub CLI failure
      jest.spyOn(require('child_process'), 'execSync')
        .mockImplementation(() => { throw new Error('GitHub CLI failed'); });

      // Should not throw, just warn
      const result = await qaManager.runQA(options);
      expect(result).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should complete QA in reasonable time', async () => {
      const options: QAOrchestrationOptions = {
        runTests: true,
        runSecurity: true,
        runPerformance: true,
        runQualityChecks: true,
        generateEvidence: true,
        linkToGitHub: false
      };

      const start = Date.now();
      await qaManager.runQA(options);
      const duration = Date.now() - start;

      // Should complete within 5 minutes
      expect(duration).toBeLessThan(5 * 60 * 1000);
    });
  });
});
