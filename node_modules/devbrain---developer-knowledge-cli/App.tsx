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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeProjectTabs, setActiveProjectTabs] = useState<Record<string, string>>({});

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
            { id: AppState.CLI_EXPORT, label: '0x06_DEPLOY' },
            { id: AppState.HELP, label: '0x07_HELP' }
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
            <div className="p-8 space-y-12 h-full flex flex-col">
              <div className="flex justify-between items-end border-b-4 border-blue-600 pb-4 mb-4">
                <div>
                  <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">PROJECT_KNOWLEDGE_BASE</h2>
                  <p className="text-xs text-gray-500 mt-2 font-bold tracking-widest uppercase">
                    {fixes.length} Total insights captured across your stack
                  </p>
                </div>
                {/* Global Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SEARCH_WISDOM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#161b22] border-2 border-gray-800 text-xs font-bold text-blue-500 px-10 py-3 uppercase tracking-widest outline-none focus:border-blue-600 transition-all w-64"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">/</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-16 pr-2">
                {Array.from(new Set(fixes.map(f => f.projectName) as string[])).map((project: string) => {
                  const projectFixes = fixes.filter(f => f.projectName === project);
                  const currentTab = activeProjectTabs[project] || 'pattern';

                  const projectTabsConfig = [
                    { id: 'pattern', label: 'CODE_PATTERNS', color: 'blue' },
                    { id: 'bugfix', label: 'FIXES_&_SOLUTIONS', color: 'red' },
                    { id: 'git', label: 'COMMIT_HISTORY', color: 'purple' },
                    { id: 'principle', label: 'PRINCIPLES', color: 'cyan' },
                    { id: 'runbook', label: 'RUNBOOKS', color: 'green' },
                    { id: 'decision', label: 'DECISIONS', color: 'yellow' }
                  ];

                  return (
                    <section key={project} className="space-y-6">
                      <div className="flex items-center justify-between border-l-8 border-blue-600 pl-6 py-2 bg-blue-600/5">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">{project}</h2>
                      </div>

                      {/* Category Tabs per Project */}
                      <div className="flex border-b border-gray-800 mb-6">
                        {projectTabsConfig.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveProjectTabs(prev => {
                              const next = { ...prev };
                              next[project] = tab.id;
                              return next;
                            })}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${currentTab === tab.id
                              ? `bg-${tab.color}-600 text-white shadow-inner`
                              : 'text-gray-500 hover:text-gray-200 hover:bg-[#1f2937]'
                              }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-10">
                        {projectTabsConfig.map(tab => {
                          if (currentTab !== tab.id) return null;

                          const tabFixes = projectFixes.filter(f => {
                            const fixType = f.type || 'pattern';
                            const matchesType = fixType === tab.id;
                            const matchesSearch = !searchTerm ||
                              JSON.stringify(f).toLowerCase().includes(searchTerm.toLowerCase());
                            return matchesType && matchesSearch;
                          });

                          const groupedFixes = tabFixes.reduce((acc: any[], current: any) => {
                            // Normalize error message for grouping
                            const title = current.errorMessage?.split('\n')[0];
                            const existing = acc.find(f => f.errorMessage?.split('\n')[0] === title);

                            if (existing) {
                              existing.usageCount = (existing.usageCount || 1) + (current.usageCount || 1);
                              existing.filePaths = Array.from(new Set([...(existing.filePaths || []), ...(current.filePaths || [])]));
                            } else {
                              acc.push({ ...current });
                            }
                            return acc;
                          }, []);

                          if (groupedFixes.length === 0) {
                            return (
                              <div key={tab.id} className="p-10 text-center border-2 border-dashed border-[#30363d] rounded-lg">
                                <span className="text-gray-600 font-bold italic tracking-tighter text-xl uppercase opacity-20">NO_{tab.label.replace(/[^A-Z0-9]/g, '_')}_FOUND</span>
                              </div>
                            );
                          }

                          return (
                            <div key={tab.id}>
                              <div className="space-y-4">
                                {groupedFixes.map(fix => (
                                  <div key={fix.id} className="bg-[#161b22] border border-gray-800/50 hover:border-gray-700 transition-all shadow-xl group rounded-r-md">
                                    <div className="flex flex-col md:flex-row divide-x divide-gray-800/50">
                                      {/* Project / Stack Info */}
                                      <div className="md:w-56 p-4 bg-[#0d1117]/50 flex flex-col justify-center gap-1 border-l-4 border-l-blue-600/30 group-hover:border-l-blue-500 transition-all">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Environment:</span>
                                        <span className="text-sm font-black text-white italic truncate uppercase">{fix.frameworkContext || 'System'}</span>
                                        <div className="mt-3 flex items-center gap-2">
                                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                                          <span className="text-[9px] font-bold text-blue-500 uppercase italic">Active Wisdom</span>
                                        </div>
                                      </div>

                                      {/* Main Content */}
                                      <div className="flex-1 p-5 flex items-center gap-8">
                                        <div className="flex-1">
                                          <h4 className="text-base font-black text-white uppercase tracking-tight mb-2 group-hover:text-blue-400 transition-colors">
                                            {fix.errorMessage?.split('\n')[0]}
                                          </h4>
                                          <div className="flex gap-4">
                                            <div className="bg-black/20 px-3 py-2 border border-gray-800/50 rounded flex-1">
                                              <span className="text-[8px] font-bold text-gray-500 uppercase block mb-1">RATIONALE:</span>
                                              <p className="text-[11px] text-gray-400 font-medium line-clamp-2 md:line-clamp-1 italic">
                                                {fix.rootCause || "Context extraction in progress..."}
                                              </p>
                                            </div>
                                            <div className="bg-green-600/5 px-3 py-2 border border-green-500/20 rounded flex-1">
                                              <span className="text-[8px] font-bold text-green-700 uppercase block mb-1">THE_FIX:</span>
                                              <p className="text-[11px] text-green-100/70 font-bold line-clamp-2 md:line-clamp-1">
                                                {fix.fixDescription}
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Stats Column */}
                                        <div className="flex flex-col items-center justify-center border-l border-gray-800/50 pl-8 min-w-[80px]">
                                          <span className="text-xl font-black text-white">{fix.usageCount || 1}</span>
                                          <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Encounters</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              {fixes.length === 0 && (
                <div className="py-40 text-center border-4 border-dashed border-gray-800 rounded-2xl">
                  <p className="text-gray-700 text-3xl font-black uppercase italic tracking-tighter">NO_KNOWLEDGE_MOUNTED_IN_CORE</p>
                  <p className="text-gray-800 text-xs font-bold mt-4 uppercase tracking-[0.5em]">STAIR_RUN_DAEMON_TO_EXTRACT_WISDOM</p>
                </div>
              )}
            </div>
          )}

          {activeView === AppState.ANTI_PATTERNS && (
            <div className="p-6">
              <div className="border-b-2 border-red-500 pb-2 mb-8 flex justify-between items-end">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">NEURAL_GUARD_SYSTEM</h2>
                <span className="text-[10px] text-red-500 font-bold tracking-widest">REALTIME_INTERCEPTION: ACTIVE</span>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {antiPatterns.map(ap => (
                  <div key={ap.id} className="border border-[#30363d] bg-[#161b22] px-6 py-4 flex flex-col md:flex-row gap-6 shadow-sm border-l-4 border-l-red-600/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-red-500 font-black text-[9px] border border-red-500/30 px-2 py-0.5 italic uppercase">Anomaly Detected</span>
                        <h3 className="text-lg font-black text-white italic uppercase">{ap.patternName}</h3>
                      </div>
                      <div className="space-y-4 mt-4">
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Symptoms in Code:</span>
                          <p className="text-xs text-gray-400 bg-black/30 p-3 border border-[#30363d] leading-relaxed italic">
                            {ap.symptoms}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block">Projects Affected:</span>
                          <div className="flex flex-wrap gap-2">
                            {ap.projectsAffected?.map((proj: string) => (
                              <span key={proj} className="text-[9px] text-gray-500 bg-red-500/5 border border-red-500/10 px-2 py-1">
                                {proj}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:w-1/3 bg-green-500/5 border border-green-500/20 p-5 flex flex-col justify-center">
                      <span className="text-[10px] font-black text-green-500 uppercase block mb-2 italic">Refactoring Recommendation</span>
                      <p className="text-xs text-green-400/80 leading-relaxed font-medium">
                        "{ap.betterApproach}"
                      </p>
                    </div>
                  </div>
                ))}
                {antiPatterns.length === 0 && (
                  <div className="p-20 text-center border-2 border-dashed border-[#30363d] rounded-lg">
                    <span className="text-gray-600 font-bold italic tracking-tighter text-xl uppercase opacity-20">NO_ANOMALIES_IN_BUFFER</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === AppState.MASTERY && (
            <div className="p-8">
              <h2 className="text-2xl font-black text-white italic mb-10 border-b border-[#30363d] pb-4 uppercase tracking-tighter">COGNITIVE_EVOLUTION_TIMELINE</h2>
              <div className="border-l-2 border-[#1f2937] ml-4 space-y-12 relative">
                {fixes.map((fix, idx) => (
                  <div key={fix.id} className="relative pl-10">
                    <div className="absolute left-[-6px] top-1 w-2.5 h-2.5 bg-blue-600 shadow-[0_0_8px_#3b82f6]"></div>
                    <div className="bg-[#161b22] border border-[#30363d] p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 uppercase ${fix.type === 'bugfix' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>
                          {fix.type || 'insight'}
                        </span>
                        <span className="text-[9px] text-gray-500 font-black tracking-widest uppercase">
                          {fix.projectName} // {new Date(fix.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-lg tracking-tight mb-3">{fix.errorMessage?.split('\n')[0]}</h4>
                      <div className="text-xs text-gray-400 font-medium italic border-l-2 border-blue-500/30 pl-4 py-1">
                        "{fix.fixDescription?.substring(0, 150)}..."
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === AppState.INSIGHTS && (
            <div className="p-10">
              <h2 className="text-4xl font-black text-white italic mb-12 border-b-4 border-blue-600 inline-block pr-12 uppercase tracking-tighter">KB_ANALYTICS</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#30363d] mb-12 shadow-[8px_8px_0px_0px_#000]">
                <div className="p-10 border-r border-[#30363d] bg-[#161b22]">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Development Output</p>
                  <p className="text-7xl font-black text-white tracking-tighter">{stats.timeSavedHours}h</p>
                  <p className="text-[9px] text-gray-600 mt-4 font-bold uppercase tracking-widest">ESTIMATED_RECOVERY_TIME</p>
                </div>
                <div className="p-10 border-r border-[#30363d] bg-[#161b22]">
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-6">Engineering Wisdom</p>
                  <p className="text-7xl font-black text-white tracking-tighter">{stats.totalFixes}</p>
                  <p className="text-[9px] text-gray-600 mt-4 font-bold uppercase tracking-widest">KNOWLEDGE_BLOCKS_STORED</p>
                </div>
                <div className="p-10 bg-blue-600/5">
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-6">Detection Accuracy</p>
                  <p className="text-7xl font-black text-white tracking-tighter">{stats.accuracyRate}%</p>
                  <p className="text-[9px] text-gray-600 mt-4 font-bold uppercase tracking-widest">PATTERN_VERIFICATION_RATE</p>
                </div>
              </div>
            </div>
          )}

          {activeView === AppState.CLI_EXPORT && <CliExport />}

          {activeView === AppState.HELP && (
            <div className="p-6">
              <div className="border-b-2 border-blue-500 pb-2 mb-8">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">COMMAND_REFERENCE</h2>
                <p className="text-[9px] text-gray-500 mt-1">DevBrain CLI - Complete Command Guide</p>
              </div>

              <div className="space-y-6">
                {/* RUN Command */}
                <div className="border border-[#30363d] bg-[#161b22] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-green-400">devbrain run &lt;cmd...&gt;</h3>
                      <p className="text-[9px] text-gray-400 mt-1">Execute a command and monitor for errors</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-300 leading-relaxed">
                    Runs your command and captures any errors. Automatically searches the knowledge base for similar issues and alerts you with solutions that worked before. Perfect for catching recurring problems.
                  </p>
                  <p className="text-[9px] text-blue-300 mt-2 font-mono">$ devbrain run "npm test"</p>
                </div>

                {/* DAEMON Command */}
                <div className="border border-[#30363d] bg-[#161b22] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-green-400">devbrain daemon --path &lt;path&gt;</h3>
                      <p className="text-[9px] text-gray-400 mt-1">Watch directory for code changes</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-300 leading-relaxed">
                    Continuously monitors a directory for changes. Analyzes TypeScript, JavaScript, and Python files to detect patterns, code complexity, and potential issues. Stores findings to your local knowledge base.
                  </p>
                  <p className="text-[9px] text-blue-300 mt-2 font-mono">$ devbrain daemon --path ./src</p>
                </div>

                {/* SERVER Command */}
                <div className="border border-[#30363d] bg-[#161b22] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-green-400">devbrain server --port &lt;number&gt;</h3>
                      <p className="text-[9px] text-gray-400 mt-1">Start the API backend server</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-300 leading-relaxed">
                    Launches the backend API that powers the dashboard. Exposes endpoints for retrieving fixes, stats, and storing new insights. Default port is 3000.
                  </p>
                  <p className="text-[9px] text-blue-300 mt-2 font-mono">$ devbrain server --port 3000</p>
                </div>

                {/* SEARCH Command */}
                <div className="border border-[#30363d] bg-[#161b22] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-green-400">devbrain search &lt;query&gt;</h3>
                      <p className="text-[9px] text-gray-400 mt-1">Search knowledge base</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-300 leading-relaxed">
                    Searches your accumulated knowledge base for matching issues, patterns, or tags. Works across all projects and GitHub insights you've learned from.
                  </p>
                  <p className="text-[9px] text-blue-300 mt-2 font-mono">$ devbrain search "error handling"</p>
                </div>

                {/* STATS Command */}
                <div className="border border-[#30363d] bg-[#161b22] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-green-400">devbrain stats</h3>
                      <p className="text-[9px] text-gray-400 mt-1">View your brain metrics</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-300 leading-relaxed">
                    Displays statistics about your DevBrain: total blocks indexed, time saved, and recall precision. Shows how much knowledge you've accumulated.
                  </p>
                  <p className="text-[9px] text-blue-300 mt-2 font-mono">$ devbrain stats</p>
                </div>

                {/* GITHUB Command */}
                <div className="border border-[#30363d] bg-[#161b22] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-green-400">devbrain github &lt;owner&gt; &lt;repo&gt; [--token]</h3>
                      <p className="text-[9px] text-gray-400 mt-1">Learn from GitHub repositories</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-300 leading-relaxed">
                    Analyzes a GitHub repository's commit history and closed issues. Learns patterns and solutions from open-source projects. Perfect for studying best practices and common mistakes.
                  </p>
                  <p className="text-[9px] text-blue-300 mt-2 font-mono">$ devbrain github facebook react</p>
                  <p className="text-[9px] text-blue-300 font-mono">$ devbrain github mycompany backend --token $GITHUB_TOKEN</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#30363d]">
                <h3 className="text-sm font-bold text-cyan-400 mb-4">TYPICAL WORKFLOW</h3>
                <div className="bg-[#0d1117] p-4 border border-[#30363d] text-[9px] text-gray-300 font-mono space-y-1">
                  <p className="text-blue-400"># Terminal 1: Start backend</p>
                  <p>npm run cli:dev -- server --port 3000</p>
                  <p></p>
                  <p className="text-blue-400"># Terminal 2: Start dashboard</p>
                  <p>npm run dashboard:dev</p>
                  <p></p>
                  <p className="text-blue-400"># Terminal 3: Monitor your code</p>
                  <p>devbrain daemon --path ./src</p>
                  <p></p>
                  <p className="text-blue-400"># Then learn from others</p>
                  <p>devbrain github facebook react</p>
                  <p></p>
                  <p className="text-blue-400"># Execute commands with error alerts</p>
                  <p>devbrain run "npm test"</p>
                </div>
              </div>
            </div>
          )}
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