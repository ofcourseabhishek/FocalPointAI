import React, { useState } from 'react';
import { MorphIcon } from "morphicons/react";

const plusPath = "M12 5v14M5 12h14";
const minusPath = "M5 12h14";

// Actions is about this photograph: only edit fixes here. Shooting technique lives in Improve.
export function MistakeCard({ categoryLabel, metricLabel, descriptor, diagnosis, canFixInPost, postTip, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <article className="result-read__mistake-card" data-expanded={isExpanded}>
      <button
        type="button"
        className="result-read__mistake-toggle"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <div className="result-read__mistake-heading">
          <span className="result-read__mistake-eyebrow">{categoryLabel} · {metricLabel}{descriptor ? ` — ${descriptor}` : ''}</span>
          <p className="result-read__mistake-diagnosis">{diagnosis}</p>
        </div>
        <span className="result-read__mistake-icon" aria-hidden="true">
          <MorphIcon icon={isExpanded ? minusPath : plusPath} spring="snappy" strokeWidth={1.5} size={18} color="currentColor" />
        </span>
      </button>

      <div className="result-read__mistake-content-wrapper" aria-hidden={!isExpanded}>
        <div className="result-read__mistake-content">
          {postTip && (
            <div className="result-read__mistake-tip" data-tip="post">
              <span className="result-read__mistake-tip-label">Fix it in post</span>
              <p className="result-read__mistake-tip-text">{postTip}</p>
            </div>
          )}
          {!canFixInPost && (
            <div className="result-read__mistake-tip result-read__mistake-tip--unfixable" data-tip="unfixable">
              <span className="result-read__mistake-tip-label">Can't be fixed in post</span>
              <p className="result-read__mistake-tip-text">Detail lost this way can't really be rebuilt after the fact. How to get it right in-camera next time is in <a href="#improve">Improve</a>.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
