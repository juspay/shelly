function generateError() {
  // This function will cause a ReferenceError.
  console.log("Generating a deep error...");
  let undefinedVariable;
  return undefinedVariable.someProperty;
}

export { generateError };
