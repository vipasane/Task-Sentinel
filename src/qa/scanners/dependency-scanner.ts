/**
 * Dependency Vulnerability Scanner
 * Integrates with npm audit and vulnerability databases
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { DependencyVulnerability, VulnerabilitySeverity } from '../types';

export interface NpmAuditResult {
  auditReportVersion: number;
  vulnerabilities: Record<string, NpmVulnerability>;
  metadata: {
    vulnerabilities: {
      critical: number;
      high: number;
      moderate: number;
      low: number;
      info: number;
    };
  };
}

export interface NpmVulnerability {
  name: string;
  severity: string;
  via: Array<{
    source?: string;
    title: string;
    url: string;
    severity: string;
    cwe?: string[];
    cvss?: {
      score: number;
      vectorString: string;
    };
    range: string;
  }>;
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

export class DependencyScanner {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run npm audit and parse vulnerabilities
   */
  async scan(): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      // Check if package.json exists
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        console.warn('No package.json found, skipping dependency scan');
        return vulnerabilities;
      }

      // Run npm audit
      const auditResult = await this.runNpmAudit();

      // Parse npm audit results
      for (const [packageName, vuln] of Object.entries(auditResult.vulnerabilities)) {
        vulnerabilities.push(...this.parseNpmVulnerability(packageName, vuln));
      }

      // Check for outdated packages
      const outdatedVulns = await this.checkOutdatedPackages();
      vulnerabilities.push(...outdatedVulns);

      // Check license compliance
      const licenseVulns = await this.checkLicenseCompliance();
      vulnerabilities.push(...licenseVulns);

    } catch (error) {
      console.error('Dependency scan error:', error);
    }

    return vulnerabilities;
  }

  /**
   * Run npm audit command
   */
  private async runNpmAudit(): Promise<NpmAuditResult> {
    try {
      const output = execSync('npm audit --json', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return JSON.parse(output);
    } catch (error: any) {
      // npm audit exits with non-zero if vulnerabilities found
      if (error.stdout) {
        return JSON.parse(error.stdout);
      }
      throw error;
    }
  }

  /**
   * Parse npm vulnerability into standard format
   */
  private parseNpmVulnerability(
    packageName: string,
    vuln: NpmVulnerability
  ): DependencyVulnerability[] {
    const vulnerabilities: DependencyVulnerability[] = [];

    for (const via of vuln.via) {
      if (typeof via === 'string') continue;

      const id = `DEP-${packageName}-${via.title.replace(/\s+/g, '-').substring(0, 20)}`;
      const severity = this.mapNpmSeverity(via.severity);

      const fixVersion = typeof vuln.fixAvailable === 'object'
        ? vuln.fixAvailable.version
        : undefined;

      vulnerabilities.push({
        id,
        severity,
        category: 'dependency',
        title: via.title,
        description: `Vulnerability in ${packageName}: ${via.title}`,
        location: {
          file: 'package.json',
        },
        cve: via.source,
        cwe: via.cwe?.join(', '),
        cvss_score: via.cvss?.score,
        cvss_vector: via.cvss?.vectorString,
        remediation: {
          suggestion: fixVersion
            ? `Update ${packageName} to version ${fixVersion}`
            : `Update ${packageName} to latest secure version`,
          auto_fixable: vuln.fixAvailable !== false,
          fix_command: vuln.fixAvailable
            ? `npm update ${packageName}`
            : undefined,
          references: via.url ? [via.url] : [],
        },
        detected_at: new Date(),
        package_name: packageName,
        installed_version: vuln.range,
        fixed_version: fixVersion,
        dependency_path: vuln.nodes,
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for outdated packages
   */
  private async checkOutdatedPackages(): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      const output = execSync('npm outdated --json', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const outdated = JSON.parse(output || '{}');

      for (const [packageName, info] of Object.entries(outdated as Record<string, any>)) {
        const majorVersionBehind = parseInt(info.latest.split('.')[0]) - parseInt(info.current.split('.')[0]);

        if (majorVersionBehind >= 2) {
          vulnerabilities.push({
            id: `DEP-OUTDATED-${packageName}`,
            severity: 'medium',
            category: 'dependency',
            title: `Outdated dependency: ${packageName}`,
            description: `Package ${packageName} is ${majorVersionBehind} major versions behind`,
            location: { file: 'package.json' },
            remediation: {
              suggestion: `Update ${packageName} from ${info.current} to ${info.latest}`,
              auto_fixable: true,
              fix_command: `npm install ${packageName}@${info.latest}`,
            },
            detected_at: new Date(),
            package_name: packageName,
            installed_version: info.current,
            fixed_version: info.latest,
            dependency_path: [packageName],
          });
        }
      }
    } catch (error) {
      // npm outdated exits with code 1 if outdated packages found
    }

    return vulnerabilities;
  }

  /**
   * Check license compliance
   */
  private async checkLicenseCompliance(): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];
    const restrictedLicenses = ['GPL-3.0', 'AGPL-3.0', 'SSPL'];

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      for (const [packageName] of Object.entries(dependencies)) {
        try {
          const pkgPath = path.join(this.projectRoot, 'node_modules', packageName, 'package.json');
          if (fs.existsSync(pkgPath)) {
            const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const license = pkgJson.license || 'UNKNOWN';

            if (restrictedLicenses.some(restricted => license.includes(restricted))) {
              vulnerabilities.push({
                id: `DEP-LICENSE-${packageName}`,
                severity: 'low',
                category: 'dependency',
                title: `License compliance issue: ${packageName}`,
                description: `Package ${packageName} uses restricted license: ${license}`,
                location: { file: 'package.json' },
                remediation: {
                  suggestion: `Review license compatibility for ${packageName} (${license})`,
                  auto_fixable: false,
                  references: ['https://opensource.org/licenses'],
                },
                detected_at: new Date(),
                package_name: packageName,
                installed_version: dependencies[packageName],
                dependency_path: [packageName],
              });
            }
          }
        } catch (err) {
          // Skip packages that can't be read
        }
      }
    } catch (error) {
      console.error('License compliance check error:', error);
    }

    return vulnerabilities;
  }

  /**
   * Map npm severity to standard severity
   */
  private mapNpmSeverity(npmSeverity: string): VulnerabilitySeverity {
    switch (npmSeverity.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'moderate':
        return 'medium';
      case 'low':
      case 'info':
        return 'low';
      default:
        return 'medium';
    }
  }
}
