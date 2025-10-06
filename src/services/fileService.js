import fs from 'fs';

function getCodeSnippet(filePath, lineNumber, context = 5) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8').split('\n');
    const start = Math.max(0, lineNumber - context - 1);
    const end = Math.min(fileContent.length, lineNumber + context);
    const snippet = fileContent
      .slice(start, end)
      .map((line, index) => {
        const currentLine = start + index + 1;
        const isErrorLine = currentLine === lineNumber;
        return `${isErrorLine ? '>' : ' '} ${currentLine.toString().padStart(4)}: ${line}`;
      })
      .join('\n');
    return `\n--- Code from ${filePath}:${lineNumber} ---\n${snippet}\n--------------------------------------\n`;
  } catch (e) {
    return null; // Could not read or parse the file
  }
}

export function extractCodeFromStacktrace(error) {
  const stacktraceRegex = /(?:at\s|file:\/\/)?([\/].*?):(\d+):(\d+)/g;
  let match;
  while ((match = stacktraceRegex.exec(error)) !== null) {
    const [_, filePath, lineNumberStr] = match;
    const lineNumber = parseInt(lineNumberStr, 10);
    // Ignore files from node_modules
    if (filePath.includes('node_modules')) {
      continue;
    }
    const snippet = getCodeSnippet(filePath, lineNumber);
    if (snippet) {
      return snippet; // Return the first valid snippet found
    }
  }
  return null;
}
