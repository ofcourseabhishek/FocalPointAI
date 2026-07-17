import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, UploadCloud, Mail, CheckCircle, AlertCircle, Sparkles, 
  RefreshCw, Sun, Contrast, Droplet, Eye, Thermometer, Info, 
  Moon, Palette, Compass, Check, Sliders, ShieldCheck, Target, Cpu, AlertTriangle
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
const SHOW_LEGACY_SCANNER = Boolean(import.meta.env.VITE_SHOW_LEGACY_SCANNER);
const SHOW_LEGACY_RESULTS = false;

const LOADING_STEPS = [
  "Reading image metadata",
  "Detecting subject",
  "Evaluating composition",
  "Measuring exposure",
  "Checking focus",
  "Detecting lighting direction",
  "Measuring color harmony",
  "Generating professional critique"
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
  const [loadingStep, setLoadingStep] = useState(-1);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedAspect, setExpandedAspect] = useState(null);
  const [showGuides, setShowGuides] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState(null);
  
  // Redesign custom features state
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState(null);
  const [copiedColor, setCopiedColor] = useState('');
  
  const imgRef = useRef(null);

  const copyColorToClipboard = (hex) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(''), 1500);
  };

  useEffect(() => () => {
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
  }, []);

  // Quotes states
  const [quotesList, setQuotesList] = useState([
    { quote: "What i like about photographs is that they capture a moment that’s gone forever, impossible to reproduce.", author: "Karl Lagerfeld" },
    { quote: "A picture is a secret about a secret, the more it tells you the less you know", author: "Diane Arbus" },
    { quote: "Taking pictures is savoring life intensely, every hundredth of a second.", author: "Marc Riboud" },
    { quote: "You don't take a photograph, you make it.", author: "Ansel Adams" },
    { quote: "The camera is an instrument that teaches people how to see without a camera.", author: "Dorothea Lange" },
    { quote: "A good snapshot keeps a moment from running away.", author: "Eudora Welty" },
    { quote: "The Earth is Art, The Photographer is only a Witness", author: "Yann Arthus-Bertrand" },
    { quote: "There are no rules for good photographs, there are only good photographs.", author: "Ansel Adams" },
    { quote: "There is nothing worse than a sharp image of a fuzzy concept.", author: "Ansel Adams" },
    { quote: "Photography is a reality so subtle that it becomes more real than reality", author: "Alfred Stieglitz" }
  ]);
  const [currentQuote, setCurrentQuote] = useState(null);

  const fileInputRef = useRef(null);
  const loadingIntervalRef = useRef(null);
  const uploadIntervalRef = useRef(null);

  // Load quotes CSV on mount
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await fetch('/quotes/qoutes.csv');
        if (!response.ok) return;
        const text = await response.text();
        
        // Custom CSV parser
        const lines = text.split('\n');
        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          let quote = '';
          let author = '';
          
          if (line.includes('"""')) {
            const parts = line.split('""",');
            if (parts.length >= 2) {
              quote = parts[0].replace(/^"""|"""$/g, '').trim();
              author = parts[1].trim();
            }
          } else if (line.startsWith('"')) {
            const lastQuoteIdx = line.lastIndexOf('"');
            quote = line.substring(1, lastQuoteIdx).trim();
            author = line.substring(lastQuoteIdx + 1).replace(/^,/, '').trim();
          } else {
            const lastComma = line.lastIndexOf(',');
            quote = line.substring(0, lastComma).trim();
            author = line.substring(lastComma + 1).trim();
          }
          
          if (quote && author) {
            parsed.push({ quote, author });
          }
        }
        if (parsed.length > 0) {
          setQuotesList(parsed);
        }
      } catch (e) {
        console.error("Failed to fetch quotes CSV", e);
      }
    };
    fetchQuotes();
  }, []);

  // Cycle loading steps
  useEffect(() => {
    if (isLoading) {
      setLoadingStep(-1);
      setAnalysisProgress(4);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingStep((prev) => {
          const next = Math.min(prev + 1, LOADING_STEPS.length - 1);
          setAnalysisProgress(Math.min(92, 8 + ((next + 1) / LOADING_STEPS.length) * 84));
          return next;
        });
      }, 500);
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
    if (uploadState === 'idle' || uploadState === 'ready' || uploadState === 'error') setUploadState('dragging');
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOver(false);
    if (uploadState === 'dragging') setUploadState(file ? 'ready' : 'idle');
  };

  const formatFileSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const readImageDimensions = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('The image could not be read.'));
    image.src = url;
  });

  const processUploadFile = async (nextFile, demoId = null) => {
    setSelectedDemoId(demoId);
    setUploadError(null);
    setUploadProgress(0);
    setUploadState('validating');
    await new Promise((resolve) => setTimeout(resolve, 300));

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(nextFile.type)) {
      setFile(null);
      setPreviewUrl('');
      setUploadError({ type: 'unsupported', title: 'Unsupported file', message: 'Please upload JPG, PNG or WEBP.' });
      setUploadState('error');
      return;
    }
    if (nextFile.size > 15 * 1024 * 1024) {
      setFile(null);
      setPreviewUrl('');
      setUploadError({ type: 'large', title: 'File exceeds 15 MB', current: formatFileSize(nextFile.size) });
      setUploadState('error');
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    try {
      const dimensions = await readImageDimensions(objectUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(nextFile);
      setPreviewUrl(objectUrl);
      setFileMetadata({ ...dimensions, camera: 'Not available', size: formatFileSize(nextFile.size) });
      setUploadState('uploading');
      await new Promise((resolve) => {
        let progress = 0;
        uploadIntervalRef.current = setInterval(() => {
          progress = Math.min(progress + 8, 100);
          setUploadProgress(progress);
          if (progress === 100) {
            clearInterval(uploadIntervalRef.current);
            resolve();
          }
        }, 70);
      });
      setUploadState('ready');
    } catch {
      URL.revokeObjectURL(objectUrl);
      setFile(null);
      setPreviewUrl('');
      setUploadError({ type: 'unreadable', title: 'Unreadable image', message: 'The file appears damaged or incomplete. Please try another image.' });
      setUploadState('error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setSelectedDemoId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setError('');
      processUploadFile(e.target.files[0]);
      e.target.value = '';
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
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const demoFile = new File([blob], `demo_${preset.id}.${ext}`, { type: blob.type });
      
      setEmail(preset.email);
      await processUploadFile(demoFile, preset.id);
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

    // Shuffle and select a quote for the loading screen
    const randomIdx = Math.floor(Math.random() * quotesList.length);
    setCurrentQuote(quotesList[randomIdx]);

    setIsLoading(true);
    setUploadState('analyzing');
    setAnalysisResult(null);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', email);

    try {
      const analysisStartedAt = Date.now();
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze the photo.');
      }

      const result = await response.json();
      const remainingAnimationTime = Math.max(0, 4500 - (Date.now() - analysisStartedAt));
      if (remainingAnimationTime) await new Promise((resolve) => setTimeout(resolve, remainingAnimationTime));
      setLoadingStep(LOADING_STEPS.length - 1);
      setAnalysisProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 350));
      setAnalysisResult(result);

    } catch (err) {
      setError(err.message || 'Something went wrong. Please check that the backend is running.');
      setUploadState('ready');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl('');
    setAnalysisResult(null);
    setError('');
    setActiveTab('overview');
    setExpandedAspect(null);
    setActiveHotspot(null);
    setSelectedDemoId(null);
    setUploadState('idle');
    setUploadProgress(0);
    setUploadError(null);
    setFileMetadata(null);
  };

  // Sub-aspect naming, icons, and sweet spots
  const subAspectConfig = {
    composition: { label: 'Composition Rules', icon: Compass, minSweet: 50, maxSweet: 80 },
    crop: { label: 'Grid & Crop', icon: Sliders, minSweet: 50, maxSweet: 80 },
    angle_and_viewpoint: { label: 'Angle & Viewpoint', icon: Camera, minSweet: 40, maxSweet: 75 },
    horizon: { label: 'Horizon Alignment', icon: Target, minSweet: 90, maxSweet: 100 },
    thirds: { label: 'Rule of Thirds Alignment', icon: Compass, minSweet: 70, maxSweet: 100 },

    brightness: { label: 'Exposure / Brightness', icon: Sun, minSweet: 40, maxSweet: 75 },
    contrast: { label: 'Tonal Contrast', icon: Contrast, minSweet: 45, maxSweet: 75 },
    highlights: { label: 'Highlights & Whites', icon: Sparkles, minSweet: 40, maxSweet: 75 },
    shadows: { label: 'Shadows & Blacks', icon: Moon, minSweet: 40, maxSweet: 75 },
    ambiance: { label: 'Ambiance / Tone Map', icon: Sliders, minSweet: 40, maxSweet: 75 },

    details: { label: 'Details & Micro-sharpness', icon: Eye, minSweet: 55, maxSweet: 85 },
    sharpness: { label: 'Edge Definition', icon: Cpu, minSweet: 60, maxSweet: 90 },

    colour: { label: 'Colour Palette Harmony', icon: Palette, minSweet: 50, maxSweet: 80 },
    saturation: { label: 'Color Saturation', icon: Droplet, minSweet: 40, maxSweet: 70 },
    warmth: { label: 'Warmth / White Balance', icon: Thermometer, minSweet: 45, maxSweet: 75 },

    wow_factor: { label: 'Wow Factor & Engagement', icon: Sparkles, minSweet: 50, maxSweet: 85 },
    emotional_impact: { label: 'Emotional Impact', icon: Target, minSweet: 45, maxSweet: 80 },
    intention: { label: 'Photographic Intent', icon: Target, minSweet: 70, maxSweet: 100 },

    edits_needed: { label: 'Slider Adjustments Needed', icon: Sliders, minSweet: 70, maxSweet: 100 },
    exif_settings: { label: 'Camera Settings Audit', icon: ShieldCheck, minSweet: 80, maxSweet: 100 }
  };

  const getMajorParams = (result) => {
    if (!result) return [];

    const aspects = result.aspects || {};
    const exif = result.exif_analysis || {};
    const edits = result.suggested_edits || [];

    // Helper: get plain text from either flat-string or {key, text} edit
    const editText = (e) => (e && typeof e === 'object' ? e.text : e) || '';

    // Build a lookup map: aspect key → edit text (from keyed edits only)
    const editsByKey = {};
    edits.forEach(e => {
      if (e && typeof e === 'object' && e.key) {
        editsByKey[e.key] = e.text;
      }
    });

    // Store the edit as a separate hint field — keeps what_could_be_improved clean
    // so it never bleeds into the overall category review aggregation
    const withEdit = (sub) => {
      const edit = editsByKey[sub.key];
      if (edit) {
        return { ...sub, suggested_edit_hint: edit };
      }
      return sub;
    };

    const getAspectData = (key, defaultLabel) => {
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        if (aspects[parent] && aspects[parent][child]) {
          return {
            rating: aspects[parent][child].rating,
            what_works: aspects[parent][child].what_works,
            what_could_be_improved: aspects[parent][child].what_could_be_improved,
            label: defaultLabel
          };
        }
      }
      if (aspects[key]) {
        return {
          rating: aspects[key].rating,
          what_works: aspects[key].what_works,
          what_could_be_improved: aspects[key].what_could_be_improved,
          label: defaultLabel
        };
      }
      return null;
    };

    // 1. Composition
    const compSub = [];
    const rawComp = getAspectData('composition', 'Composition Rules');
    if (rawComp) compSub.push(withEdit({ ...rawComp, key: 'composition' }));
    const rawCrop = getAspectData('crop', 'Grid & Crop');
    if (rawCrop) compSub.push(withEdit({ ...rawCrop, key: 'crop' }));
    const rawAngle = getAspectData('feel.angle_and_viewpoint', 'Angle & Viewpoint');
    if (rawAngle) compSub.push(withEdit({ ...rawAngle, key: 'angle_and_viewpoint' }));

    if (result.advanced_cv) {
      const cv = result.advanced_cv;
      if (cv.horizon) {
        compSub.push(withEdit({
          key: 'horizon',
          label: 'Horizon Alignment',
          rating: cv.horizon.is_level ? 95 : Math.max(40, Math.round(90 - Math.abs(cv.horizon.angle || 0) * 5)),
          what_works: cv.horizon.is_level ? "Horizon is perfectly level, ensuring a balanced frame." : `Horizon is aligned at ${cv.horizon.angle || 0} degrees.`,
          what_could_be_improved: cv.horizon.is_level ? "No alignment adjustment needed." : "Rotate the image slightly to level the horizon line."
        }));
      }
      const thirdsScore = Number(cv.composition?.rule_of_thirds?.score);
      if (Number.isFinite(thirdsScore)) {
        const normalizedThirdsScore = Math.max(0, Math.min(100, Math.round(thirdsScore)));
        const isThirds = normalizedThirdsScore >= 70;
        compSub.push(withEdit({
          key: 'thirds',
          label: 'Rule of Thirds Alignment',
          rating: normalizedThirdsScore,
          what_works: isThirds ? "Subject placement aligns beautifully with the Rule of Thirds intersections." : "Centering creates a stable and classic focal point.",
          what_could_be_improved: isThirds ? "Keep this off-center composition." : "Consider cropping slightly to place the main subject elements on a vertical third line."
        }));
      }
    }

    // 2. Lighting & Exposure
    const lightSub = [];
    ['brightness', 'contrast', 'highlights', 'shadows', 'ambiance'].forEach(k => {
      const data = getAspectData(k, k === 'brightness' ? 'Exposure / Brightness' : 
                                 k === 'contrast' ? 'Tonal Contrast' : 
                                 k === 'highlights' ? 'Highlights & Whites' : 
                                 k === 'shadows' ? 'Shadows & Blacks' : 'Ambiance / Tone Map');
      if (data) lightSub.push(withEdit({ ...data, key: k }));
    });

    // 3. Focus & Sharpness
    const focusSub = [];
    const rawDetails = getAspectData('details', 'Details & Micro-sharpness');
    if (rawDetails) focusSub.push(withEdit({ ...rawDetails, key: 'details' }));
    
    if (result.advanced_cv?.sharpness) {
      const s = result.advanced_cv.sharpness;
      focusSub.push(withEdit({
        key: 'sharpness',
        label: 'Edge Definition',
        rating: Math.round(s.score || 75),
        what_works: s.score >= 70 ? "Edges are crisp and clear in the subject focus regions." : "Soft details create a gentle transition.",
        what_could_be_improved: s.score >= 70 ? "Focus looks solid." : "Increase details sharpness or verify focus lock on subject."
      }));
    }

    // 4. Color & Tones
    const colorSub = [];
    ['colour', 'saturation', 'warmth'].forEach(k => {
      const data = getAspectData(k, k === 'colour' ? 'Colour Palette Harmony' : 
                                 k === 'saturation' ? 'Color Saturation' : 'Warmth / White Balance');
      if (data) colorSub.push(withEdit({ ...data, key: k }));
    });

    // 5. Subject & Story
    const subjectSub = [];
    const rawWow = getAspectData('feel.wow_factor', 'Wow Factor & Engagement');
    if (rawWow) subjectSub.push(withEdit({ ...rawWow, key: 'wow_factor' }));
    const rawEmo = getAspectData('feel.emotional_impact', 'Emotional Impact');
    if (rawEmo) subjectSub.push(withEdit({ ...rawEmo, key: 'emotional_impact' }));

    // 6. Post-Processing
    const postSub = [];
    let postScore = 100;
    if (edits.length > 0) postScore -= edits.length * 6;
    if (exif && exif.diagnostics) {
      const status = exif.diagnostics.status;
      if (status === 'warning') postScore -= 15;
      else if (status === 'critical') postScore -= 30;
    }
    postScore = Math.max(30, Math.min(100, postScore));
    const editTextList = edits.map(editText).filter(Boolean);

    // Build narrative prose for the post-processing overall review card
    const noEditsNeeded = editTextList.length === 0;

    const postWhatWorks = noEditsNeeded
      ? "The image is technically well-processed straight out of camera. Exposure, colour balance, contrast and sharpness are all sitting in a solid range — minimal post-production intervention is needed to make it print-ready."
      : editTextList.length <= 3
        ? "The overall look is clean and relatively well-processed. Only minor refinements are suggested, and the core tonal and colour qualities already serve the image well."
        : "Despite the number of suggested tweaks, the image has a solid foundation to work from — the scene is readable and the tones are within recoverable range for post-processing.";

    const postWhatCouldBeImproved = noEditsNeeded
      ? "No specific post-processing adjustments are flagged. Consider experimenting with subtle creative grading — a slight lift in shadows, a gentle vignette, or a controlled colour grade — to elevate the mood."
      : `To really elevate this image, consider making targeted post-processing adjustments. ${editTextList.slice(0, 3).join(' ')}${editTextList.length > 3 ? ` Additionally: ${editTextList.slice(3).join(' ')}` : ''}`;

    postSub.push({
      key: 'edits_needed',
      label: 'Post-Processing Assessment',
      rating: postScore,
      what_works: postWhatWorks,
      what_could_be_improved: postWhatCouldBeImproved
    });

    if (exif && exif.diagnostics) {
      const diag = exif.diagnostics;
      postSub.push({
        key: 'exif_settings',
        label: 'Camera Settings Audit',
        rating: diag.status === 'ok' ? 95 : diag.status === 'warning' ? 70 : 45,
        what_works: diag.status === 'ok' ? "Optimal camera settings selected for this photography style." : "Exposure is acceptable.",
        what_could_be_improved: diag.issue ? `${diag.issue}. Suggestion: ${diag.suggestion}` : "Verify camera parameters."
      });
    }

    const params = [
      { id: 'composition', label: 'Composition', subAspects: compSub },
      { id: 'lighting', label: 'Lighting & Exposure', subAspects: lightSub },
      { id: 'focus', label: 'Focus & Sharpness', subAspects: focusSub },
      { id: 'color', label: 'Color & Tones', subAspects: colorSub },
      { id: 'subject', label: 'Subject & Story', subAspects: subjectSub },
      { id: 'post-processing', label: 'Post-Processing', subAspects: postSub }
    ];

    params.forEach(p => {
      const validRatings = p.subAspects.filter(s => typeof s.rating === 'number' && !isNaN(s.rating));
      const avgRating = validRatings.length > 0 
        ? Math.round(validRatings.reduce((sum, s) => sum + s.rating, 0) / validRatings.length)
        : 70;
      p.rating = avgRating;

      const worksList = p.subAspects
        .filter(s => s.what_works && s.what_works.trim().length > 3)
        .map(s => s.what_works);
      p.what_works = worksList.length > 0 
        ? worksList.join(' ')
        : "The overall technical elements in this aspect are stable and serve the image well.";

      const impList = p.subAspects
        .filter(s => s.what_could_be_improved && s.what_could_be_improved.trim().length > 3 && !s.what_could_be_improved.includes("No alignment adjustment") && !s.what_could_be_improved.includes("No urgent edits"))
        .map(s => s.what_could_be_improved);
      p.what_could_be_improved = impList.length > 0 
        ? impList.join(' ')
        : "No major improvements needed. The aspect is well executed.";
    });

    return params;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getScoreLabel = (score) => {
    if (score >= 88) return 'Excellent';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Developing';
    return 'Needs work';
  };

  const learningByTab = {
    composition: [
      { title: 'Stronger framing in 5 minutes', meta: '5 min · Composition' },
      { title: 'Using negative space with intent', meta: '7 min · Visual balance' },
    ],
    lighting: [
      { title: 'Reading highlights and shadows', meta: '6 min · Exposure' },
      { title: 'Shape a subject with natural light', meta: '8 min · Lighting' },
    ],
    focus: [
      { title: 'Choose the right focus point', meta: '4 min · Sharpness' },
      { title: 'Control depth of field', meta: '7 min · Technique' },
    ],
    color: [
      { title: 'Build a coherent color palette', meta: '6 min · Color' },
      { title: 'Correct white balance by eye', meta: '5 min · Editing' },
    ],
    subject: [
      { title: 'Create clearer visual stories', meta: '8 min · Storytelling' },
      { title: 'Direct attention inside the frame', meta: '5 min · Subject' },
    ],
    'post-processing': [
      { title: 'A clean five-step edit', meta: '9 min · Workflow' },
      { title: 'Edit without over-processing', meta: '6 min · Restraint' },
    ],
  };



  return (
    <div className={`app-shell ${dragOver ? 'is-dragging' : ''} ${analysisResult ? 'results-active' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', maxWidth: '1480px', margin: '0 auto', padding: '24px', position: 'relative' }}>
      
      {/* Header */}
      <header className="site-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px', zIndex: 10 }}>
        <div className="site-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-mark" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}>
            <Camera size={22} color="#fff" />
          </div>
          <div className="brand-copy">
            <h1 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.03em', margin: 0 }}>
              Focalpoint<span className="gradient-text">.AI</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text)', opacity: 0.6, fontWeight: '400', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Photography Critique & Mentor</p>
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
          <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }} className="fade-in upload-view">
            <div className="hero-copy" style={{ textAlign: 'center' }}>
              <h2 className="hero-title">
                Perfect Your<br />
                <span className="gradient-text">Photography</span>
              </h2>
              <p className="hero-subtitle" style={{ color: 'var(--text-muted)', fontSize: '1.25rem', lineHeight: '1.6', maxWidth: '600px', margin: '24px auto 0' }}>
                Instant AI critique that helps you improve your light, color balance, sharpness, and composition.
              </p>
            </div>

            {/* Demo Presets Sandbox */}
            <div className="demo-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Sparkles size={16} className="text-secondary" />
                No photo ready? Test with a Demo Image Sandbox:
              </p>
              <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {DEMO_PRESETS.map((preset) => (
                  <div 
                    key={preset.id}
                    onClick={() => loadDemoPreset(preset)}
                    className={`demo-preset-card ${selectedDemoId === preset.id ? 'active' : ''}`}
                    style={{ position: 'relative', height: '100px', display: 'flex', alignItems: 'center', padding: '16px' }}
                  >
                    <img src={preset.url} alt={preset.name} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)', marginRight: '16px', flexShrink: 0 }} />
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

            <form
              onSubmit={handleAnalyze}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`glass-panel upload-card upload-state-${uploadState}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                aria-label="Choose a photograph to analyze"
                style={{ display: 'none' }}
              />

              {uploadState === 'idle' && (
                <div className="upload-state-view upload-idle" onClick={handleBrowseClick}>
                  <div className="upload-icon"><UploadCloud size={48} /></div>
                  <div className="upload-copy">
                    <h3>Drag &amp; Drop Your Photograph</h3>
                    <p>Supports JPG, PNG, WEBP</p>
                    <p>Maximum file size: 15 MB</p>
                  </div>
                  <div className="upload-or"><span>OR</span></div>
                  <button type="button" className="btn-secondary browse-button" onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }}>
                    Browse Files
                  </button>
                </div>
              )}

              {uploadState === 'dragging' && (
                <div className="upload-state-view upload-dragging">
                  <div className="drop-arrow">↓</div>
                  <h3>Drop your image here</h3>
                  <p>Release to upload</p>
                </div>
              )}

              {uploadState === 'validating' && (
                <div className="upload-state-view upload-validating">
                  <h3>Checking image...</h3>
                  <div className="validation-blocks" aria-label="Validating image">
                    {Array.from({ length: 10 }).map((_, index) => <span key={index} />)}
                  </div>
                  <div className="validation-list">
                    <span>Extension</span><span>File size</span><span>Readable image</span><span>Metadata</span>
                  </div>
                </div>
              )}

              {uploadState === 'uploading' && (
                <div className="upload-state-view upload-progress-view">
                  <h3>Uploading</h3>
                  <div className="upload-progress-track"><span style={{ width: `${uploadProgress}%` }} /></div>
                  <strong className="upload-percentage">{uploadProgress}%</strong>
                  <p className="upload-file-name">{file?.name}</p>
                  <p>{file ? formatFileSize(file.size) : ''}</p>
                </div>
              )}

              {uploadState === 'ready' && previewUrl && (
                <div className="upload-state-view upload-ready">
                  <div className="ready-preview"><img src={previewUrl} alt="Upload preview" /></div>
                  <div className="ready-details">
                    <div><span>File</span><strong>{file?.name}</strong></div>
                    <div><span>Dimensions</span><strong>{fileMetadata?.width}×{fileMetadata?.height}</strong></div>
                    <div><span>Camera</span><strong>{fileMetadata?.camera}</strong></div>
                    <div><span>Size</span><strong>{fileMetadata?.size}</strong></div>
                  </div>
                  <div className="ready-status"><CheckCircle size={20} /> Ready for Analysis</div>

                  <div className="ready-email">
                    <label htmlFor="email"><Mail size={16} /> Your Email Address</label>
                    <input id="email" type="email" placeholder="photographer@focalpoint.ai" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" required />
                  </div>

                  <div className="ready-actions">
                    <button type="button" className="btn-secondary" onClick={handleBrowseClick}>Change Photo</button>
                    <button type="submit" className="btn-primary analyze-button"><Sparkles size={20} />Analyze Photograph</button>
                  </div>
                </div>
              )}

              {uploadState === 'error' && (
                <div className="upload-state-view upload-error-view">
                  <AlertTriangle size={40} />
                  <h3>{uploadError?.title}</h3>
                  {uploadError?.type === 'large' ? (
                    <div className="size-error-details">
                      <div><span>Maximum supported</span><strong>15 MB</strong></div>
                      <div><span>Current</span><strong>{uploadError.current}</strong></div>
                    </div>
                  ) : <p>{uploadError?.message}</p>}
                  <button type="button" className="btn-secondary" onClick={handleBrowseClick}>Try Again</button>
                </div>
              )}

              {/* Retain native drag events across every visual state. */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="upload-drop-capture"
                aria-hidden="true"
              />
            </form>
          </div>
        )}

        {/* 2. Analysis Thinking Experience */}
        {isLoading && (
          <div className="analysis-loading fade-in">
            <div className="analysis-photo">
              {previewUrl && <img src={previewUrl} alt="Photograph being analyzed" />}
              <div className="analysis-scan-line" />
              <span>AI VISUAL INSPECTION</span>
            </div>

            <section className="analysis-thinking-card" aria-live="polite">
              <div className="analysis-loading-heading">
                <div>
                  <span className="analysis-eyebrow">FocalPoint AI</span>
                  <h2>Analyzing {file?.name || 'your photograph'}</h2>
                </div>
                <strong>{Math.round(analysisProgress)}%</strong>
              </div>

              <div className="analysis-progress-track">
                <span style={{ width: `${analysisProgress}%` }} />
              </div>

              <div className="analysis-step-list">
                {LOADING_STEPS.map((step, index) => {
                  const complete = index <= loadingStep;
                  const active = index === loadingStep + 1 || (index === loadingStep && index === LOADING_STEPS.length - 1 && analysisProgress < 100);
                  return (
                    <div key={step} className={`analysis-step ${complete ? 'complete' : ''} ${active ? 'active' : ''}`}>
                      <span className="analysis-step-icon">{complete ? <Check size={15} /> : <i />}</span>
                      <span>{step}{active ? '…' : ''}</span>
                    </div>
                  );
                })}
              </div>

              <p className="analysis-status">
                {analysisProgress === 100 ? 'Critique complete. Preparing your dashboard…' : 'Generating a professional, actionable critique…'}
              </p>
            </section>

            {currentQuote && (
              <blockquote className="analysis-quote">
                “{currentQuote.quote}” <span>— {currentQuote.author}</span>
              </blockquote>
            )}
          </div>
        )}

        {/* Previous scanner retained temporarily for reference, but no longer rendered. */}
        {SHOW_LEGACY_SCANNER && isLoading && (
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
              <h3 className="pulse-text" style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', height: '36px' }}>
                {LOADING_STEPS[loadingStep]}
              </h3>
            </div>
            
            {/* Simple progress dot track */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
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

            {/* Random Quote card */}
            {currentQuote && (
              <div className="glass-panel" style={{ padding: '24px', maxWidth: '460px', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.012)', border: '1px solid rgba(255, 255, 255, 0.04)', boxShadow: 'none' }}>
                <p style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, textAlign: 'center' }}>
                  “{currentQuote.quote}”
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', alignSelf: 'center', fontWeight: '600' }}>
                  — {currentQuote.author}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. Results Workspace */}
        {!isLoading && analysisResult && (() => {
          const majorParams = getMajorParams(analysisResult);
          const overallScore = Math.max(0, Math.min(100, Math.round((Number(analysisResult.overall_rating) || 0) * 10)));
          const selectedParam = majorParams.find((param) => param.id === activeTab);
          const allAspects = majorParams.flatMap((param) =>
            param.subAspects.map((aspect) => ({ ...aspect, parentId: param.id, parentLabel: param.label }))
          );
          const quickWins = allAspects
            .filter((aspect) => Number.isFinite(aspect.rating) && aspect.rating < 86)
            .sort((a, b) => a.rating - b.rating)
            .slice(0, 3);
          const strengths = allAspects
            .filter((aspect) => aspect.what_works)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 3);
          const improvementItems = quickWins.length > 0
            ? quickWins
            : allAspects.slice(0, 3);
          const recommendedLearning = learningByTab[improvementItems[0]?.parentId] || [];
          const cameraSettings = analysisResult.exif_analysis?.camera_settings;
          const engineLabel = analysisResult.mode === 'gemini_ai'
            ? 'Gemini AI'
            : analysisResult.ai_status === 'rate_limited'
              ? 'Local CV · API limited'
              : 'Local CV';
          const hotspots = [
            { id: 'composition', label: 'Framing', hint: 'Review subject placement', x: '28%', y: '38%' },
            { id: 'lighting', label: 'Highlight', hint: 'Inspect tonal balance', x: '72%', y: '27%' },
            { id: 'subject', label: 'Subject', hint: 'Review visual attention', x: '57%', y: '61%' },
          ];

          const openWorkspaceTab = (tabId) => {
            setActiveTab(tabId);
            setExpandedAspect(null);
          };

          return (
            <div className="critique-workspace fade-in">
              <div className="workspace-commandbar">
                <div>
                  <span className="workspace-kicker"><span className="live-dot" /> Analysis complete</span>
                  <h2>{file?.name || 'Photography critique'}</h2>
                </div>
                <div className="workspace-actions">
                  <span className="engine-pill"><Cpu size={14} /> {engineLabel}</span>
                  <button type="button" className="quiet-button" onClick={handleReset}>
                    <RefreshCw size={15} /> New analysis
                  </button>
                </div>
              </div>

              <div className="workspace-body">
                <aside className="photo-workbench">
                  <div className="photo-toolbar">
                    <div>
                      <span>IMAGE INSPECTOR</span>
                      <strong>{fileMetadata?.width || '—'} × {fileMetadata?.height || '—'}</strong>
                    </div>
                    <button
                      type="button"
                      className={`tool-toggle ${showGuides ? 'is-on' : ''}`}
                      onClick={() => setShowGuides((value) => !value)}
                      aria-pressed={showGuides}
                    >
                      <Target size={15} /> Guides
                    </button>
                  </div>

                  <div className="inspected-photo">
                    <img ref={imgRef} src={previewUrl} alt="Analyzed photograph" />
                    {showGuides && (
                      <div className="photo-guides" aria-label="Interactive image insights">
                        <i className="third-line third-line-v-one" />
                        <i className="third-line third-line-v-two" />
                        <i className="third-line third-line-h-one" />
                        <i className="third-line third-line-h-two" />
                        {hotspots.map((hotspot, index) => (
                          <button
                            key={hotspot.id}
                            type="button"
                            className={`photo-hotspot ${activeHotspot === hotspot.id ? 'is-active' : ''}`}
                            style={{ left: hotspot.x, top: hotspot.y }}
                            onMouseEnter={() => setActiveHotspot(hotspot.id)}
                            onMouseLeave={() => setActiveHotspot(null)}
                            onFocus={() => setActiveHotspot(hotspot.id)}
                            onBlur={() => setActiveHotspot(null)}
                            onClick={() => openWorkspaceTab(hotspot.id)}
                            aria-label={`${hotspot.label}: ${hotspot.hint}`}
                          >
                            <span>{index + 1}</span>
                            <em><strong>{hotspot.label}</strong>{hotspot.hint}</em>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="image-caption">
                    <div><span>File</span><strong>{file?.name || 'critique-image.jpg'}</strong></div>
                    <div><span>Size</span><strong>{fileMetadata?.size || '—'}</strong></div>
                  </div>

                  {cameraSettings && (
                    <div className="exif-strip">
                      <div><span>Shutter</span><strong>{cameraSettings.shutter_speed || '—'}</strong></div>
                      <div><span>Aperture</span><strong>{cameraSettings.aperture || '—'}</strong></div>
                      <div><span>ISO</span><strong>{cameraSettings.iso || '—'}</strong></div>
                      <div><span>Focal</span><strong>{cameraSettings.focal_length || '—'}</strong></div>
                    </div>
                  )}
                </aside>

                <section className="critique-panel">
                  <div className="score-summary">
                    <div className="score-block">
                      <span>OVERALL SCORE</span>
                      <div><strong>{overallScore}</strong><small>/100</small></div>
                      <em className={`score-label score-${getScoreLabel(overallScore).toLowerCase().replace(' ', '-')}`}>
                        {getScoreLabel(overallScore)}
                      </em>
                    </div>
                    <div className="assessment-lede">
                      <span>PROFESSIONAL ASSESSMENT</span>
                      <h3>{analysisResult.first_impression || 'A technically capable image with a clear opportunity for focused refinement.'}</h3>
                      <p>Start with the quick wins, then use the workspace navigation for the full technical critique.</p>
                    </div>
                  </div>

                  <nav className="workspace-tabs" aria-label="Critique sections">
                    <button
                      type="button"
                      className={activeTab === 'overview' ? 'active' : ''}
                      onClick={() => openWorkspaceTab('overview')}
                    >
                      Overview
                    </button>
                    {majorParams.map((param) => (
                      <button
                        type="button"
                        key={param.id}
                        className={activeTab === param.id ? 'active' : ''}
                        onClick={() => openWorkspaceTab(param.id)}
                      >
                        {param.label.replace(' & Exposure', '').replace(' & Sharpness', '').replace(' & Tones', '').replace(' & Story', '')}
                        <span>{param.rating}</span>
                      </button>
                    ))}
                  </nav>

                  <div className="workspace-content">
                    {activeTab === 'overview' ? (
                      <div className="overview-layout">
                        <section className="quick-wins-section">
                          <div className="section-heading">
                            <div>
                              <span>NEXT BEST ACTIONS</span>
                              <h3>Improve this photo</h3>
                            </div>
                            <Sparkles size={18} />
                          </div>
                          <div className="quick-win-list">
                            {improvementItems.map((item, index) => {
                              const gain = Math.max(2, Math.min(8, Math.round((88 - item.rating) / 5)));
                              return (
                                <button type="button" key={`${item.parentId}-${item.key}`} onClick={() => openWorkspaceTab(item.parentId)}>
                                  <span className="win-index">0{index + 1}</span>
                                  <div>
                                    <strong>{item.label}</strong>
                                    <p>{item.what_could_be_improved || 'Make a small targeted adjustment for a more polished result.'}</p>
                                  </div>
                                  <em>+{gain}</em>
                                </button>
                              );
                            })}
                          </div>
                        </section>

                        <div className="overview-columns">
                          <section className="scan-list strengths-list">
                            <div className="mini-heading"><CheckCircle size={16} /><span>What is working</span></div>
                            {strengths.map((item) => (
                              <div key={`${item.parentId}-${item.key}`}>
                                <Check size={14} />
                                <p><strong>{item.label}</strong>{item.what_works}</p>
                              </div>
                            ))}
                          </section>
                          <section className="scan-list improvements-list">
                            <div className="mini-heading"><Target size={16} /><span>Focus next</span></div>
                            {improvementItems.map((item) => (
                              <div key={`${item.parentId}-${item.key}`}>
                                <span className="status-marker" />
                                <p><strong>{getScoreLabel(item.rating)}</strong>{item.label}</p>
                              </div>
                            ))}
                          </section>
                        </div>

                        {recommendedLearning.length > 0 && (
                          <section className="learning-strip overview-learning-strip">
                            <div>
                              <span>LEARNING HUB</span>
                              <h4>Recommended next</h4>
                            </div>
                            {recommendedLearning.map((resource) => (
                              <button
                                type="button"
                                key={resource.title}
                                onClick={() => openWorkspaceTab(improvementItems[0].parentId)}
                              >
                                <span>{resource.meta}</span>
                                <strong>{resource.title}</strong>
                                <em>View learning hub →</em>
                              </button>
                            ))}
                          </section>
                        )}

                        <section className="category-overview">
                          <div className="section-heading compact">
                            <div><span>PERFORMANCE MAP</span><h3>Category scores</h3></div>
                          </div>
                          <div className="category-grid">
                            {majorParams.map((param) => (
                              <button type="button" key={param.id} onClick={() => openWorkspaceTab(param.id)}>
                                <div><span>{param.label}</span><strong>{param.rating}</strong></div>
                                <div className="score-track"><i style={{ width: `${param.rating}%`, background: getScoreColor(param.rating) }} /></div>
                                <small>{getScoreLabel(param.rating)} <span>View critique →</span></small>
                              </button>
                            ))}
                          </div>
                        </section>

                        {(analysisResult.ai_status === 'rate_limited' || !['queued', 'sent'].includes(analysisResult.email_status)) && (
                          <div className="system-note">
                            <Info size={16} />
                            <p>
                              {analysisResult.ai_status === 'rate_limited'
                                ? 'The AI quota was unavailable, so this report uses the local computer-vision engine.'
                                : 'Email delivery is in simulation mode; the critique is still complete in this workspace.'}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : selectedParam ? (
                      <div className="detail-layout">
                        <div className="detail-header">
                          <div>
                            <span>SELECTED ANALYSIS</span>
                            <h3>{selectedParam.label}</h3>
                            <p>{selectedParam.what_could_be_improved}</p>
                          </div>
                          <div className="category-score">
                            <strong>{selectedParam.rating}</strong>
                            <span>{getScoreLabel(selectedParam.rating)}</span>
                          </div>
                        </div>

                        <div className="detail-meter">
                          <span style={{ width: `${selectedParam.rating}%`, background: getScoreColor(selectedParam.rating) }} />
                        </div>

                        <div className="aspect-accordion">
                          {selectedParam.subAspects.map((aspect, index) => {
                            const aspectId = `${selectedParam.id}-${aspect.key || index}`;
                            const isOpen = expandedAspect === aspectId;
                            const target = Math.max(88, aspect.rating);
                            return (
                              <article key={aspectId} className={isOpen ? 'is-open' : ''}>
                                <button
                                  type="button"
                                  className="aspect-trigger"
                                  onClick={() => setExpandedAspect(isOpen ? null : aspectId)}
                                  aria-expanded={isOpen}
                                >
                                  <div>
                                    <span className="aspect-status" style={{ background: getScoreColor(aspect.rating) }} />
                                    <div><strong>{aspect.label}</strong><small>{getScoreLabel(aspect.rating)}</small></div>
                                  </div>
                                  <span className="aspect-score">{Math.round(aspect.rating)}</span>
                                  <i>{isOpen ? '−' : '+'}</i>
                                </button>
                                {isOpen && (
                                  <div className="aspect-body">
                                    <div className="before-target">
                                      <div><span>Current</span><div><i style={{ width: `${aspect.rating}%` }} /></div><strong>{Math.round(aspect.rating)}</strong></div>
                                      <div><span>Target</span><div><i style={{ width: `${target}%` }} /></div><strong>{target}</strong></div>
                                    </div>
                                    <div className="insight-pair">
                                      <div><span><Check size={13} /> What works</span><p>{aspect.what_works}</p></div>
                                      <div><span><Target size={13} /> Refine</span><p>{aspect.what_could_be_improved}</p></div>
                                    </div>
                                    {aspect.suggested_edit_hint && (
                                      <p className="edit-recipe"><Sliders size={14} /><strong>Suggested adjustment</strong>{aspect.suggested_edit_hint}</p>
                                    )}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>

                        <section className="learning-strip">
                          <div>
                            <span>LEARN IN CONTEXT</span>
                            <h4>Build this skill</h4>
                          </div>
                          {(learningByTab[selectedParam.id] || []).map((resource) => (
                            <button type="button" key={resource.title}>
                              <span>{resource.meta}</span>
                              <strong>{resource.title}</strong>
                              <em>Open lesson →</em>
                            </button>
                          ))}
                        </section>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
          );
        })()}

        {/* Legacy result renderer retained as a reference while the workspace ships. */}
        {SHOW_LEGACY_RESULTS && !isLoading && analysisResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="fade-in">
            
            {/* Redesigned Upper Summary Panel with SVG radial gauge */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '28px' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', tracking: '0.08em', display: 'inline-block', marginBottom: '6px', border: '1px solid var(--primary-glow)', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(99, 102, 241, 0.05)' }}>Analysis Complete</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '6px', letterSpacing: '-0.02em', color: '#fff' }}>Constructive Critique Dashboard</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  Workspace: <span style={{ fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: '600' }}>{analysisResult.email}</span> 
                  • Engine: <span style={{ color: analysisResult.ai_status === 'rate_limited' ? 'var(--warning)' : 'var(--secondary)', fontWeight: '700' }}>
                    {analysisResult.mode === 'gemini_ai'
                      ? 'Gemini 3.5 Flash AI Engine'
                      : analysisResult.ai_status === 'rate_limited'
                        ? 'Local OpenCV Core (Gemini rate limited)'
                        : 'Local OpenCV Core'}
                  </span>
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

            {analysisResult.ai_status === 'rate_limited' && (
              <div className="alert-banner alert-banner-warning">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: 'var(--warning)',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.5' }}>
                  <strong style={{ color: '#FFFFFF', display: 'block', fontSize: '0.98rem', marginBottom: '2px' }}>
                    Gemini API Rate Limit Reached
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Gemini could not generate this critique because the project quota is exhausted. The scores and feedback shown here were generated by the local computer-vision engine.
                  </span>
                </div>
              </div>
            )}

            {/* Email Config Alert Banner */}
            <div 
              className={`alert-banner ${
                ['queued', 'sent'].includes(analysisResult.email_status) ? 'alert-banner-info' : 'alert-banner-warning'
              }`}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                backgroundColor: ['queued', 'sent'].includes(analysisResult.email_status) ? 'rgba(20, 88, 149, 0.16)' : 'rgba(245, 158, 11, 0.12)',
                color: ['queued', 'sent'].includes(analysisResult.email_status) ? 'var(--primary-hover)' : 'var(--warning)',
                flexShrink: 0
              }}>
                <Mail size={22} />
              </div>
              <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.5' }}>
                {['queued', 'sent'].includes(analysisResult.email_status) ? (
                  <>
                    <strong style={{ color: '#FFFFFF', display: 'block', fontSize: '0.98rem', marginBottom: '2px' }}>SMTP Report Queued</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Your styled dashboard report is being delivered to <span style={{ color: '#fff', fontWeight: '600' }}>{analysisResult.email}</span>. Please check your spam folder if it doesn't arrive within 1 minute.
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

            {/* Redesigned Critique Dashboard Layout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Top Split Layout - Photo on Left, Details & Settings on Right */}
              <div className="top-split-grid">
                
                {/* Top Left: Photograph Showcase */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                  
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
                    minHeight: '320px',
                    maxHeight: '480px',
                    flex: 1
                  }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        ref={imgRef}
                        src={previewUrl} 
                        alt="Critiqued Photograph" 
                        onLoad={updateImgDimensions}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '480px', 
                          objectFit: 'contain'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Metadata display */}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>{file?.name || 'critique_image.jpg'}</span>
                    <span>Photography Evaluation Workspace</span>
                  </div>
                </div>

                {/* Top Right: First Impression, EXIF Details, Reset Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* First Impression Box */}
                  <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>First Impression</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {analysisResult.first_impression || "No initial impression data was computed for this photograph."}
                    </p>
                  </div>

                  {/* Merged Camera Settings (EXIF) */}
                  {analysisResult.exif_analysis ? (
                    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Camera size={16} style={{ color: 'var(--secondary)' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Camera Settings (EXIF)</span>
                      </div>
                      
                      {/* Premium LCD Camera Settings Display */}
                      <div className="camera-lcd" style={{
                        background: 'radial-gradient(ellipse at center, #1b2030 0%, #0d1017 100%)',
                        border: '1px solid #1E293B',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                          <div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>Shutter Speed</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38BDF8', letterSpacing: '-0.02em' }}>
                              {analysisResult.exif_analysis.camera_settings.shutter_speed || 'N/A'}
                            </span>
                          </div>
                          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>Aperture</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#34D399', letterSpacing: '-0.02em' }}>
                              {analysisResult.exif_analysis.camera_settings.aperture || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>ISO</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#F59E0B', letterSpacing: '-0.02em' }}>
                              {analysisResult.exif_analysis.camera_settings.iso || 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', fontSize: '0.8rem', paddingTop: '4px' }}>
                          <div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>Focal Length</span>
                            <span style={{ color: '#fff', fontWeight: '600' }}>
                              {analysisResult.exif_analysis.camera_settings.focal_length || 'N/A'}
                            </span>
                          </div>
                          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '12px' }}>
                            <span style={{ color: '#fff', fontWeight: '600', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={analysisResult.exif_analysis.camera_settings.camera}>
                              {analysisResult.exif_analysis.camera_settings.camera || 'Generic Camera'}
                            </span>
                            {analysisResult.exif_analysis.camera_settings.lens && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={analysisResult.exif_analysis.camera_settings.lens}>
                                {analysisResult.exif_analysis.camera_settings.lens}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const status = analysisResult.exif_analysis.diagnostics.status;
                        let statusColor = 'var(--success)';
                        let statusBg = 'rgba(16, 185, 129, 0.05)';
                        let statusBorder = 'rgba(16, 185, 129, 0.15)';
                        let StatusIcon = CheckCircle;

                        if (status === 'critical') {
                          statusColor = 'var(--danger)';
                          statusBg = 'rgba(239, 68, 68, 0.05)';
                          statusBorder = 'rgba(239, 68, 68, 0.15)';
                          StatusIcon = AlertTriangle;
                        } else if (status === 'warning') {
                          statusColor = 'var(--warning)';
                          statusBg = 'rgba(245, 158, 11, 0.05)';
                          statusBorder = 'rgba(245, 158, 11, 0.15)';
                          StatusIcon = AlertCircle;
                        }

                        return (
                          <div style={{
                            padding: '14px',
                            backgroundColor: statusBg,
                            border: `1px solid ${statusBorder}`,
                            borderLeft: `4px solid ${statusColor}`,
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '4px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: statusColor }}>
                              <StatusIcon size={16} style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Settings Audit: {status}
                              </span>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>
                                {analysisResult.exif_analysis.diagnostics.issue}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                <strong>Recommendation:</strong> {analysisResult.exif_analysis.diagnostics.suggestion}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '14px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '10px',
                        border: '1px dashed var(--border-color)',
                        alignItems: 'flex-start'
                      }}>
                        <Info size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.8rem', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>No EXIF Metadata Found</strong>
                          EXIF details are missing or have been stripped from this file. Using computer vision visual default settings.
                        </div>
                      </div>
                      
                      {/* Suggested baseline rules */}
                      <div style={{ background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Recommended Standard Settings:</span>
                        • Handheld snapshot: 1/125s, f/4.0, ISO 200<br/>
                        • Portrait depth isolation: 1/250s, f/1.8 - f/2.8, ISO 100<br/>
                        • Landscape deep sharpness: 1/60s, f/8.0 - f/11, ISO 100 (tripod advised)
                      </div>
                    </div>
                  )}

                  {/* Reset button */}
                  <button onClick={handleReset} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                    <RefreshCw size={16} />
                    Analyze Another Photo
                  </button>

                </div>
              </div>

              {/* Bottom Section - Wide Detailed Review Block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Tabs for Category Selection */}
                <div style={{ display: 'flex', gap: '6px', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', overflowX: 'auto' }}>
                  {[
                    { id: 'composition', label: 'Composition' },
                    { id: 'lighting', label: 'Lighting & Exposure' },
                    { id: 'focus', label: 'Focus & Sharpness' },
                    { id: 'color', label: 'Color & Tones' },
                    { id: 'subject', label: 'Subject & Story' },
                    { id: 'post-processing', label: 'Post-Processing' }
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
                  {(() => {
                    const params = getMajorParams(analysisResult);
                    const selectedParam = params.find(p => p.id === activeTab);
                    if (!selectedParam) return null;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Overall Aspect Review Card */}
                        <div 
                          className="glass-panel" 
                          style={{ 
                            padding: '24px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '16px',
                            borderLeft: `6px solid ${getScoreColor(selectedParam.rating)}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '800' }}>
                              Overall {selectedParam.label} Review
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: getScoreColor(selectedParam.rating), fontFamily: 'var(--font-mono)' }}>
                                {selectedParam.rating}
                              </span>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ 100</span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px' }}>
                            {/* What Works */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div style={{ color: 'var(--success)', marginTop: '2px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                                <CheckCircle size={14} />
                              </div>
                              <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                <span style={{ fontWeight: '700', color: 'var(--success)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>What Works</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{selectedParam.what_works}</span>
                              </div>
                            </div>

                            {/* What could be improved */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div style={{ color: 'var(--warning)', marginTop: '2px', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                                <AlertCircle size={14} />
                              </div>
                              <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                <span style={{ fontWeight: '700', color: 'var(--warning)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>Areas For Improvement</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{selectedParam.what_could_be_improved}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Heading for Sub-Aspects */}
                        {activeTab !== 'post-processing' && (
                          <div style={{ marginTop: '10px', marginBottom: '-5px' }}>
                            <h5 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Sub-Aspect Breakdown & Attention Ratings
                            </h5>
                          </div>
                        )}

                        {/* List of sub-aspects */}
                        {activeTab !== 'post-processing' && selectedParam.subAspects.map((sub) => {
                          const cfg = subAspectConfig[sub.key] || { label: sub.label, icon: Info, minSweet: 40, maxSweet: 75 };
                          const IconComponent = cfg.icon;
                          const color = getScoreColor(sub.rating);

                          return (
                            <div 
                              key={sub.key} 
                              className="glass-panel aspect-card" 
                              style={{ 
                                padding: '22px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '16px',
                                borderLeft: `4px solid ${color}`
                              }}
                            >
                              {/* Sub Header */}
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
                                    {sub.rating}
                                  </span>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 100</span>
                                </div>
                              </div>

                              {/* Sweet Spot Slider Track */}
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
                                      width: `${sub.rating}%`,
                                      backgroundColor: color,
                                      boxShadow: `0 0 10px ${color}`
                                    }}
                                  />
                                  {/* Slider thumb */}
                                  <div 
                                    className="metric-slider-thumb"
                                    style={{
                                      left: `${sub.rating}%`,
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

                              {/* What Works & What Could Be Improved */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '14px' }}>
                                {sub.what_works && (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <div style={{ color: 'var(--success)', marginTop: '2px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                                      <CheckCircle size={14} />
                                    </div>
                                    <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                      <span style={{ fontWeight: '700', color: 'var(--success)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>What Works</span>
                                      <span style={{ color: 'var(--text-secondary)' }}>{sub.what_works}</span>
                                    </div>
                                  </div>
                                )}

                                {sub.what_could_be_improved && (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <div style={{ color: 'var(--warning)', marginTop: '2px', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                                      <AlertCircle size={14} />
                                    </div>
                                    <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                      <span style={{ fontWeight: '700', color: 'var(--warning)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>Areas For Improvement</span>
                                      <span style={{ color: 'var(--text-secondary)' }}>{sub.what_could_be_improved}</span>
                                    </div>
                                  </div>
                                )}

                                {sub.suggested_edit_hint && (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '2px' }}>
                                    <div style={{ color: 'var(--secondary)', marginTop: '2px', backgroundColor: 'rgba(139, 92, 246, 0.08)', borderRadius: '50%', padding: '2px', display: 'flex', flexShrink: 0 }}>
                                      <Sliders size={14} />
                                    </div>
                                    <div style={{ fontSize: '0.85rem', lineHeight: '1.4', padding: '8px 12px', background: 'rgba(139, 92, 246, 0.06)', borderRadius: '8px', borderLeft: '3px solid var(--secondary)', flex: 1 }}>
                                      <span style={{ fontWeight: '700', color: 'var(--secondary)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>💡 Suggested Edit</span>
                                      <span style={{ color: 'var(--text-secondary)' }}>{sub.suggested_edit_hint}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Category-Specific Visual Analysis & Details */}
                        
                        {/* Post-Processing Presets & Edits suggestion */}
                        {activeTab === 'post-processing' && (() => {
                          const allEdits = analysisResult.suggested_edits || [];
                          const keyedEdits = allEdits.filter(e => e && typeof e === 'object' && e.key);
                          const aspectLabels = {
                            brightness: 'Exposure & Brightness', contrast: 'Tonal Contrast',
                            saturation: 'Color Saturation', warmth: 'White Balance / Warmth',
                            details: 'Detail & Sharpening', highlights: 'Highlights & Whites',
                            shadows: 'Shadows & Blacks', ambiance: 'Ambiance & Tone',
                            colour: 'Colour Palette', crop: 'Crop & Framing'
                          };
                          if (keyedEdits.length === 0) return null;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                              <div style={{ marginBottom: '-4px' }}>
                                <h5 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  Edit Opportunities · {keyedEdits.length} adjustment{keyedEdits.length !== 1 ? 's' : ''} flagged
                                </h5>
                              </div>
                              {keyedEdits.map((edit, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                    borderLeft: '4px solid var(--secondary)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      {aspectLabels[edit.key] || edit.key}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(139,92,246,0.08)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.15)' }}>
                                      Suggested Adjustment
                                    </span>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                                    {edit.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* 1. Composition Category specific cards */}
                        {activeTab === 'composition' && analysisResult.advanced_cv && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                            {/* Composition Rules Breakdown */}
                            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Compass size={18} className="text-secondary" />
                                Computer Vision Composition Analysis
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {[
                                  { label: 'Rule of Thirds Alignment', data: analysisResult.advanced_cv?.composition?.rule_of_thirds, color: 'var(--primary)' },
                                  { label: 'Golden Ratio (Fibonacci) Balance', data: analysisResult.advanced_cv?.composition?.golden_ratio, color: '#fbbf24' },
                                  { label: 'Symmetry & Texture Patterns', data: analysisResult.advanced_cv?.composition?.symmetry_patterns, color: '#10b981' },
                                  { label: 'Natural Edge Framing', data: analysisResult.advanced_cv?.composition?.framing, color: '#f43f5e' },
                                  { label: 'Negative Space Breathing Room', data: analysisResult.advanced_cv?.composition?.negative_space, color: '#06b6d4' },
                                  { label: 'Leading Lines Convergence', data: analysisResult.advanced_cv?.composition?.leading_lines, color: '#a855f7' }
                                ].map((rule, idx) => {
                                  const score = rule.data?.score || 0;
                                  let statusColor = 'var(--danger)';
                                  if (score >= 75) statusColor = 'var(--success)';
                                  else if (score >= 45) statusColor = 'var(--warning)';

                                  return (
                                    <div key={idx} style={{ paddingBottom: idx < 5 ? '12px' : 0, borderBottom: idx < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '0.85rem', color: '#fff', marginBottom: '4px' }}>
                                        <span>{rule.label}</span>
                                        <span style={{ color: statusColor, fontWeight: '800' }}>{score}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/100</span></span>
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        {rule.data?.description}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Heuristics for Composition */}
                            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cpu size={18} style={{ color: '#10b981' }} />
                                Composition Heuristics
                              </h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Centering Status</span>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: analysisResult.advanced_cv?.subject_centering?.is_centered ? 'var(--success)' : 'var(--warning)' }}>
                                    {analysisResult.advanced_cv?.subject_centering?.is_centered ? 'Centered' : 'Off-Center'}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Offset: dx={analysisResult.advanced_cv?.subject_centering?.offset_x}, dy={analysisResult.advanced_cv?.subject_centering?.offset_y}
                                  </span>
                                </div>
                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Horizon Tilt</span>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: !analysisResult.advanced_cv?.horizon?.detected ? 'var(--text-muted)' : (analysisResult.advanced_cv?.horizon?.is_level ? 'var(--success)' : 'var(--danger)') }}>
                                    {!analysisResult.advanced_cv?.horizon?.detected ? 'Not Detected' : (analysisResult.advanced_cv?.horizon?.is_level ? 'Level' : 'Tilted')}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {analysisResult.advanced_cv?.horizon?.detected ? `Angle: ${analysisResult.advanced_cv.horizon.angle}°` : 'No distinct horizon'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. Color & Tones Category specific cards */}
                        {activeTab === 'color' && analysisResult.advanced_cv && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                            {/* Color Swatch Palette */}
                            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Palette size={18} className="text-secondary" />
                                Extracted Color Palette
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Click on a swatch color bubble to copy its hex value to clipboard.
                              </p>
                              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {analysisResult.advanced_cv?.color_palette?.map((col, idx) => (
                                  <div 
                                    key={idx} 
                                    onClick={() => copyColorToClipboard(col.hex)}
                                    style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center', 
                                      gap: '6px',
                                      cursor: 'pointer',
                                      position: 'relative'
                                    }}
                                  >
                                    <div style={{
                                      width: '42px',
                                      height: '42px',
                                      borderRadius: '50%',
                                      backgroundColor: col.hex,
                                      border: '2px solid rgba(255,255,255,0.15)',
                                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                      transition: 'transform 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                      {copiedColor === col.hex && <Check size={16} style={{ color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: '600' }}>{col.percentage}%</span>
                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{col.hex.toUpperCase()}</span>
                                  </div>
                                ))}
                              </div>
                              {copiedColor && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
                                  <CheckCircle size={12} />
                                  Copied {copiedColor.toUpperCase()} to clipboard!
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 3. Focus & Sharpness Category specific cards */}
                        {activeTab === 'focus' && analysisResult.advanced_cv && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cpu size={18} style={{ color: '#38bdf8' }} />
                                Sharpness & Focus Heuristics
                              </h4>
                              
                              {/* Blur Details */}
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
                                  <Eye size={16} />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <strong>Sharpness Audit:</strong> {analysisResult.advanced_cv?.blur?.description}
                                </div>
                              </div>

                              {/* Background Clutter Details */}
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                                <div style={{ color: analysisResult.advanced_cv?.background_clutter?.score > 50 ? 'var(--warning)' : 'var(--success)', marginTop: '2px' }}>
                                  <AlertTriangle size={16} />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <strong>Background Clutter (Score: {analysisResult.advanced_cv?.background_clutter?.score}/100):</strong>{' '}
                                  {analysisResult.advanced_cv?.background_clutter?.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 4. Subject & Story Category specific cards */}
                        {activeTab === 'subject' && analysisResult.advanced_cv && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cpu size={18} style={{ color: '#fbbf24' }} />
                                Subject & Human Elements
                              </h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Face Count</span>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: analysisResult.advanced_cv?.faces?.length > 0 ? 'var(--success)' : '#fff' }}>
                                    {analysisResult.advanced_cv?.faces?.length || 0} Detected
                                  </span>
                                </div>
                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Eye Contact</span>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>
                                    {analysisResult.advanced_cv?.faces?.length > 0 ? (analysisResult.advanced_cv.faces.some(f => f.eye_contact) ? 'Direct 👁' : 'Indirect') : 'N/A'}
                                  </span>
                                </div>
                              </div>

                              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Sky Coverage</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>
                                  {analysisResult.advanced_cv?.sky_segmentation?.percentage}% of Frame
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })()}
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
