// jenkinsScaffold.ts: CLI command to scaffold Jenkinsfile for Juspay projects
import {
  JenkinsService,
  JenkinsfileParams,
} from '../services/jenkinsService.js';

export class JenkinsScaffoldCommand {
  params: JenkinsfileParams;

  constructor(params: JenkinsfileParams) {
    this.params = params;
  }

  async execute() {
    console.log('🚀 Jenkinsfile Scaffolding');
    console.log('============================\n');

    const jenkinsService = new JenkinsService(this.params);
    const filePath = 'Jenkinsfile';
    await jenkinsService.writeJenkinsfile(filePath);
    console.log(`✅ Jenkinsfile generated at ${filePath}`);
  }
}
