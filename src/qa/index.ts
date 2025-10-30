/**
 * QA System Entry Point
 * Exports all QA components and utilities
 */

export { QAManager, defaultQAConfig } from './qa-manager';
export { TestGenerator } from './generators/test-generator';
export { SecurityScanner } from './scanners/security-scanner';
export { CodeQualityAnalyzer } from './scanners/code-quality-analyzer';
export { PerformanceBenchmark } from './benchmarks/performance-benchmark';
export { EvidenceCollector } from './reporters/evidence-collector';

export * from './types';
