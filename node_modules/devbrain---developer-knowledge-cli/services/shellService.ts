import { GoogleGenAI } from "@google/genai";

/**
 * ARCHITECTURE NOTE:
 * In a real CLI environment (Node.js), the 'execute' function would use 
 * 'child_process.spawn' or 'node-pty' to run actual binaries.
 * In this web simulator, we use Gemini to generate terminal-like strings.
 */

export interface ShellState {
  cwd: string;
  history: string[];
}

let shellState: ShellState = {
  cwd: '~/projects/dev-brain',
  history: []
};

export const shellService = {
  getState: () => shellState,
  
  execute: async (command: string, onData: (chunk: string) => void, signal?: AbortSignal): Promise<void> => {
    // 1. Log command history
    shellState.history.push(command);
    
    // 2. [LOCAL DEV ONLY]: This is where you would call:
    // const proc = spawn(command, { shell: true });
    // proc.stdout.on('data', data => onData(data.toString()));
    
    // 3. [SIMULATOR LOGIC]:
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: `You are a Linux Bash Terminal Simulator.
        Command: ${command}
        Context: CWD=${shellState.cwd}
        
        Rules:
        - If 'watch', output "Watching for changes..." and occasional heartbeat lines.
        - Otherwise, output exactly what a standard terminal would show for this command.
        - Use standard terminal formatting.`,
      });

      for await (const chunk of response) {
        if (signal?.aborted) break;
        onData(chunk.text || "");
      }
    } catch (error) {
      if (!signal?.aborted) {
        onData("\u001b[31m[KERNEL ERROR] Link to neural processor severed.\u001b[0m");
      }
    }
  },

  updateCwd: (newCwd: string) => {
    shellState.cwd = newCwd;
  }
};