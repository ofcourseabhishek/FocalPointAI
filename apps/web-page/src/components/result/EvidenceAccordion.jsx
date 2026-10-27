import React, { useState } from 'react';
import { MorphIcon } from "morphicons/react";
import '../../result-read.css';

const plusPath = "M12 5v14M5 12h14";
const minusPath = "M5 12h14";

export function EvidenceAccordion({
  title,
  valueTag,
  score,
  explanation,
  secondaryLabel,
  secondaryText,
  defaultExpanded = false,
  showScoreCollapsed = true,
  isExpanded: controlledExpanded,
  onToggle,
  interactive = true,
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const toggle = () => {
    onToggle?.();
    if (!isControlled) setInternalExpanded((current) => !current);
  };

  // Static row: a plain, non-interactive line of evidence with no expand affordance.
  if (!interactive) {
    return (
      <div className="result-read__evidence-accordion" data-interactive="false">
        <div className="result-read__evidence-accordion-toggle result-read__evidence-accordion-toggle--static">
          <span className="result-read__evidence-accordion-title">{title}</span>
          <div className="result-read__evidence-accordion-value-group">
            {valueTag && <span className="result-read__evidence-accordion-value-tag">{valueTag}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="result-read__evidence-accordion" data-expanded={isExpanded}>
      <button 
        type="button" 
        onClick={toggle}
        aria-expanded={isExpanded}
        className="result-read__evidence-accordion-toggle"
      >
        <span className="result-read__evidence-accordion-title">{title}</span>
        
        <div className="result-read__evidence-accordion-value-group">
          {valueTag && <span className="result-read__evidence-accordion-value-tag">{valueTag}</span>}
          {showScoreCollapsed && score != null && <span className="result-read__evidence-accordion-score">{score}</span>}
          <span className="result-read__evidence-accordion-icon" aria-hidden="true">
            <MorphIcon icon={isExpanded ? minusPath : plusPath} spring="snappy" strokeWidth={1.5} size={18} color="currentColor" />
          </span>
        </div>
      </button>

      <div className="result-read__evidence-accordion-content-wrapper" aria-hidden={!isExpanded}>
        <div className="result-read__evidence-accordion-content">
          {!showScoreCollapsed && score != null && (
            <div className="result-read__evidence-accordion-expanded-score">{score}</div>
          )}
          {explanation && <p className="result-read__evidence-accordion-analysis">{explanation}</p>}
          {secondaryText && (
            <div className="result-read__evidence-accordion-secondary">
              {secondaryLabel && <h4 className="result-read__evidence-accordion-secondary-label">{secondaryLabel}</h4>}
              <p className="result-read__evidence-accordion-secondary-text">{secondaryText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
