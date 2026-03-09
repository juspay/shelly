// bitbucketSetup.ts: CLI command to automate BitBucket repo setup for Juspay projects
import {
  BitbucketService,
  BitbucketRepoConfig,
} from '../services/bitbucketService.js';

export class BitbucketSetupCommand {
  config: BitbucketRepoConfig;

  constructor(config: BitbucketRepoConfig) {
    this.config = config;
  }

  async execute() {
    console.log('🚀 BitBucket Repository Setup');
    console.log('============================\n');

    const bitbucketService = new BitbucketService(this.config);

    // Example: Apply standard settings
    await bitbucketService.applyStandardSettings();
    console.log('✅ Applied standard BitBucket repo settings');

    // Example: Set branch permissions
    await bitbucketService.setBranchPermissions('main', {
      write: ['admin'],
      read: ['*'],
    });
    console.log('✅ Set branch permissions for main');

    // Example: Add webhook
    await bitbucketService.addWebhook('https://juspay.net/webhook', [
      'repo:push',
      'pullrequest:created',
    ]);
    console.log('✅ Added webhook');

    // ...add more automation steps as needed
  }
}
