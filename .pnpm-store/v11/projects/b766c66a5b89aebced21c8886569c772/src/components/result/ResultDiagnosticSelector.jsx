import React from 'react';
import { cn } from '@/lib/utils';

export function ResultDiagnosticSelector({ modes, activeModeId, onModeChange }) {
  if (!modes || modes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Diagnostic Modes">
      {modes.map(mode => {
        const isUnavailable = mode.loadState === 'unavailable';
        const isActive = activeModeId === mode.id;
        
        return (
          <button
            key={mode.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => !isUnavailable && onModeChange(mode.id)}
            disabled={isUnavailable}
            title={isUnavailable ? mode.unavailableReason : undefined}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2",
              isActive
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
              isUnavailable && "opacity-50 cursor-not-allowed"
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
