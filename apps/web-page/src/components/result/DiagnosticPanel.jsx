import React from 'react';
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
  return (
    <div className={cn('result-read__diagnostic-panel', className)}>
      {children}

      {(modes?.length > 0 || evidenceText) && (
        <footer className="result-read__diagnostic-panel-footer">
          {modes?.length > 0 && (
            <ResultDiagnosticSelector
              modes={modes}
              activeModeId={activeModeId}
              onModeChange={onModeChange}
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
