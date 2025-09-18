import { generateError } from './core/services/error-service.js';

function initialize() {
  console.log("Initializing app...");
  generateError();
}

export { initialize };
