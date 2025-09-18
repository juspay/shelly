import { initialize } from './src/app/app.js';

console.log("Starting deep nested test...");
// This will trigger the error deep within the file structure.
initialize();
