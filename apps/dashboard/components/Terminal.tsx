import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TerminalLine, Fix } from '../types';
import { storage } from '../services/storageService';
import { 
  analyzeErrorAndFindFix, 
  generateFixFromInput, 
  searchWebForFix, 
  explainCodeSnippet,
  reviewCodeDiff 
} from '../services/geminiService';
import { shellService } from '../services/shellService';
import { FixView } from './FixView';
import { AnsiRenderer } from './AnsiRenderer';
import { APP_VERSION } from '../constants';

export const Terminal: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [cwd, setCwd] = useState('~/projects/dev-brain');
  
  const [wizardMode, setWizardMode] = useState<'NONE' | 'LOG' | 'EXPLAIN'>('NONE');
  const [logStep, setLogStep] = useState<number>(0);
  const [pendingLog, setPendingLog] = useState<{ error?: string; fix?: string }>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLine = useCallback((type: TerminalLine['type'], content: string | React.ReactNode) => {
    setLines(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type, content }]);
  }, []);

  useEffect(() => {
    addLine('info', `DEVBRAIN_KERNEL::PTY_SESSION_V5_STABLE`);
    addLine('info', `PTY_EMULATOR: ON // NEURAL_INTERCEPT: ACTIVE`);
    addLine('info', `TIP: RUN 'watch' TO SEE AUTO-RECALL IN ACTION.`);
  }, [addLine]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const handleCommand = async (cmdStr: string) => {
    if (wizardMode !== 'NONE') {
      handleWizards(cmdStr);
      return;
    }

    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'stop') {
      stopCurrentProcess();
      return;
    }

    addLine('command', trimmed);
    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (['help', 'log', 'explain', 'search', 'review', 'stats', 'clear', 'dev', 'watch'].includes(command)) {
      handleSystemCommand(command, args);
      return;
    }

    await executeInShell(trimmed);
  };

  const stopCurrentProcess = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsWatching(false);
      setIsMonitoring(false);
      setIsProcessing(false);
      addLine('warning', 'SIGNAL_INTERRUPT: PROCESS_TERMINATED');
    }
  };

  const executeInShell = async (cmd: string) => {
    setIsProcessing(true);
    setIsMonitoring(true);
    
    abortControllerRef.current = new AbortController();
    let fullOutput = "";
    
    await shellService.execute(cmd, (chunk) => {
      fullOutput += chunk;
    }, abortControllerRef.current.signal);

    processOutput(fullOutput);

    if (!isWatching) {
      setIsMonitoring(false);
      setIsProcessing(false);
    }
  };

  const processOutput = async (output: string) => {
    addLine('output', <AnsiRenderer text={output} />);

    const errorPatterns = [/error/i, /exception/i, /failed/i, /fatal/i, /stack trace/i, /undefined/i];
    if (errorPatterns.some(p => p.test(output))) {
      addLine('warning', 'INTERCEPTOR::ANOMALY_FOUND_IN_STREAM');
      const match = await analyzeErrorAndFindFix(output, storage.getFixes());
      if (match.bestMatch) {
        addLine('success', `NEURAL_RECALL_MATCH: ${match.confidence}% CONFIDENCE`);
        addLine('component', <FixView fix={match.bestMatch} confidence={match.confidence} />);
      } else {
        addLine('info', 'RECALL_MISS. RECOMMENDATION: RUN "search" OR "log" TO TRAIN KERNEL.');
      }
    }
  };

  const triggerSimulatedEvent = (type: 'change' | 'error') => {
    if (type === 'change') {
      addLine('info', 'FS_EVENT: src/components/Auth.tsx CHANGED');
      addLine('output', 'Re-building bundle...');
      setTimeout(() => addLine('success', 'Build successful. (142ms)'), 800);
    } else {
      addLine('info', 'FS_EVENT: src/api/client.ts CHANGED');
      addLine('output', 'Re-building bundle...');
      setTimeout(() => {
        const error = `TypeError: Cannot read property 'map' of undefined\n    at Dashboard.tsx:42\n    at fetchPositions (api.ts:12)`;
        processOutput(error);
      }, 1000);
    }
  };

  const handleSystemCommand = async (command: string, args: string[]) => {
    switch (command) {
      case 'help':
        addLine('output', 'KERNEL_SYSCALL_SET:');
        addLine('output', '  watch      - START PERSISTENT FS MONITOR');
        addLine('output', '  review     - NEURAL SMELL SCAN ON DIFFS');
        addLine('output', '  explain    - DECONSTRUCT CODE INTO MODELS');
        addLine('output', '  search <Q> - PROBE GLOBAL_RECALL (WEB)');
        addLine('output', '  log        - MANUALLY COMMIT WISDOM BLOCK');
        addLine('output', '  clear      - WIPE TTY_BUFFER');
        addLine('output', '  stop       - SEND SIGKILL TO ACTIVE PROC');
        break;

      case 'watch':
        setIsWatching(true);
        addLine('info', 'DAEMON_INIT: Monitoring filesystem...');
        await executeInShell(`watch npm run dev`);
        break;

      case 'dev':
        addLine('info', 'JOB_INIT: npm run dev');
        await executeInShell('npm run dev');
        break;

      case 'review':
        setIsProcessing(true);
        const findings = await reviewCodeDiff(`diff --git a/src/App.tsx b/src/App.tsx\n+ useEffect(() => { fetch('api') }, [])`);
        if (findings.length > 0) {
          addLine('warning', 'NEURAL_REVIEW: SMELLS_DETECTED');
          findings.forEach(f => {
            addLine('output', `\u001b[31m[!] ${f.name}\u001b[0m`);
            storage.saveAntiPattern({
              id: `ap-${Math.random().toString(36).substr(2, 5)}`,
              patternName: f.name,
              symptoms: f.symptoms,
              betterApproach: f.remedy,
              projectsAffected: ['auto-review'],
              createdAt: Date.now()
            });
          });
        }
        setIsProcessing(false);
        break;

      case 'explain':
        setWizardMode('EXPLAIN');
        addLine('input-prompt', 'INPUT_SNIPPET:');
        break;

      case 'search':
        const q = args.join(' ');
        if (!q) return addLine('error', 'ERR::NULL_QUERY');
        setIsProcessing(true);
        const webResults = await searchWebForFix(q);
        webResults.forEach(f => addLine('component', <FixView fix={f} />));
        setIsProcessing(false);
        break;

      case 'log':
        setWizardMode('LOG');
        setLogStep(1);
        addLine('input-prompt', 'PASTE_ERROR_LOG:');
        break;

      case 'clear':
        setLines([]);
        break;
      
      case 'stats':
        const stats = storage.getStats();
        addLine('success', `WISDOM_DENSITY: ${stats.totalFixes} // RECOVERY: ${stats.timeSavedHours}H`);
        break;
    }
  };

  const handleWizards = async (input: string) => {
    addLine('command', input);
    if (wizardMode === 'LOG') {
      if (logStep === 1) {
        setPendingLog({ ...pendingLog, error: input });
        addLine('output', 'PASTE_SOLUTION:');
        setLogStep(2);
      } else {
        setIsProcessing(true);
        const enriched = await generateFixFromInput(pendingLog.error || '', input);
        storage.saveFix({
          id: Math.random().toString(36).substr(2, 5),
          projectName: 'Manual',
          errorMessage: pendingLog.error || '',
          rootCause: enriched.rootCause || 'Logged manually',
          mentalModel: enriched.mentalModel || 'Insight shared',
          fixDescription: enriched.fixDescription || input,
          beforeCodeSnippet: 'N/A',
          afterCodeSnippet: input,
          filePaths: [],
          tags: enriched.tags || ['manual'],
          frameworkContext: enriched.frameworkContext || 'generic',
          createdAt: Date.now(),
          timeSavedMinutes: 15,
          usageCount: 1,
          successCount: 1
        });
        addLine('success', 'WISDOM_BLOCK_STAGED.');
        setWizardMode('NONE');
        setIsProcessing(false);
      }
    } else if (wizardMode === 'EXPLAIN') {
      setIsProcessing(true);
      const analysis = await explainCodeSnippet(input);
      addLine('output', <AnsiRenderer text={`\u001b[36mMODEL_IDENTIFIED:\u001b[0m ${analysis.mentalModel}`} />);
      addLine('output', analysis.explanation);
      setWizardMode('NONE');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14] border border-[#30363d] overflow-hidden relative">
      <div className="bg-[#1f2937] px-3 py-1 flex justify-between items-center border-b border-[#30363d] z-10">
        <div className="flex gap-4 items-center">
          <span className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">DEVBRAIN_PTY</span>
          <div className="flex gap-1.5 items-center">
             <div className={`w-1.5 h-1.5 ${isMonitoring || isWatching ? 'bg-red-500 animate-pulse' : 'bg-green-500'} shadow-[0_0_8px_currentColor]`}></div>
             <span className="text-[8px] text-gray-500 font-bold uppercase">
               {isWatching ? 'KERNEL_WATCH_ACTIVE' : (isMonitoring ? 'PROBING' : 'IDLE')}
             </span>
          </div>
        </div>
        <div className="flex gap-4">
           {isWatching && (
             <div className="flex gap-2">
                <button 
                  onClick={() => triggerSimulatedEvent('change')}
                  className="text-[9px] text-blue-400 hover:text-white border border-blue-400/30 px-2 font-bold uppercase"
                >
                  [SIM_SAVE]
                </button>
                <button 
                  onClick={() => triggerSimulatedEvent('error')}
                  className="text-[9px] text-red-400 hover:text-white border border-red-400/30 px-2 font-bold uppercase"
                >
                  [SIM_ERROR]
                </button>
                <button onClick={stopCurrentProcess} className="text-[9px] text-gray-400 hover:text-red-500 font-black uppercase">
                  [KILL]
                </button>
             </div>
           )}
           <div className="text-[9px] text-gray-500 font-bold uppercase italic">
              {cwd}
           </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto terminal-scroll font-mono text-sm" ref={scrollRef}>
        {lines.map(line => (
          <div key={line.id} className="mb-1 leading-snug">
            {line.type === 'command' && <span className="text-blue-500 mr-2 font-bold">dev@brain$</span>}
            <span className={
              line.type === 'error' ? 'text-red-500' : 
              line.type === 'success' ? 'text-green-500' :
              line.type === 'warning' ? 'text-yellow-500 font-bold' :
              line.type === 'info' ? 'text-blue-400 font-medium' :
              line.type === 'input-prompt' ? 'text-purple-400 font-black' :
              'text-gray-300'
            }>
              {line.content}
            </span>
          </div>
        ))}
        {isProcessing && (
          <div className="text-blue-500 text-[10px] mt-2 flex gap-2">
             <span className="animate-pulse">[{isWatching ? 'LISTENING' : 'NEURAL_OPS'}]</span>
             <span>BUFFER_STREAM_IN_PROGRESS...</span>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) { handleCommand(inputValue); setInputValue(''); }}} className="flex items-center mt-2 border-t border-white/5 pt-2">
          <span className="text-blue-500 mr-2 font-bold">dev@brain$</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white font-medium"
            placeholder={isWatching ? "Watching... (Use SIM buttons above)" : ""}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isProcessing && !isWatching}
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};