import React from 'react';

export function ResultDiagnosticSelector({ modes, activeModeId, onModeChange }) {
  if (!modes?.length) return null;

  return (
    <div className="result-read__diagnostic-selector" role="tablist" aria-label="Diagnostic Modes">
      {modes.map((mode) => {
        const isUnavailable = mode.loadState === 'unavailable';
        const isActive = activeModeId === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => !isUnavailable && onModeChange?.(mode.id)}
            disabled={isUnavailable}
            title={isUnavailable ? mode.unavailableReason : undefined}
            className="result-read__diagnostic-mode"
            data-active={isActive}
            data-unavailable={isUnavailable}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
