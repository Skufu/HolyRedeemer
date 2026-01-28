// Wraps expectations so failures read as explicit gap findings.
export async function gapCheck(description: string, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gap: ${description}\n${message}`);
  }
}
