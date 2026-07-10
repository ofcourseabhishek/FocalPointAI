import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, UploadCloud, Mail, CheckCircle, AlertCircle, Sparkles, 
  RefreshCw, Sun, Contrast, Droplet, Eye, Thermometer, Info, 
  Moon, Palette, Compass, Check, Sliders
} from 'lucide-react';

const BACKEND_URL = 'http://127.0.0.1:8000';

const LOADING_STEPS = [
  "Uploading photo & initiating secure connection...",
  "Analyzing exposure levels (brightness, contrast, highlights, shadows)...",
  "Evaluating color palette, saturation, and warmth...",
  "Scanning structural details and micro-sharpness...",
  "Calculating composition grids, symmetry, and crop lines..."
];

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fileInputRef = useRef(null);
  const loadingIntervalRef = useRef(null);

  // Cycle loading steps
  useEffect(() => {
    if (isLoading) {
      setLoadingStep(0);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [isLoading]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setPreviewUrl(URL.createObjectURL(droppedFile));
        setError('');
      } else {
        setError('Please drop an image file (PNG, JPG, WEBP).');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError('');
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drop an image first.');
      return;
    }
    if (!email) {
      setError('Please enter your email address to receive updates.');
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', email);

    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze the photo.');
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please check that the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl('');
    setAnalysisResult(null);
    setError('');
    setActiveTab('all');
  };

  // Helper: map aspect keys to Icons and Categories
  const aspectConfig = {
    brightness: { label: 'Brightness', icon: Sun, category: 'light' },
    contrast: { label: 'Contrast', icon: Contrast, category: 'light' },
    highlights: { label: 'Highlights', icon: Sparkles, category: 'light' },
    shadows: { label: 'Shadows', icon: Moon, category: 'light' },
    ambiance: { label: 'Ambiance', icon: Sliders, category: 'light' },
    colour: { label: 'Colour Palette', icon: Palette, category: 'color' },
    saturation: { label: 'Saturation', icon: Droplet, category: 'color' },
    warmth: { label: 'Warmth / Temperature', icon: Thermometer, category: 'color' },
    details: { label: 'Details & Sharpening', icon: Eye, category: 'details' },
    crop: { label: 'Composition & Crop', icon: Compass, category: 'details' }
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(99,102,241,0.3)' }}>
            <Camera size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', tracking: '-0.02em', margin: 0 }}>
              FocalPoint<span className="gradient-text">.AI</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Smart Photography Critique</p>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          For Photography Learners
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '16px', borderRadius: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', fontSize: '0.95rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Upload View */}
        {!isLoading && !analysisResult && (
          <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.03em' }} className="gradient-text">
                Elevate Your Photography
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
                Upload your photograph to get real-time constructive analysis on lighting, color balance, details, and composition, along with recommended edits.
              </p>
            </div>

            <form onSubmit={handleAnalyze} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Drag and Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
                style={{
                  height: '240px',
                  borderRadius: '12px',
                  border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: dragOver ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />

                {previewUrl ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
                    <img 
                      src={previewUrl} 
                      alt="Upload Preview" 
                      style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} 
                    />
                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                      Click to Change
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: 'var(--primary)', opacity: 0.8 }}>
                      <UploadCloud size={48} />
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '1.05rem', marginBottom: '4px' }}>Drag & drop your photograph here</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>PNG, JPG or WEBP (max 15MB)</p>
                    </div>
                    <button type="button" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem', marginTop: '4px' }}>
                      Browse Files
                    </button>
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }} htmlFor="email">
                  Your Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    id="email"
                    type="email" 
                    placeholder="learner@focalpoint.ai" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '48px' }}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>We'll use this email to associate your photography workspace.</span>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                disabled={!file}
              >
                <Sparkles size={18} />
                Analyze Photograph
              </button>
            </form>
          </div>
        )}

        {/* 2. Loading Scan View */}
        {isLoading && (
          <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '40px 0' }}>
            
            {/* Visual Pulse / Scanner Frame */}
            <div style={{ position: 'relative', width: '220px', height: '220px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(17, 22, 40, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 0 30px var(--border-glow)' }}>
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt="Scanning Preview" 
                  style={{ width: '90%', height: '90%', objectFit: 'contain', opacity: 0.5, borderRadius: '8px' }} 
                />
              )}
              <div className="scanner-line"></div>
              <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={44} className="pulse-text" style={{ color: 'var(--primary)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Analyzing Photograph Quality</h3>
              <div className="pulse-text" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', height: '24px', transition: 'var(--transition-smooth)' }}>
                {LOADING_STEPS[loadingStep]}
              </div>
            </div>
            
            {/* Simple progress dot track */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {LOADING_STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: idx <= loadingStep ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                    boxShadow: idx <= loadingStep ? '0 0 8px var(--primary)' : 'none',
                    transition: 'var(--transition-smooth)'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 3. Results View */}
        {!isLoading && analysisResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Upper Quick Summary Card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '4px' }}>Analysis Complete</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '4px' }}>Constructive Critique</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Workspace: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{analysisResult.email}</span> • Mode: <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{analysisResult.mode === 'gemini_ai' ? 'Gemini AI Engine' : 'Local Computer Vision'}</span>
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Overall Rating</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Based on 10 aspects</p>
                </div>
                <div className="rating-circle" style={{ border: `4px solid ${getScoreColor(analysisResult.overall_rating * 10)}` }}>
                  <span className="rating-circle-val">{analysisResult.overall_rating}</span>
                  <span className="rating-circle-max">/ 10</span>
                </div>
              </div>
            </div>

            {/* Split Dashboard Grid */}
            <div className="dashboard-grid">
              
              {/* Left Column - Image & Suggested Edits */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Image Showcase Card */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <img 
                      src={previewUrl} 
                      alt="Analyzed" 
                      style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                    />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{analysisResult.filename}</span>
                    <span>Evaluation Target</span>
                  </div>
                </div>

                {/* Suggested Edits Card */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sliders size={20} style={{ color: 'var(--secondary)' }} />
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Suggested Edits</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {analysisResult.suggested_edits && analysisResult.suggested_edits.length > 0 ? (
                      analysisResult.suggested_edits.map((edit, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            borderLeft: '3px solid var(--secondary)',
                            fontSize: '0.9rem',
                            lineHeight: '1.4',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0, marginTop: '2px' }}>
                            <Check size={12} style={{ color: 'var(--secondary)', margin: 'auto' }} />
                          </div>
                          <span style={{ color: 'var(--text-primary)' }}>{edit}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No specific edits suggested.</p>
                    )}
                  </div>
                </div>

                <button onClick={handleReset} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  <RefreshCw size={16} />
                  Analyze Another Photo
                </button>
              </div>

              {/* Right Column - Breakdown of Aspects */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Tabs for Category Selection */}
                <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', overflowX: 'auto' }}>
                  {[
                    { id: 'all', label: 'All Aspects' },
                    { id: 'light', label: 'Exposure & Light' },
                    { id: 'color', label: 'Color & Warmth' },
                    { id: 'details', label: 'Details & Crop' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === tab.id ? '600' : '500',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      {tab.id === 'all' ? '' : ''}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Aspect Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(analysisResult.aspects)
                    .filter(([key, data]) => {
                      if (activeTab === 'all') return true;
                      return aspectConfig[key]?.category === activeTab;
                    })
                    .map(([key, data]) => {
                      const cfg = aspectConfig[key] || { label: key, icon: Info };
                      const IconComponent = cfg.icon;
                      const color = getScoreColor(data.rating);
                      
                      return (
                        <div 
                          key={key} 
                          className="glass-panel" 
                          style={{ 
                            padding: '20px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '16px',
                            borderLeft: `4px solid ${color}`
                          }}
                        >
                          {/* Aspect Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ color: color, display: 'flex', alignItems: 'center' }}>
                                <IconComponent size={20} />
                              </div>
                              <h5 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, textTransform: 'capitalize' }}>
                                {cfg.label}
                              </h5>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                                Score:
                              </span>
                              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: color }}>
                                {data.rating}
                              </span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 100</span>
                            </div>
                          </div>

                          {/* Progress bar slider */}
                          <div className="progress-bar-container">
                            <div 
                              className="progress-bar-fill" 
                              style={{ 
                                width: `${data.rating}%`, 
                                backgroundColor: color,
                                boxShadow: `0 0 10px ${color}`
                              }}
                            />
                          </div>

                          {/* Feedback Breakdown */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '4px' }}>
                            
                            {/* What Works */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <CheckCircle size={16} className="text-success" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>What Works</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{data.what_works}</span>
                              </div>
                            </div>

                            {/* What could be improved */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <AlertCircle size={16} className="text-warning" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>What Could Be Done Better</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{data.what_could_be_improved}</span>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ marginTop: '48px', padding: '24px 0', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p>© 2026 FocalPointAI. Designed to provide constructive critique on brightness, contrast, highlights, shadows, crop, warmth, colour, saturation, and ambiance.</p>
      </footer>

    </div>
  );
}
