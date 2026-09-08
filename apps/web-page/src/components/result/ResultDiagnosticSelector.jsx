import React, { useRef, useState } from 'react';

export function ResultDiagnosticSelector({ modes, activeModeId, onModeChange, panelId }) {
  const tabRefs = useRef(new Map());
  const [inputMode, setInputMode] = useState('pointer');
  if (!modes?.length) return null;
  const availableModes = modes.filter((mode) => mode.loadState !== 'unavailable');
  const focusableModeId = availableModes.some((mode) => mode.id === activeModeId)
    ? activeModeId
    : availableModes[0]?.id;

  const selectAndFocus = (mode, source) => {
    setInputMode(source);
    onModeChange?.(mode.id, source);
    tabRefs.current.get(mode.id)?.focus();
  };

  const handleKeyDown = (event, mode) => {
    if (!availableModes.length) return;

    const currentIndex = availableModes.findIndex((availableMode) => availableMode.id === mode.id);
    let nextIndex;

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + availableModes.length) % availableModes.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % availableModes.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = availableModes.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectAndFocus(availableModes[nextIndex], 'keyboard');
  };

  return (
    <div className="result-read__diagnostic-selector" data-motion={inputMode} role="tablist" aria-label="Diagnostic modes" aria-orientation="horizontal">
      {modes.map((mode) => {
        const isUnavailable = mode.loadState === 'unavailable';
        const isActive = activeModeId === mode.id;
        const tabId = `${panelId}-tab-${mode.id}`;

        return (
          <button
            key={mode.id}
            ref={(element) => {
              if (element) tabRefs.current.set(mode.id, element);
              else tabRefs.current.delete(mode.id);
            }}
            type="button"
            role="tab"
            id={tabId}
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={!isUnavailable && mode.id === focusableModeId ? 0 : -1}
            onClick={(event) => {
              if (isUnavailable) return;
              const source = event.detail === 0 ? 'keyboard' : 'pointer';
              setInputMode(source);
              onModeChange?.(mode.id, source);
            }}
            onKeyDown={(event) => handleKeyDown(event, mode)}
            onPointerDown={() => setInputMode('pointer')}
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
