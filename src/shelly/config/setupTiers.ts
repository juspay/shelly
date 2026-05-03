/**
 * Setup Tier Configuration
 * Defines the three-tier system for repository scaffolding complexity.
 * File-level tier assignments live in utils/fileTiers.ts (single source of truth).
 * This file owns: directory lists and feature flags per tier.
 */

export type SetupTier = 'essential' | 'standard' | 'complete';

export interface TierConfig {
  directories: string[];
  includeMemoryBank: boolean;
  includeBreezeMcp: boolean;
  includeChangeset: boolean;
}

const ESSENTIAL_CONFIG: TierConfig = {
  directories: [
    'src',
    'tests',
    'test',
    'docs',
    'examples',
    '.github',
    '.github/ISSUE_TEMPLATE',
    '.github/workflows',
    '.husky',
  ],
  includeMemoryBank: false,
  includeBreezeMcp: false,
  includeChangeset: false,
};

const STANDARD_CONFIG: TierConfig = {
  directories: [
    ...ESSENTIAL_CONFIG.directories,
    'config',
    'scripts',
    'tools',
    'todos',
    '.husky',
    'scripts/git-hooks',
    '.github/ISSUE_TEMPLATE',
    '.github/workflows',
    'src/commands',
    'src/providers',
    'src/services',
    'tools/automation',
    'tools/testing',
    'tools/development',
    'tools/content',
  ],
  includeMemoryBank: false,
  includeBreezeMcp: false,
  includeChangeset: false,
};

const COMPLETE_CONFIG: TierConfig = {
  directories: [
    ...STANDARD_CONFIG.directories,
    '.ai/workflows',
    '.claude/commands',
    'memory-bank',
    'memory-bank/project',
    'memory-bank/technical',
    'memory-bank/current',
    '.changeset',
    'tools/automation',
    'tools/testing',
    'tools/development',
    'tools/content',
  ],
  includeMemoryBank: true,
  includeBreezeMcp: true,
  includeChangeset: true,
};

export const SETUP_TIERS: Record<SetupTier, TierConfig> = {
  essential: ESSENTIAL_CONFIG,
  standard: STANDARD_CONFIG,
  complete: COMPLETE_CONFIG,
};

export function getTierConfig(tier: SetupTier): TierConfig {
  return SETUP_TIERS[tier];
}

export function isValidTier(value: string): value is SetupTier {
  return ['essential', 'standard', 'complete'].includes(value);
}

export function getTierDisplayName(tier: SetupTier): string {
  const names: Record<SetupTier, string> = {
    essential: 'Essential',
    standard: 'Standard',
    complete: 'Complete',
  };
  return names[tier];
}

export function getTierDescription(tier: SetupTier): string {
  const descriptions: Record<SetupTier, string> = {
    essential:
      '📦 Essential - Basic setup (~20 files) - Quick start, small projects',
    standard:
      '🚀 Standard - Production-ready (~50 files) - Team projects, best practices',
    complete:
      '💎 Complete - Enterprise + AI (~100+ files) - Full features, AI integration',
  };
  return descriptions[tier];
}

export function getTierFileCount(tier: SetupTier): string {
  const counts: Record<SetupTier, string> = {
    essential: '~20',
    standard: '~50',
    complete: '~100+',
  };
  return counts[tier];
}
