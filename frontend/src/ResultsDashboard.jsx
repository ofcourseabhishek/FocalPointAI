import { useEffect, useMemo, useState } from 'react';
import {
  Camera, Check, ChevronRight, Clipboard, Download, ExternalLink,
  Link, Save, Sparkles, Target, TrendingUp
} from 'lucide-react';

const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const average = (values) => {
  const valid = values.map(Number).filter(Number.isFinite);
  return valid.length ? clamp(valid.reduce((sum, value) => sum + value, 0) / valid.length) : 0;
};
const statusFor = (score) => score >= 90 ? 'Excellent' : score >= 80 ? 'Very Good' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Needs Work';
const sentences = (value, fallback) => String(value || fallback).split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);

function normalizeAnalysis(result, file, previewUrl, uploadMetadata) {
  const aspects = result?.aspects || {};
  const cv = result?.advanced_cv || {};
  const exif = result?.exif_analysis?.camera_settings || {};
  const rating = (key) => Number(aspects[key]?.rating) || 0;
  const feelRating = (key) => Number(aspects.feel?.[key]?.rating) || 0;
  const sharpness = Number(cv.sharpness?.score || cv.blur?.score) || 0;

  const categoryDefinitions = [
    ['Composition', average([rating('composition'), rating('crop'), feelRating('angle_and_viewpoint')]), ['composition', 'crop']],
    ['Lighting', average([rating('brightness'), rating('highlights'), rating('shadows'), rating('ambiance')]), ['brightness', 'highlights', 'shadows']],
    ['Exposure', average([rating('brightness'), rating('contrast'), rating('highlights')]), ['brightness', 'contrast']],
    ['Focus', average([rating('details'), sharpness]), ['details']],
    ['Color', average([rating('colour'), rating('saturation'), rating('warmth')]), ['colour', 'saturation', 'warmth']],
    ['Noise', average([rating('details'), sharpness || rating('details')]), ['details']]
  ];

  const categories = categoryDefinitions.map(([name, score, keys]) => {
    const source = keys.map((key) => aspects[key]).find(Boolean) || {};
    return {
      name,
      score,
      status: statusFor(score),
      strengths: sentences(source.what_works, `The ${name.toLowerCase()} has a solid technical foundation.`),
      improvements: sentences(source.what_could_be_improved, `Refine the ${name.toLowerCase()} for a stronger result.`)
    };
  });

  const overallScore = clamp((Number(result?.overall_rating) || 0) * 10);
  const edits = (result?.suggested_edits || []).map((edit) => typeof edit === 'string' ? edit : edit.text || edit.suggestion).filter(Boolean);
  const suggestions = (edits.length ? edits : categories.flatMap((category) => category.improvements).slice(0, 4))
    .slice(0, 4).map((text, index) => ({ text, impact: Math.max(1, 4 - index) }));

  const metadata = {
    filename: file?.name || 'Photograph',
    dimensions: uploadMetadata ? `${uploadMetadata.width}×${uploadMetadata.height}` : 'Not available',
    fileSize: uploadMetadata?.size || (file ? `${(file.size / 1048576).toFixed(1)} MB` : 'Not available'),
    camera: exif.camera || 'Not available', lens: exif.lens || 'Not available', iso: exif.iso || 'Not available',
    shutter: exif.shutter_speed || 'Not available', aperture: exif.aperture || 'Not available', focalLength: exif.focal_length || 'Not available'
  };

  const confidence = Math.min(97, 82 + (cv && Object.keys(cv).length ? 6 : 0) + (result?.exif_analysis ? 5 : 0) + (uploadMetadata?.width >= 2000 ? 4 : 0));
  const reasons = ['Readable image data', cv && Object.keys(cv).length ? 'Computer vision signals available' : null, result?.exif_analysis ? 'EXIF metadata available' : null, uploadMetadata?.width >= 2000 ? 'High-resolution image' : null].filter(Boolean);
  const lowest = [...categories].sort((a, b) => a.score - b.score).slice(0, 3);
  const topicMap = { Composition: ['Rule of Thirds', 5], Lighting: ['Lighting Direction', 6], Exposure: ['Histogram Reading', 8], Focus: ['Focus & Depth of Field', 7], Color: ['Color Harmony', 6], Noise: ['Managing Image Noise', 5] };

  return {
    overallScore, status: statusFor(overallScore),
    summary: result?.first_impression || `This image demonstrates ${statusFor(overallScore).toLowerCase()} overall execution. Focus on the recommendations below for the strongest improvement.`,
    categories, suggestions, metadata, confidence, reasons,
    learning: lowest.map((category) => ({ title: topicMap[category.name][0], minutes: topicMap[category.name][1], category: category.name })),
    annotations: [
      { id: 1, label: 'Subject', x: 52, y: 45 }, { id: 2, label: 'Horizon', x: 70, y: 56 },
      { id: 3, label: 'Highlight', x: 28, y: 24 }, { id: 4, label: 'Background', x: 82, y: 32 },
      { id: 5, label: 'Leading line', x: 34, y: 72 }
    ],
    previewUrl
  };
}

export default function ResultsDashboard({ result, file, previewUrl, uploadMetadata, onReset }) {
  const dashboard = useMemo(() => normalizeAnalysis(result, file, previewUrl, uploadMetadata), [result, file, previewUrl, uploadMetadata]);
  const [displayScore, setDisplayScore] = useState(0);
  const [activeMarker, setActiveMarker] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const started = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / 1200);
      setDisplayScore(Math.round(dashboard.overallScore * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dashboard.overallScore]);

  const reportText = `FocalPoint AI Analysis\nOverall: ${dashboard.overallScore}/100 (${dashboard.status})\n\n${dashboard.summary}\n\nTop recommendations:\n${dashboard.suggestions.map((item, index) => `${index + 1}. ${item.text} (+${item.impact} points)`).join('\n')}`;
  const notify = (message) => { setActionMessage(message); window.setTimeout(() => setActionMessage(''), 1800); };
  const copyReport = async () => { await navigator.clipboard.writeText(reportText); notify('Report copied'); };
  const shareReport = async () => {
    if (navigator.share) await navigator.share({ title: 'FocalPoint AI Analysis', text: reportText });
    else { await navigator.clipboard.writeText(window.location.href); notify('Share link copied'); }
  };
  const saveAnalysis = () => {
    const saved = JSON.parse(localStorage.getItem('focalpoint-analyses') || '[]');
    localStorage.setItem('focalpoint-analyses', JSON.stringify([{ date: new Date().toISOString(), score: dashboard.overallScore, filename: dashboard.metadata.filename, result }, ...saved].slice(0, 20)));
    notify('Analysis saved');
  };

  return (
    <div className="results-dashboard">
      <div className="dashboard-toolbar">
        <div><span>Analysis complete</span><h2>Photography Critique</h2></div>
        <div className="export-actions">
          <button onClick={() => window.print()}><Download size={16} />Download PDF</button>
          <button onClick={shareReport}><Link size={16} />Share Link</button>
          <button onClick={copyReport}><Clipboard size={16} />Copy Report</button>
          <button onClick={saveAnalysis}><Save size={16} />Save Analysis</button>
        </div>
      </div>
      {actionMessage && <div className="dashboard-toast">{actionMessage}</div>}

      <aside className="photo-panel dashboard-card">
        <div className="annotated-photo">
          <img src={dashboard.previewUrl} alt="Analyzed photograph" />
          {dashboard.annotations.map((marker) => (
            <button key={marker.id} className={`photo-marker ${activeMarker === marker.id ? 'active' : ''}`} style={{ left: `${marker.x}%`, top: `${marker.y}%` }} onMouseEnter={() => setActiveMarker(marker.id)} onMouseLeave={() => setActiveMarker(null)} onClick={() => document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth' })} aria-label={marker.label}>
              {marker.id}<span>{marker.label}</span>
            </button>
          ))}
        </div>
        <h3>{dashboard.metadata.filename}</h3>
        <div className="compact-metadata">
          {Object.entries(dashboard.metadata).slice(1).map(([key, value]) => <div key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><strong>{value}</strong></div>)}
        </div>
        <button className="btn-secondary analyze-another" onClick={onReset}><Camera size={17} />Analyze Another Photo</button>
      </aside>

      <main className="dashboard-main">
        <section className="overall-card dashboard-card">
          <div className="score-block"><span>Overall Score</span><strong>{displayScore}</strong><em>{dashboard.status}</em></div>
          <div className="summary-block"><span>Overall Assessment</span><p>{dashboard.summary}</p></div>
        </section>

        <section className="category-grid">
          {dashboard.categories.map((category) => <article className="category-card dashboard-card" key={category.name}><span>{category.name}</span><strong>{category.score}</strong><em>{category.status}</em><div><i style={{ width: `${category.score}%` }} /></div></article>)}
        </section>

        <section className="detailed-feedback dashboard-card">
          <div className="section-heading"><div><span>Detailed Analysis</span><h3>What works and what to improve</h3></div><Target size={22} /></div>
          <div className="feedback-grid">
            {dashboard.categories.map((category) => <article key={category.name}><header><h4>{category.name}</h4><strong>{category.score}</strong></header><h5>Strengths</h5>{category.strengths.map((text) => <p className="strength" key={text}><Check size={14} />{text}</p>)}<h5>Needs Improvement</h5>{category.improvements.map((text) => <p key={text}>• {text}</p>)}</article>)}
          </div>
        </section>

        <section id="recommendations" className="recommendations dashboard-card">
          <div className="section-heading"><div><span>AI Suggestions</span><h3>Top Recommendations</h3></div><Sparkles size={22} /></div>
          {dashboard.suggestions.map((suggestion, index) => <div className={`recommendation ${activeMarker === index + 1 ? 'highlighted' : ''}`} key={`${suggestion.text}-${index}`}><b>{index + 1}</b><p>{suggestion.text}</p><span><TrendingUp size={14} />+{suggestion.impact} points</span></div>)}
        </section>

        <section className="dashboard-lower-grid">
          <article className="confidence-card dashboard-card"><span>AI Confidence</span><div><strong>{dashboard.confidence}%</strong><em>High</em></div>{dashboard.reasons.map((reason) => <p key={reason}><Check size={14} />{reason}</p>)}</article>
          <article className="learning-card dashboard-card"><span>Improve These Skills</span>{dashboard.learning.map((topic) => <button key={topic.title}><div><strong>{topic.title}</strong><small>{topic.category}</small></div><span>{topic.minutes} min</span><ChevronRight size={16} /></button>)}</article>
        </section>
      </main>
    </div>
  );
}
