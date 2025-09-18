import { generateError } from './core/services/error-service.js';

function initialize() {
  console.log("Initializing app...");
  // This will propagate the error from the service.
  generateError();
}

export { initialize };
