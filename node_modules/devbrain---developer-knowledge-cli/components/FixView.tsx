import React, { useState } from 'react';
import { Fix } from '../types';
import { storage } from '../services/storageService';

interface FixViewProps {
  fix: Fix;
  confidence?: number;
  onVerified?: (worked: boolean) => void;
}

export const FixView: React.FC<FixViewProps> = ({ fix, confidence, onVerified }) => {
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleVerify = (worked: boolean) => {
    storage.recordOutcome(fix.id, worked);
    setFeedbackSent(true);
    if (onVerified) onVerified(worked);
  };

  const successRate = Math.round(((fix.successCount || 0) / (fix.usageCount || 1)) * 100);

  return (
    <div className={`border mb-4 font-mono text-[11px] overflow-hidden ${fix.isWebResult ? 'border-purple-500/50 bg-purple-500/5' : 'border-[#30363d] bg-[#0b0e14]'}`}>
      {/* Header */}
      <div className={`${fix.isWebResult ? 'bg-purple-900/40' : 'bg-[#1f2937]'} px-3 py-1 flex justify-between items-center border-b border-[#30363d]`}>
        <div className="flex items-center gap-3">
          <span className={`${fix.isWebResult ? 'text-purple-400' : 'text-blue-400'} font-bold`}>{fix.isWebResult ? 'GLOBAL_RECALL' : 'LOCAL_RECALL'}::{fix.id.toUpperCase().split('-')[0]}</span>
          {confidence !== undefined && (
            <>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">SCORE: {confidence}%</span>
            </>
          )}
        </div>
        <div className="text-[9px] text-gray-500 font-bold uppercase">
          {fix.isWebResult ? 'NET_ADDR_0x0' : fix.projectName.toUpperCase()}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Error */}
        <div className={`border-l-2 ${fix.isWebResult ? 'border-purple-500' : 'border-red-500'} bg-black/30 p-2`}>
          <span className={`${fix.isWebResult ? 'text-purple-500' : 'text-red-500'} font-bold block mb-1 text-[9px]`}>{fix.isWebResult ? 'QUERY_STR' : 'STDOUT::ERR'}</span>
          <code className="text-gray-300 whitespace-pre-wrap">{fix.errorMessage}</code>
        </div>

        {/* Insight Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="border border-[#30363d] p-2 bg-[#0d1117]">
            <span className="text-blue-500 font-bold block mb-1 text-[9px]">CAUSE_ANALYSIS:</span>
            <p className="text-gray-400 leading-tight">{fix.rootCause}</p>
          </div>
          <div className={`border border-[#30363d] p-2 ${fix.isWebResult ? 'bg-purple-500/5' : 'bg-blue-500/5'}`}>
            <span className="text-purple-500 font-bold block mb-1 text-[9px]">MENTAL_MODEL:</span>
            <p className="text-gray-400 italic">"{fix.mentalModel}"</p>
          </div>
        </div>

        {/* Diff Solution */}
        <div className="border border-[#30363d]">
          <div className="bg-[#1f2937]/50 px-2 py-1 text-green-500 font-bold text-[9px] border-b border-[#30363d] flex justify-between">
            <span>PATCH_DEFINITION</span>
            {fix.sourceUrl && (
              <a href={fix.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">VIEW_SOURCE_GROUNDING</a>
            )}
          </div>
          <div className="p-2 bg-black/40">
             <pre className="text-green-400 overflow-x-auto"><code>+ {fix.afterCodeSnippet}</code></pre>
          </div>
        </div>

        {/* Action / Stats */}
        {!fix.isWebResult && (
          <div className="flex flex-col md:flex-row justify-between items-center pt-2 border-t border-[#30363d]/50 gap-2">
            <div className="flex items-center gap-3 text-[9px] text-gray-500 font-bold">
              <span className="text-green-500/80">RELIABILITY: {successRate}%</span>
              <span>HITS: {fix.usageCount}</span>
              <div className="flex gap-1">
                {fix.tags.map(t => <span key={t} className="text-blue-500/50">#{t.toUpperCase()}</span>)}
              </div>
            </div>
            
            {!feedbackSent ? (
              <div className="flex gap-1">
                <button 
                  onClick={() => handleVerify(true)}
                  className="bg-green-900/10 hover:bg-green-900/30 text-green-500 px-2 py-0.5 border border-green-900/30 font-bold text-[9px]"
                >
                  [ VERIFY ]
                </button>
                <button 
                  onClick={() => handleVerify(false)}
                  className="bg-red-900/10 hover:bg-red-900/30 text-red-500 px-2 py-0.5 border border-red-900/30 font-bold text-[9px]"
                >
                  [ REJECT ]
                </button>
              </div>
            ) : (
              <span className="text-blue-500 text-[9px] font-bold">
                WISDOM_FS_SYNC_COMPLETE
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};