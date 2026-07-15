import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, UploadCloud, Mail, CheckCircle, AlertCircle, Sparkles, 
  RefreshCw, Sun, Contrast, Droplet, Eye, Thermometer, Info, 
  Moon, Palette, Compass, Check, Sliders, ShieldCheck
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

const LOADING_STEPS = [
  "Uploading photo & initiating secure connection...",
  "Analyzing exposure levels (brightness, contrast, highlights, shadows)...",
  "Evaluating color palette, saturation, and warmth...",
  "Scanning structural details and micro-sharpness...",
  "Calculating composition grids, symmetry, and crop lines..."
];

const DEMO_PRESETS = [
  {
    id: 'sunset',
    name: 'Beach Sunset',
    description: 'Moody low-light & high dynamic range',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    email: 'sunset.learner@focalpoint.ai'
  },
  {
    id: 'portrait',
    name: 'Studio Portrait',
    description: 'Soft lighting & high-detail face focus',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    email: 'portrait.learner@focalpoint.ai'
  },
  {
    id: 'neon',
    name: 'Cyberpunk Alley',
    description: 'Harsh contrast & heavy color saturation',
    url: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=800&q=80',
    email: 'neon.learner@focalpoint.ai'
  }
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
  
  // Redesign custom features state
  const [simulateEdits, setSimulateEdits] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState(null);

  const fileInputRef = useRef(null);
  const loadingIntervalRef = useRef(null);

  // Cycle loading steps
  useEffect(() => {
    if (isLoading) {
      setLoadingStep(0);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 1800);
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
    setSelectedDemoId(null);
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
      setSelectedDemoId(null);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const loadDemoPreset = async (preset) => {
    setLoadingDemo(true);
    setError('');
    setSelectedDemoId(preset.id);
    try {
      const response = await fetch(preset.url);
      if (!response.ok) throw new Error("Could not retrieve preset photo");
      const blob = await response.blob();
      const ext = preset.url.split('.').pop().split('?')[0] || 'jpg';
      const demoFile = new File([blob], `demo_${preset.id}.${ext}`, { type: blob.type });
      
      setFile(demoFile);
      setPreviewUrl(URL.createObjectURL(demoFile));
      setEmail(preset.email);
    } catch (err) {
      console.error(err);
      setError(`Failed to load preset photo: ${err.message}. Please upload your own instead.`);
      setSelectedDemoId(null);
    } finally {
      setLoadingDemo(false);
    }
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
    setSimulateEdits(false);

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
    setSelectedDemoId(null);
    setSimulateEdits(false);
  };

  // Aspect naming and icon mapping
  const aspectConfig = {
    brightness: { label: 'Exposure / Brightness', icon: Sun, category: 'light', minSweet: 40, maxSweet: 75 },
    contrast: { label: 'Tonal Contrast', icon: Contrast, category: 'light', minSweet: 45, maxSweet: 75 },
    highlights: { label: 'Highlights & Whites', icon: Sparkles, category: 'light', minSweet: 40, maxSweet: 75 },
    shadows: { label: 'Shadows & Blacks', icon: Moon, category: 'light', minSweet: 40, maxSweet: 75 },
    ambiance: { label: 'Ambiance / Tone Map', icon: Sliders, category: 'light', minSweet: 40, maxSweet: 75 },
    colour: { label: 'Colour Palette Harmony', icon: Palette, category: 'color', minSweet: 50, maxSweet: 80 },
    saturation: { label: 'Color Saturation', icon: Droplet, category: 'color', minSweet: 40, maxSweet: 70 },
    warmth: { label: 'Warmth / White Balance', icon: Thermometer, category: 'color', minSweet: 45, maxSweet: 75 },
    details: { label: 'Details & Micro-sharpness', icon: Eye, category: 'details', minSweet: 55, maxSweet: 85 },
    crop: { label: 'Composition & Grid Crop', icon: Compass, category: 'details', minSweet: 50, maxSweet: 80 }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  // Generate CSS filter settings based on image critique feedback
  const getSimulatedFilters = () => {
    if (!analysisResult) return {};
    let brightnessVal = 1;
    let contrastVal = 1;
    let saturateVal = 1;
    let sepiaVal = 0;
    let zoomVal = 1;
    let hueVal = 0;

    const aspects = analysisResult.aspects;

    if (aspects.brightness) {
      const r = aspects.brightness.rating;
      if (r < 75) {
        const text = (aspects.brightness.what_could_be_improved || '').toLowerCase();
        if (text.includes('underexposed') || text.includes('dark') || text.includes('boost') || text.includes('increase')) {
          brightnessVal = 1.25;
        } else if (text.includes('overexposed') || text.includes('bright') || text.includes('reduce') || text.includes('clip')) {
          brightnessVal = 0.82;
        }
      }
    }

    if (aspects.contrast) {
      const r = aspects.contrast.rating;
      if (r < 75) {
        const text = (aspects.contrast.what_could_be_improved || '').toLowerCase();
        if (text.includes('flat') || text.includes('increase') || text.includes('lacks') || text.includes('contrast')) {
          contrastVal = 1.22;
        } else if (text.includes('harsh') || text.includes('decrease') || text.includes('soften')) {
          contrastVal = 0.85;
        }
      }
    }

    if (aspects.saturation) {
      const r = aspects.saturation.rating;
      if (r < 75) {
        const text = (aspects.saturation.what_could_be_improved || '').toLowerCase();
        if (text.includes('lifeless') || text.includes('muted') || text.includes('increase') || text.includes('vibrance')) {
          saturateVal = 1.30;
        } else if (text.includes('oversaturated') || text.includes('reduce') || text.includes('intense')) {
          saturateVal = 0.78;
        }
      }
    }

    if (aspects.warmth) {
      const r = aspects.warmth.rating;
      if (r < 75) {
        const text = (aspects.warmth.what_could_be_improved || '').toLowerCase();
        if (text.includes('yellow') || text.includes('warm') || text.includes('orange') || text.includes('cast')) {
          hueVal = -10; // Cooler tone shift
        } else if (text.includes('cool') || text.includes('cold') || text.includes('blue')) {
          sepiaVal = 0.22; // Warmer tone addition
        }
      }
    }

    if (aspects.crop) {
      const r = aspects.crop.rating;
      if (r < 75) {
        zoomVal = 1.08; // Simulate dynamic cropping zoom
      }
    }

    return {
      filter: `brightness(${brightnessVal}) contrast(${contrastVal}) saturate(${saturateVal}) sepia(${sepiaVal}) hue-rotate(${hueVal}deg)`,
      transform: `scale(${zoomVal})`,
      transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
    };
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '24px', position: 'relative' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}>
            <Camera size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.03em', margin: 0 }}>
              Focalpoint<span className="gradient-text">.AI</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '500', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Photography Critique & Mentor</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            v2.0 Premium Redesign
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 5 }}>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger)', padding: '16px 20px', borderRadius: '16px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', fontSize: '0.95rem' }} className="fade-in">
            <AlertCircle size={22} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{error}</div>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px' }}>&times;</button>
          </div>
        )}

        {/* 1. Upload View */}
        {!isLoading && !analysisResult && (
          <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }} className="fade-in">
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.8rem', fontWeight: '900', marginBottom: '12px', letterSpacing: '-0.04em', lineHeight: '1.2' }}>
                Perfect Your Technique with <span className="gradient-text">Instant Critique</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6', maxWidth: '640px', margin: '0 auto' }}>
                Upload your photograph to get a complete technical audit on light, color balance, sharp details, and composition.
              </p>
            </div>

            {/* Demo Presets Sandbox */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Sparkles size={16} className="text-secondary" />
                No photo ready? Test with a Demo Image Sandbox:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {DEMO_PRESETS.map((preset) => (
                  <div 
                    key={preset.id}
                    onClick={() => loadDemoPreset(preset)}
                    className={`demo-preset-card ${selectedDemoId === preset.id ? 'active' : ''}`}
                    style={{ position: 'relative', height: '90px', display: 'flex', alignItems: 'center', padding: '8px' }}
                  >
                    <img src={preset.url} alt={preset.name} style={{ width: '74px', height: '74px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)', marginRight: '12px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '700', fontSize: '0.9rem', margin: 0, color: '#fff' }}>{preset.name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: '1.3' }}>{preset.description}</p>
                    </div>
                    {loadingDemo && selectedDemoId === preset.id && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={20} className="pulse-text" style={{ color: 'var(--primary)', animation: 'spin 2s linear infinite' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAnalyze} className="glass-panel" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Drag and Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
                style={{
                  height: '260px',
                  borderRadius: '16px',
                  border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: dragOver ? 'rgba(99, 102, 241, 0.04)' : 'rgba(255, 255, 255, 0.01)',
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
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <img 
                      src={previewUrl} 
                      alt="Upload Preview" 
                      style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }} 
                    />
                    <div style={{ position: 'absolute', bottom: '16px', right: '16px', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--border-color)', fontWeight: '600', color: '#fff' }}>
                      Click to Change
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '4px' }}>
                      <UploadCloud size={32} />
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '1.1rem', color: '#fff', marginBottom: '4px' }}>Drag & drop your photograph here</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Supports PNG, JPG, WEBP formats (max 15MB)</p>
                    </div>
                    <button type="button" className="btn-secondary" style={{ padding: '10px 22px', fontSize: '0.88rem', marginTop: '6px' }}>
                      Browse Files
                    </button>
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }} htmlFor="email">
                  <Mail size={16} className="text-secondary" />
                  Your Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    id="email"
                    type="email" 
                    placeholder="photographer@focalpoint.ai" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>We use your email to tie your analysis critiques together.</span>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.05rem', marginTop: '4px' }}
                disabled={!file}
              >
                <Sparkles size={20} />
                Analyze Photograph
              </button>
            </form>
          </div>
        )}

        {/* 2. Loading Scan View */}
        {isLoading && (
          <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '36px', padding: '40px 0' }} className="fade-in">
            
            {/* Visual Pulse / Scanner Frame */}
            <div className="scanner-container" style={{ position: 'relative', width: '260px', height: '260px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'rgba(10, 14, 28, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 0 50px var(--border-color-glow)', backdropFilter: 'blur(10px)' }}>
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt="Scanning Preview" 
                  style={{ width: '92%', height: '92%', objectFit: 'contain', opacity: 0.45, borderRadius: '16px' }} 
                />
              )}
              {/* Focus Corner HUD overlays */}
              <div className="focal-sights">
                <div className="focal-sights-corner-tr"></div>
                <div className="focal-sights-corner-bl"></div>
                <div className="focal-sights-corner-br"></div>
              </div>
              
              <div className="scanner-line"></div>
              
              <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={34} className="pulse-text" style={{ color: 'var(--primary)' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>Analyzing Quality & Composition</h3>
              <div className="pulse-text" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', height: '24px', fontWeight: '500' }}>
                {LOADING_STEPS[loadingStep]}
              </div>
            </div>
            
            {/* Simple progress dot track */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {LOADING_STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: idx <= loadingStep ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                    boxShadow: idx <= loadingStep ? '0 0 10px var(--primary)' : 'none',
                    transition: 'var(--transition-smooth)'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 3. Results View */}
        {!isLoading && analysisResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="fade-in">
            
            {/* Redesigned Upper Summary Panel with SVG radial gauge */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '28px' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', tracking: '0.08em', display: 'inline-block', marginBottom: '6px', border: '1px solid var(--primary-glow)', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(99, 102, 241, 0.05)' }}>Analysis Complete</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '6px', letterSpacing: '-0.02em', color: '#fff' }}>Constructive Critique Dashboard</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  Workspace: <span style={{ fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: '600' }}>{analysisResult.email}</span> 
                  • Engine: <span style={{ color: 'var(--secondary)', fontWeight: '700' }}>{analysisResult.mode === 'gemini_ai' ? 'Gemini 3.5 Pro AI Engine' : 'Local OpenCV Core'}</span>
                </p>
              </div>

              {/* Radial Rating Circular SVG */}
              <div className="radial-score-container">
                <svg className="radial-score-svg">
                  <circle className="radial-score-bg" cx="65" cy="65" r="50"></circle>
                  <circle 
                    className="radial-score-fill" 
                    cx="65" 
                    cy="65" 
                    r="50"
                    stroke={getScoreColor(analysisResult.overall_rating * 10)}
                    strokeDasharray="314.16"
                    strokeDashoffset={314.16 - ((analysisResult.overall_rating) / 10.0) * 314.16}
                  ></circle>
                </svg>
                <div className="radial-score-content">
                  <span className="radial-score-value">{analysisResult.overall_rating}</span>
                  <span className="radial-score-label">rating</span>
                </div>
              </div>
            </div>

            {/* Email Config Alert Banner */}
            <div 
              className={`alert-banner ${
                analysisResult.email_status === 'sent' ? 'alert-banner-success' : 'alert-banner-warning'
              }`}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                backgroundColor: analysisResult.email_status === 'sent' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: analysisResult.email_status === 'sent' ? 'var(--success)' : 'var(--warning)',
                flexShrink: 0
              }}>
                <Mail size={22} />
              </div>
              <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.5' }}>
                {analysisResult.email_status === 'sent' ? (
                  <>
                    <strong style={{ color: '#FFFFFF', display: 'block', fontSize: '0.98rem', marginBottom: '2px' }}>Live SMTP Report Dispatched</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      A premium, styled HTML analysis report has been sent to your active inbox at <span style={{ color: '#fff', fontWeight: '600' }}>{analysisResult.email}</span>. Please check your spam folder if it doesn't arrive within 1 minute.
                    </span>
                  </>
                ) : (
                  <>
                    <strong style={{ color: '#FFFFFF', display: 'block', fontSize: '0.98rem', marginBottom: '2px' }}>SMTP Simulation Mode Active</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      The email critique report was saved as a simulated file because SMTP settings are offline. 
                      To receive live critiques directly in your inbox, set environment variables (`SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`) inside the <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--secondary)', fontWeight: '600' }}>backend/.env</span> file.
                    </span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-mono)', display: 'inline-block' }}>
                      Mock HTML output written to: <span style={{ color: '#fff' }}>backend/email_simulation.html</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Split Dashboard Grid */}
            <div className="dashboard-grid">
              
              {/* Left Column - Image controls & Suggested Edits */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Image Showcase Card with CSS filter simulation */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Aspect Ratio Box holding the image */}
                  <div style={{ 
                    position: 'relative',
                    borderRadius: '12px', 
                    overflow: 'hidden', 
                    background: '#020306', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    minHeight: '260px',
                    maxHeight: '420px'
                  }}>
                    <img 
                      src={previewUrl} 
                      alt="Critiqued Photograph" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '420px', 
                        objectFit: 'contain',
                        ...(simulateEdits ? getSimulatedFilters() : { transition: 'all 0.5s ease' })
                      }} 
                    />

                    {/* Simulated edits status badge overlay */}
                    {simulateEdits && (
                      <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(16, 185, 129, 0.85)', color: '#fff', fontSize: '0.72rem', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 10 }}>
                        <Sparkles size={12} />
                        Edits Applied
                      </div>
                    )}
                  </div>

                  {/* Metadata display */}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{file?.name || 'critique_image.jpg'}</span>
                    <span>Composition & Edits Sandbox</span>
                  </div>

                  {/* Interactive Simulation Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#fff' }}>Simulate Recommended Edits</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Preview tone and crops based on critique scores</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSimulateEdits(!simulateEdits)}
                      style={{
                        width: '50px',
                        height: '26px',
                        borderRadius: '15px',
                        backgroundColor: simulateEdits ? 'var(--success)' : 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        position: 'absolute',
                        top: '2px',
                        left: simulateEdits ? '26px' : '2px',
                        transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }} />
                    </button>
                  </div>
                </div>

                {/* Suggested Edits Panel */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sliders size={20} className="text-secondary" />
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', margin: 0 }}>Actionable Presets & Edits</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analysisResult.suggested_edits && analysisResult.suggested_edits.length > 0 ? (
                      analysisResult.suggested_edits.map((edit, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '12px 14px',
                            background: 'rgba(255,255,255,0.015)',
                            borderRadius: '10px',
                            borderLeft: '4px solid var(--secondary)',
                            fontSize: '0.88rem',
                            lineHeight: '1.4',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                            <Check size={12} style={{ color: 'var(--secondary)', margin: 'auto' }} />
                          </div>
                          <span style={{ color: 'var(--text-primary)' }}>{edit}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No specific slider tweaks suggested for this photo.</p>
                    )}
                  </div>
                </div>

                {/* Reset button */}
                <button onClick={handleReset} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                  <RefreshCw size={16} />
                  Analyze Another Photo
                </button>
              </div>

              {/* Right Column - Detailed breakdown and sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Tabs for Category Selection */}
                <div style={{ display: 'flex', gap: '6px', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', overflowX: 'auto' }}>
                  {[
                    { id: 'all', label: 'All Audits' },
                    { id: 'light', label: 'Light & Exposure' },
                    { id: 'color', label: 'Color & Hue' },
                    { id: 'details', label: 'Details & Composition' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                        fontWeight: activeTab === tab.id ? '700' : '500',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Aspect Cards List styled as adjustment dials */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(analysisResult.aspects)
                    .filter(([key]) => {
                      if (activeTab === 'all') return true;
                      return aspectConfig[key]?.category === activeTab;
                    })
                    .map(([key, data]) => {
                      const cfg = aspectConfig[key] || { label: key, icon: Info, minSweet: 40, maxSweet: 75 };
                      const IconComponent = cfg.icon;
                      const color = getScoreColor(data.rating);
                      
                      return (
                        <div 
                          key={key} 
                          className="glass-panel aspect-card" 
                          style={{ 
                            padding: '22px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '16px',
                            borderLeft: `4px solid ${color}`
                          }}
                        >
                          {/* Aspect Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ color: color, display: 'flex', alignItems: 'center', width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center' }}>
                                <IconComponent size={18} />
                              </div>
                              <h5 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: '#fff' }}>
                                {cfg.label}
                              </h5>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: color, fontFamily: 'var(--font-mono)' }}>
                                {data.rating}
                              </span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 100</span>
                            </div>
                          </div>

                          {/* Lightroom Style slider track */}
                          <div className="metric-slider-wrapper">
                            <div className="metric-slider-track">
                              {/* Optimal Target Sweet Spot Overlay */}
                              <div 
                                className="metric-slider-target"
                                style={{
                                  left: `${cfg.minSweet}%`,
                                  width: `${cfg.maxSweet - cfg.minSweet}%`
                                }}
                              />
                              {/* Glowing track filling up to value */}
                              <div 
                                className="metric-slider-fill"
                                style={{
                                  width: `${data.rating}%`,
                                  backgroundColor: color,
                                  boxShadow: `0 0 10px ${color}`
                                }}
                              />
                              {/* Slider thumb */}
                              <div 
                                className="metric-slider-thumb"
                                style={{
                                  left: `${data.rating}%`,
                                  color: color
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                              <span>Under</span>
                              <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Target Range ({cfg.minSweet}% - {cfg.maxSweet}%)</span>
                              <span>Over</span>
                            </div>
                          </div>

                          {/* Advice layout (Success/Works & Advice/Improved) */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '14px' }}>
                            
                            {/* What Works */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div style={{ color: 'var(--success)', marginTop: '2px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                                <CheckCircle size={14} />
                              </div>
                              <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                <span style={{ fontWeight: '700', color: 'var(--success)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>What Works</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{data.what_works}</span>
                              </div>
                            </div>

                            {/* What could be improved */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div style={{ color: 'var(--warning)', marginTop: '2px', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                                <AlertCircle size={14} />
                              </div>
                              <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                <span style={{ fontWeight: '700', color: 'var(--warning)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>Areas For Improvement</span>
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
      <footer style={{ marginTop: '48px', padding: '24px 0', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', zIndex: 10 }}>
        <p style={{ marginBottom: '6px' }}>© 2026 FocalpointAI. Designed as a real-time photography mentor for aperture, shadows, details, crops, and color composition.</p>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
          Local computer vision fallbacks fully active.
        </p>
      </footer>

    </div>
  );
}
