import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { ResultDiagnosticSelector } from './ResultDiagnosticSelector';

export function DiagnosticPanel({
  modes = [],
  activeModeId,
  onModeChange,
  evidenceText,
  className = '',
  title: _title = '',
  children,
}) {
  const panelId = `result-read-diagnostic-panel-${useId().replace(/:/g, '')}`;
  const hasModes = modes.length > 0;
  const activeMode = modes.find((mode) => mode.id === activeModeId);
  const activeTabId = activeMode ? `${panelId}-tab-${activeMode.id}` : undefined;

  return (
    <div className={cn('result-read__diagnostic-panel', className)}>
      <div
        id={hasModes ? panelId : undefined}
        className="result-read__diagnostic-tabpanel"
        role={hasModes ? 'tabpanel' : undefined}
        aria-labelledby={activeTabId}
      >
        {children}
      </div>

      {(modes?.length > 0 || evidenceText) && (
        <footer className="result-read__diagnostic-panel-footer">
          {modes?.length > 0 && (
            <ResultDiagnosticSelector
              modes={modes}
              activeModeId={activeModeId}
              onModeChange={onModeChange}
              panelId={panelId}
            />
          )}

          {evidenceText && (
            <p className="result-read__diagnostic-panel-evidence">{evidenceText}</p>
          )}
        </footer>
      )}
    </div>
  );
}
