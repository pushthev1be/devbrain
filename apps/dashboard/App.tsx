import React, { useState } from 'react';
import { Terminal } from './components/Terminal';
import { CliExport } from './components/CliExport';
import { AppState } from './types';
import { storage } from './services/storageService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppState>(AppState.TERMINAL);
  const [fixes, setFixes] = useState<any[]>([]);
  const [antiPatterns, setAntiPatterns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalFixes: 0, timeSavedHours: "0.0", topTags: [], accuracyRate: 0 });

  React.useEffect(() => {
    const loadData = async () => {
      const [fetchedFixes, fetchedAntiPatterns, fetchedStats] = await Promise.all([
        storage.getFixes(),
        storage.getAntiPatterns(),
        storage.getStats()
      ]);
      setFixes(fetchedFixes);
      setAntiPatterns(fetchedAntiPatterns);
      setStats(fetchedStats);
    };
    loadData();

    // Refresh every 5 seconds to show live updates from daemon
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0b0e14] flex flex-col p-2 font-mono text-gray-400 overflow-hidden">
      {/* Industrial Header */}
      <header className="flex flex-col md:flex-row justify-between items-stretch mb-2 gap-0 border border-[#30363d] bg-[#161b22] shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center bg-[#1f2937] px-6 py-3 border-r border-[#30363d]">
          <span className="text-xl font-black text-white italic tracking-tighter uppercase">DEVBRAIN//KRNL_V5</span>
          <div className="ml-6 flex gap-1">
            <div className="w-1 h-3 bg-blue-600 animate-[pulse_1s_infinite]"></div>
            <div className="w-1 h-3 bg-blue-600 animate-[pulse_1.2s_infinite]"></div>
            <div className="w-1 h-3 bg-blue-600 animate-[pulse_1.4s_infinite]"></div>
          </div>
        </div>

        <nav className="flex flex-1">
          {[
            { id: AppState.TERMINAL, label: '0x01_TTY' },
            { id: AppState.DATABASE, label: '0x02_BLOCKS' },
            { id: AppState.ANTI_PATTERNS, label: '0x03_GUARD' },
            { id: AppState.MASTERY, label: '0x04_LOG' },
            { id: AppState.INSIGHTS, label: '0x05_METRICS' },
            { id: AppState.CLI_EXPORT, label: '0x06_DEPLOY' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex-1 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-l border-[#30363d] first:border-l-0 ${activeView === tab.id
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-[#1f2937]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 flex flex-col min-h-0 border border-[#30363d] bg-[#0d1117] shadow-[4px_4px_0px_0px_#000]">
        <main className="flex-1 flex flex-col overflow-y-auto terminal-scroll">
          {activeView === AppState.TERMINAL && (
            <div className="flex-1 flex flex-col p-1 min-h-0">
              <div className="bg-[#1f2937]/20 border-b border-[#30363d] p-1 px-3 text-[9px] font-bold text-blue-500 uppercase flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 animate-ping"></span>
                  <span>NEURAL_RECALL_LISTENER: ACTIVE</span>
                </div>
                <span>BUFFER_ADDR: 0x7FFD2</span>
              </div>
              <Terminal />
            </div>
          )}

          {activeView === AppState.DATABASE && (
            <div className="p-6">
              <div className="border-b-2 border-blue-500 pb-2 mb-8 flex justify-between items-end">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">WISDOM_FS_INDEX</h2>
                <span className="text-[10px] text-blue-500 font-bold tracking-widest">{fixes.length} BLOCKS_MOUNTED</span>
              </div>
              <div className="grid gap-4">
                {fixes.map(fix => (
                  <div key={fix.id} className="border border-[#30363d] bg-[#161b22] p-6 hover:border-blue-500 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-blue-500 mb-1 tracking-widest">BLOCK_ADDR::{fix.id.toUpperCase()}</span>
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 leading-tight">{fix.errorMessage.split('\n')[0]}</h3>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs font-black text-green-500 bg-green-500/5 px-2 py-0.5 border border-green-500/20">{Math.round(((fix.successCount || 0) / (fix.usageCount || 1)) * 100)}% SUCCESS</span>
                        <div className="text-[9px] text-gray-500 mt-2 uppercase font-bold">DATE: {new Date(fix.createdAt).toISOString().split('T')[0]}</div>
                      </div>
                    </div>
                    <div className="bg-black/40 p-4 border border-[#30363d]/50">
                      <p className="text-xs text-gray-400 leading-relaxed mb-4 font-medium"><span className="text-gray-600 font-bold uppercase mr-2">MODEL:</span>{fix.mentalModel}</p>
                      <div className="flex flex-wrap gap-2">
                        {fix.tags.map(t => <span key={t} className="text-[9px] font-bold text-blue-400/60 border border-blue-400/20 px-2 py-0.5">#{t.toUpperCase()}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === AppState.ANTI_PATTERNS && (
            <div className="p-6">
              <div className="border-b-2 border-red-500 pb-2 mb-8 flex justify-between items-end">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">NEURAL_GUARD_V2 // ANTI_PATTERNS</h2>
                <span className="text-[10px] text-red-500 font-bold tracking-widest">REALTIME_INTERCEPTION: ENABLED</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {antiPatterns.map(ap => (
                  <div key={ap.id} className="border border-[#30363d] bg-[#161b22] p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,0.2)]">
                    <div className="text-red-500 font-black text-[10px] mb-2 uppercase tracking-[0.2em]">DANGER_PATTERN</div>
                    <h3 className="text-xl font-black text-white mb-4 italic uppercase">{ap.patternName}</h3>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-gray-600 uppercase block mb-1">SYMPTOMS:</span>
                        <p className="text-xs text-gray-400 bg-black/30 p-2 border border-[#30363d]">{ap.symptoms}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-green-600 uppercase block mb-1">REMEDY:</span>
                        <p className="text-xs text-green-400/80 bg-green-500/5 p-2 border border-green-500/20 italic">"{ap.betterApproach}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === AppState.MASTERY && (
            <div className="p-8">
              <h2 className="text-2xl font-black text-white italic mb-10 border-b border-[#30363d] pb-4">KERNEL_EVOLUTION_LOG</h2>
              <div className="border-l-2 border-[#1f2937] ml-4 space-y-12 relative">
                {fixes.map((fix, idx) => (
                  <div key={fix.id} className="relative pl-10">
                    <div className="absolute left-[-6px] top-1 w-2.5 h-2.5 bg-blue-600 shadow-[0_0_8px_#3b82f6]"></div>
                    <div className="bg-[#161b22] border border-[#30363d] p-6 shadow-[6px_6px_0px_0px_#000]">
                      <span className="text-[9px] text-gray-500 font-black block mb-2 tracking-[0.3em]">RECALL_EVENT_{idx + 1}</span>
                      <h4 className="font-bold text-white text-lg tracking-tight mb-3">{fix.errorMessage.split('\n')[0]}</h4>
                      <div className="text-xs text-gray-400 font-medium italic border-l-2 border-blue-500/30 pl-4 py-1">
                        "{fix.mentalModel}"
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === AppState.INSIGHTS && (
            <div className="p-10">
              <h2 className="text-4xl font-black text-white italic mb-12 border-b-4 border-blue-600 inline-block pr-12">SYSTEM_TELEMETRY</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#30363d] mb-12 shadow-[8px_8px_0px_0px_#000]">
                <div className="p-10 border-r border-[#30363d] bg-[#161b22]">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">RECOVERY_DELTA</p>
                  <p className="text-7xl font-black text-white tracking-tighter">{stats.timeSavedHours}h</p>
                  <p className="text-[9px] text-gray-600 mt-4 font-bold uppercase">ACCUMULATED_MAN_HOURS</p>
                </div>
                <div className="p-10 border-r border-[#30363d] bg-[#161b22]">
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-6">WISDOM_DENSITY</p>
                  <p className="text-7xl font-black text-white tracking-tighter">{stats.totalFixes}</p>
                  <p className="text-[9px] text-gray-600 mt-4 font-bold uppercase">BLOCKS_INDEXED</p>
                </div>
                <div className="p-10 bg-blue-600/5">
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-6">RECALL_PRECISION</p>
                  <p className="text-7xl font-black text-white tracking-tighter">{stats.accuracyRate}%</p>
                  <p className="text-[9px] text-gray-600 mt-4 font-bold uppercase">VERIFIED_HIT_RATE</p>
                </div>
              </div>
            </div>
          )}

          {activeView === AppState.CLI_EXPORT && <CliExport />}
        </main>
      </div>

      {/* Industrial Footer */}
      <footer className="mt-2 flex flex-col md:flex-row justify-between items-center text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em] px-3 bg-[#161b22] border border-[#30363d] py-1.5 shadow-[2px_2px_0px_0px_#000]">
        <div className="flex gap-8">
          <span className="text-blue-500 underline underline-offset-4 decoration-2">LISTENER: ACTIVE</span>
          <span>FS: RECALL_DB_V5</span>
          <span>SIG: 0xFD329A</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 bg-blue-600 shadow-[0_0_5px_#3b82f6]"></div>
            <div className="w-1.5 h-1.5 bg-blue-600 animate-[pulse_1s_infinite]"></div>
          </div>
          <span className="text-gray-500 font-black">RECOVERED: {stats.timeSavedHours}H</span>
        </div>
      </footer>
    </div>
  );
};

export default App;