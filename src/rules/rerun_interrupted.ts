export const match = (
  command: { script: string },
  stdout: string,
  stderr: string,
  code: number
): boolean => {
  // Exit code 130 corresponds to script termination by Ctrl+C.
  return code === 130;
};

export const get_new_command = (command: { script: string }): string => {
  return command.script;
};
