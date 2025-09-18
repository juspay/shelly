function generateError() {
  console.log("Generating a deep error...");
  let undefinedVariable;
  return undefinedVariable.someProperty;
}

export { generateError };
