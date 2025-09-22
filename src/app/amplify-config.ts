import { Amplify } from 'aws-amplify';

// The amplify_outputs.json file is generated during the build process
// For local development, we'll conditionally import it
let outputs = { version: "1" };

try {
  outputs = require('@/amplify_outputs.json');
} catch (error) {
  console.log('Amplify outputs not found, using default configuration');
}

Amplify.configure(outputs);

export default Amplify;