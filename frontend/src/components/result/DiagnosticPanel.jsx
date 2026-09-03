import React from 'react';
import { ResultDiagnosticSelector } from './ResultDiagnosticSelector';

export function DiagnosticPanel({ 
  modes = [], 
  activeModeId, 
  onModeChange, 
  evidenceText, 
  className = '',
  title = '',
  children 
}) {
  return (
    <div className={`flex flex-col gap-4 w-full h-full ${className}`}>
      <div className="flex-1 w-full min-h-[400px] bg-zinc-50 dark:bg-zinc-950 rounded-2xl overflow-hidden relative border border-zinc-200 dark:border-zinc-800 flex flex-col">
        {children}
      </div>
      
      {(modes?.length > 0 || evidenceText) && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {modes && modes.length > 0 && (
            <ResultDiagnosticSelector 
              modes={modes} 
              activeModeId={activeModeId} 
              onModeChange={onModeChange} 
            />
          )}
          
          {evidenceText && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
              {evidenceText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
