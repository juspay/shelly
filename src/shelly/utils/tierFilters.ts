/**
 * Tier Filtering Utilities
 * File-level filtering is handled by fileTiers.ts (shouldIncludeFileByTier).
 * This file owns: directory inclusion and feature-flag checks.
 */

import { SetupTier, getTierConfig } from '../config/setupTiers.js';
import { shouldIncludeFileByTier } from './fileTiers.js';

export function shouldIncludeDirectory(
  dirname: string,
  tier: SetupTier
): boolean {
  return getTierConfig(tier).directories.includes(dirname);
}

export function shouldIncludeMemoryBank(tier: SetupTier): boolean {
  return getTierConfig(tier).includeMemoryBank;
}

export function shouldIncludeBreezeMcp(tier: SetupTier): boolean {
  return getTierConfig(tier).includeBreezeMcp;
}

export function shouldIncludeChangeset(tier: SetupTier): boolean {
  return getTierConfig(tier).includeChangeset;
}

// Generic file check — delegates to the single source of truth in fileTiers.ts
export function shouldIncludeFile(filename: string, tier: SetupTier): boolean {
  return shouldIncludeFileByTier(filename, tier);
}

export function getTierLevel(tier: SetupTier): number {
  const levels: Record<SetupTier, number> = {
    essential: 1,
    standard: 2,
    complete: 3,
  };
  return levels[tier];
}

export function meetsMinimumTier(
  currentTier: SetupTier,
  minimumTier: SetupTier
): boolean {
  return getTierLevel(currentTier) >= getTierLevel(minimumTier);
}
