export const match = (command, stdout, stderr, code) => {
  // Exit code 130 corresponds to script termination by Ctrl+C.
  return code === 130;
};

export const get_new_command = (command) => {
  return command.script;
};
