import inquirer from 'inquirer';
import { getCommandHistory } from './historyService.js';
import { analyzeError } from './analysisService.js';

export async function promptForManualError() {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'The command executed successfully. Do you still want to analyze an error?',
            default: false
        }
    ]);
    if (confirm) {
        const { error } = await inquirer.prompt([
            {
                type: 'input',
                name: 'error',
                message: 'Please paste the error message:'
            }
        ]);
        const history = getCommandHistory();
        // We don't have an exit code for manually entered errors, so we'll pass null.
        const analysis = await analyzeError(error, history, null);
        console.log('\n--- Neurolink Analysis ---');
        console.log(analysis);
        console.log('--------------------------\n');
    }
}
