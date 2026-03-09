// packages.ts: CLI command to auto-detect and inject Juspay dependencies
import { PackageDetector } from '../services/packageDetector.js';
import path from 'path';

export class PackagesCommand {
  packageJsonPath: string;

  constructor(packageJsonPath: string = path.resolve('package.json')) {
    this.packageJsonPath = packageJsonPath;
  }

  async execute() {
    console.log('🚀 Juspay Package Detection & Injection');
    console.log('============================\n');

    const result = await PackageDetector.detectAndInject(this.packageJsonPath);
    if (result.dependencies.length > 0) {
      console.log('Missing dependencies:', result.dependencies);
      // TODO: Inject dependencies into package.json
    } else {
      console.log('All standard dependencies present.');
    }
    if (result.devDependencies.length > 0) {
      console.log('Missing devDependencies:', result.devDependencies);
      // TODO: Inject devDependencies into package.json
    } else {
      console.log('All standard devDependencies present.');
    }
    // TODO: Inject inline configs as needed
    console.log('Inline configs to inject:', Object.keys(result.inlineConfigs));
  }
}
