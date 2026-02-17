import React from 'react';

export const CliExport: React.FC = () => {
  const cliCode = `
import { GoogleGenAI, Type } from "@google/genai";
import chokidar from "chokidar";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// --- CONFIGURATION ---
const API_KEY = process.env.API_KEY;
const KNOWLEDGE_PATH = path.join(process.cwd(), ".devbrain", "wisdom.json");

if (!API_KEY) {
  console.error("Error: process.env.API_KEY is missing.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Ensure knowledge directory exists
if (!fs.existsSync(path.dirname(KNOWLEDGE_PATH))) {
  fs.mkdirSync(path.dirname(KNOWLEDGE_PATH), { recursive: true });
}

function loadKnowledge() {
  if (!fs.existsSync(KNOWLEDGE_PATH)) return [];
  return JSON.parse(fs.readFileSync(KNOWLEDGE_PATH, "utf8"));
}

function saveFix(fix) {
  const knowledge = loadKnowledge();
  knowledge.push({ ...fix, createdAt: Date.now() });
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(knowledge, null, 2));
}

// --- CORE LOGIC ---
async function analyzeError(errorText) {
  console.log("\\n[DevBrain] Analyzing anomaly...");
  const pastFixes = loadKnowledge();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: \`Analyze this error: "\${errorText}". Compare it against our knowledge base: \${JSON.stringify(pastFixes)}. If a match is found, provide the fix description and mental model.\`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchFound: { type: Type.BOOLEAN },
          fix: { type: Type.STRING },
          mentalModel: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["matchFound"]
      }
    }
  });

  const result = JSON.parse(response.text);
  if (result.matchFound && result.confidence > 50) {
    console.log("\\n\\u001b[32m[!] INSTANT RECALL SUCCESS (\${result.confidence}%)\\u001b[0m");
    console.log("\\u001b[36mMENTAL MODEL:\\u001b[0m", result.mentalModel);
    console.log("\\u001b[32mFIX:\\u001b[0m", result.fix);
  } else {
    console.log("\\n[DevBrain] No local match. Probing global knowledge...");
    // Logic for web search or log prompt...
  }
}

// --- RUNNER ---
const targetCommand = process.argv[2] || "npm run dev";
console.log(\`[DevBrain] Starting Monitored Session: \${targetCommand}\`);

const [cmd, ...args] = targetCommand.split(" ");
const proc = spawn(cmd, args, { shell: true, stdio: ["inherit", "pipe", "pipe"] });

proc.stdout.on("data", (data) => process.stdout.write(data));
proc.stderr.on("data", (data) => {
  const output = data.toString();
  process.stderr.write(output);
  if (output.toLowerCase().includes("error") || output.toLowerCase().includes("failed")) {
    analyzeError(output);
  }
});

chokidar.watch("src").on("change", (path) => {
  console.log(\`\\n[DevBrain] File changed: \${path}. Awaiting build result...\`);
});
  `.trim();

  return (
    <div className="p-8 font-mono">
      <div className="border-b-2 border-green-500 pb-2 mb-8 flex justify-between items-end">
        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">0x06_DEPLOY_LOCAL</h2>
        <span className="text-[10px] text-green-500 font-bold tracking-widest">READY_FOR_LOCAL_INGESTION</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] p-6 shadow-[6px_6px_0px_0px_#000]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-blue-500 uppercase">FILE: devbrain.mjs</span>
              <button 
                onClick={() => navigator.clipboard.writeText(cliCode)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 text-[10px] font-bold"
              >
                COPY_TO_CLIPBOARD
              </button>
            </div>
            <pre className="text-[11px] text-gray-400 bg-black/40 p-4 border border-[#30363d] overflow-x-auto">
              <code>{cliCode}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#1f2937]/30 border border-[#30363d] p-6">
            <h3 className="text-white font-black text-xs uppercase mb-4 tracking-widest border-l-4 border-blue-500 pl-3">SETUP_INSTRUCTIONS</h3>
            <ol className="text-xs space-y-4 text-gray-400">
              <li>
                <span className="text-blue-500 font-bold block mb-1">STEP_01</span>
                Create a folder: <code className="text-gray-200 bg-black px-1">mkdir .devbrain</code>
              </li>
              <li>
                <span className="text-blue-500 font-bold block mb-1">STEP_02</span>
                Install dependencies: <br/>
                <code className="text-gray-200 bg-black px-1 block mt-1">npm install @google/genai chokidar</code>
              </li>
              <li>
                <span className="text-blue-500 font-bold block mb-1">STEP_03</span>
                Export your API Key:<br/>
                <code className="text-gray-200 bg-black px-1 block mt-1">export API_KEY=your_gemini_key</code>
              </li>
              <li>
                <span className="text-blue-500 font-bold block mb-1">STEP_04</span>
                Run it with your build command:<br/>
                <code className="text-gray-200 bg-black px-1 block mt-1">node devbrain.mjs "npm start"</code>
              </li>
            </ol>
          </div>

          <div className="bg-red-900/10 border border-red-500/30 p-6">
             <h3 className="text-red-500 font-black text-xs uppercase mb-2">SYSTEM_REQUIREMENTS</h3>
             <ul className="text-[10px] text-gray-500 space-y-1 font-bold">
               <li>- NODE.JS {'>'}= 18.x</li>
               <li>- GEMINI_API_KEY (PRO_PROJECT)</li>
               <li>- POSIX_COMPLIANT_SHELL</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};