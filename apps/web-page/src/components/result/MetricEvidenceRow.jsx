import React from 'react';
import { MorphIcon } from "morphicons/react";
import { Plus, Minus } from "lucide";
import '../../result-read.css';

export function MetricEvidenceRow({ metric, categoryLabel, isExpanded, onToggle }) {
  return (
    <div className="result-read__metric-row" data-expanded={isExpanded}>
      <button 
        type="button" 
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="result-read__metric-toggle"
      >
        <div className="result-read__metric-header">
          {categoryLabel && <span className="result-read__metric-category">{categoryLabel}</span>}
          <span className="result-read__metric-label">{metric.label}</span>
        </div>
        
        <div className="result-read__metric-value-group">
          {metric.assessment && <span className="result-read__metric-assessment">{metric.assessment}</span>}
          {metric.score != null && <span className="result-read__metric-score">{metric.score}</span>}
          <span className="result-read__metric-icon" aria-hidden="true">
            <MorphIcon icon={isExpanded ? Minus : Plus} spring="snappy" strokeWidth={2} size={18} color="currentColor" />
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="result-read__metric-details">
          {metric.saw && (
            <div className="result-read__metric-detail-block">
              <h4>WHAT SNAPGRADE SAW</h4>
              <p>{metric.saw}</p>
            </div>
          )}
          
          {metric.matters && (
            <div className="result-read__metric-detail-block">
              <h4>WHY IT MATTERS</h4>
              <p>{metric.matters}</p>
            </div>
          )}

          {metric.try && (
            <div className="result-read__metric-detail-block">
              <h4>TRY THIS</h4>
              <p>{metric.try}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

