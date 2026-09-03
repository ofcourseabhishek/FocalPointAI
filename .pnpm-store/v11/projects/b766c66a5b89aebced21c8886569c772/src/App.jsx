import { useEffect, useRef, useState } from 'react';
import { ResultRead } from './components/ResultRead';
import { UploadWorkspace } from './components/UploadWorkspace';
import {
  getResponseErrorMessage,
  isAnalysisPayload,
  validatePhotograph,
} from './lib/photograph';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
const ANALYSIS_TIMEOUT_MS = 120_000;
const REPORT_TIMEOUT_MS = 60_000;
const RESULT_SESSION_KEY = 'snapgrade:result-preview:v1';
const PERSISTED_PREVIEW_MAX_EDGE = 1600;
const PERSISTED_PREVIEW_MAX_BYTES = 3_000_000;
const PREVIEW_FOCUS_MAP = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200"><rect width="800" height="1200" fill="#171714"/><g fill="none" stroke="#ebe7dc" opacity=".72"><path d="M74 936 303 563 548 400" stroke-width="7"/><path d="M126 285h394v585H126z" stroke-width="3"/><circle cx="451" cy="459" r="61" stroke-width="14" opacity=".45"/><circle cx="451" cy="459" r="19" fill="#ebe7dc" stroke="none" opacity=".9"/></g></svg>')}`;

const RESULT_PREVIEW = {
  context: { primary_genre: 'Abstract photography' },
  score_engine: { overall: 84, categories: { composition: 86, lighting: 82, color: 88, focus: 79 } },
  read: 'The frame has a confident split between shadow and light, with the color transitions creating a quiet visual rhythm that rewards a slower look.',
  overview: {
    keep: [
      { label: 'Color restraint', text: 'The warm and cool fields stay distinct without pulling the frame apart.' },
      { label: 'Tonal separation', text: 'Shadow and illumination remain readable as two deliberate shapes.' },
    ],
    change_one_thing: {
      text: 'Give the illuminated edge slightly more room.',
      detail: 'The crop creates useful tension, but the right edge sits close to feeling accidental.',
      why: 'A little more space would preserve the asymmetry while making the relationship feel intentional.',
    },
    try_this_next: {
      kicker: '02 / FRAMING',
      title: 'CONTROL THE EDGE',
      text: 'Make three versions of the same photograph.',
      supporting: 'Change only the relationship between the bright edge and the frame.',
      steps: [
        { label: 'TIGHT', text: 'Crop closer to the edge.' },
        { label: 'BALANCED', text: 'Keep the current tension.' },
        { label: 'OPEN', text: 'Give the light more room.' },
      ],
      closing: 'Compare which version creates the strongest visual tension.',
    },
  },
  aspects: {
    composition: {
      what_works: 'The luminous right edge holds the composition together, while the darker field gives the color enough room to feel deliberate rather than decorative.',
    },
  },
  frame_work: {
    composition: { evidenceIds: ['composition-lines'], interpretation: 'The bright right edge gives the darker field a clear counterweight, so the image feels held rather than split.', supporting: 'The diagonal route through the frame keeps the eye moving without competing with the color transition.', descriptor: 'Lines + center', metrics: [{ label: 'Subject centered', value: false }] },
    light: { evidenceIds: ['light-region'], interpretation: 'The light arrives as a soft, contained shape rather than a wash, letting the shadow remain part of the composition.', supporting: 'The brightest area stays localized, which keeps the tonal shift calm.', descriptor: 'Light region', metrics: [{ label: 'Highlight clipping', value: 1.4 }, { label: 'Shadow clipping', value: 0.6 }] },
    color: { interpretation: 'The warm and cool fields are distinct but close enough in value to read as one measured color movement.', supporting: 'The supplied palette carries the transition without relying on a synthetic heatmap.', descriptor: 'Palette evidence', palette: ['#1e1c1a', '#57352d', '#c36a4c', '#e8c48f', '#d7d8cf'], paletteLabels: ['Cool field', 'Warm edge'] },
    focus: { evidenceIds: ['focus-area'], interpretation: 'Detail is held through the central texture, while the quieter edges leave the frame room to breathe.', supporting: 'The focal area is specific rather than broad, so the image retains its soft overall character.', descriptor: 'Detail area', metrics: [{ label: 'Detail level', value: 'Moderate' }] },
    visual_hierarchy: { evidenceIds: ['attention-point'], interpretation: 'The eye lands at the illuminated break before following the darker diagonal across the frame.', supporting: 'The attention cue is supported by the visible structure, not inferred from the written read.', descriptor: 'Attention point', score: null },
  },
  overlays: [
    { id: 'attention-point', layer: 'attention', type: 'point', x: 0.73, y: 0.31 },
    { id: 'composition-lines', layer: 'composition', type: 'bbox', bbox: { left: 0.08, top: 0.22, right: 0.76, bottom: 0.8 } },
    { id: 'light-region', layer: 'light', type: 'region', points: [[0.62, 0.04], [1, 0], [1, 0.42], [0.73, 0.48]] },
    { id: 'focus-area', layer: 'focus', type: 'bbox', x: 0.18, y: 0.18, width: 0.54, height: 0.42 },
  ],
  advanced_cv: {
    subject_centering: { centroid: [0.68, 0.34] },
    horizon: { line: [[0.04, 0.67], [0.96, 0.63]] },
    composition: {
      leading_lines: { lines: [{ start: [0.09, 0.79], end: [0.71, 0.36] }] },
    },
    focus_map_b64: PREVIEW_FOCUS_MAP,
    color_palette: [
      { hex: '#1e1c1a', percentage: 28.4 },
      { hex: '#57352d', percentage: 24.1 },
      { hex: '#c36a4c', percentage: 20.7 },
      { hex: '#e8c48f', percentage: 15.2 },
      { hex: '#d7d8cf', percentage: 11.6 },
    ],
  },
  image_statistics: {
    dimensions: '2048x1365',
    brightness: { value: 0.47, level: 'Balanced' },
    sharpness: { value: 286.4, level: 'Medium' },
    luminance_histogram: [12, 17, 28, 39, 52, 66, 78, 91, 100, 94, 88, 82, 76, 71, 67, 64, 59, 51, 43, 34, 27, 20, 13, 7],
    shadow_clipping_percent: 0.6,
    highlight_clipping_percent: 1.4,
  },
  exif_analysis: { camera_settings: { color_profile: 'Display P3' } },
};

const readImageDimensions = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => reject(new Error('The image could not be decoded.'));
  image.src = url;
});

function clearPersistedResult() {
  try {
    window.sessionStorage.removeItem(RESULT_SESSION_KEY);
  } catch {
    // Private browsing and constrained storage should not block analysis.
  }
}

function readPersistedResult() {
  try {
    const stored = window.sessionStorage.getItem(RESULT_SESSION_KEY);
    if (!stored) return null;
    const value = JSON.parse(stored);
    if (!isAnalysisPayload(value?.analysis) || typeof value?.previewUrl !== 'string' || !value.previewUrl.startsWith('data:image/')) return null;
    const dimensions = value.imageDimensions;
    if (!Number.isFinite(dimensions?.width) || !Number.isFinite(dimensions?.height)) return null;
    return value;
  } catch {
    return null;
  }
}

async function createBoundedPreview(file) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = reject;
      nextImage.src = sourceUrl;
    });
    const scale = Math.min(1, PERSISTED_PREVIEW_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/webp', 0.82);
    return dataUrl.length <= PERSISTED_PREVIEW_MAX_BYTES ? dataUrl : '';
  } catch {
    return '';
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function persistResultPreview(analysis, sourceFile, imageDimensions, isCurrent) {
  const previewUrl = await createBoundedPreview(sourceFile);
  if (!isCurrent()) return;
  if (!previewUrl) {
    clearPersistedResult();
    return;
  }
  try {
    window.sessionStorage.setItem(RESULT_SESSION_KEY, JSON.stringify({
      analysis,
      previewUrl,
      imageDimensions,
      fileName: sourceFile.name || 'Analyzed photograph',
    }));
  } catch {
    clearPersistedResult();
  }
}

async function readResponseBody(response) {
  const body = await response.text();
  if (!body.trim()) return null;

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function reportFilename(response) {
  const disposition = response.headers.get('Content-Disposition') || '';
  const utfName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quotedName = disposition.match(/filename="([^"]+)"/i)?.[1];
  const plainName = disposition.match(/filename=([^;]+)/i)?.[1]?.trim();
  const candidate = utfName || quotedName || plainName;
  if (!candidate) return 'photograph-critique.pdf';
  try { return decodeURIComponent(candidate); } catch { return candidate; }
}

export default function App() {
  const [persistedResult] = useState(readPersistedResult);
  const [appLocation, setAppLocation] = useState(() => window.location.href);
  const [file, setFile] = useState(() => persistedResult ? { name: persistedResult.fileName } : null);
  const [previewUrl, setPreviewUrl] = useState(() => persistedResult?.previewUrl || '');
  const [isPreparing, setIsPreparing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(() => persistedResult?.analysis || null);
  const [error, setError] = useState('');
  const [fileMetadata, setFileMetadata] = useState(() => persistedResult?.imageDimensions || null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const previewUrlRef = useRef('');
  const selectionVersionRef = useRef(0);
  const analysisAbortRef = useRef(null);
  const reportAbortRef = useRef(null);
  const reportRequestVersionRef = useRef(0);
  const isPreparingRef = useRef(false);
  const currentLocation = new URL(appLocation);
  const showResultPreview = import.meta.env.DEV
    && (currentLocation.searchParams.get('preview') === 'result' || currentLocation.pathname.startsWith('/analysis/preview'));

  const abortActiveAnalysis = () => {
    analysisAbortRef.current?.abort();
    analysisAbortRef.current = null;
  };

  useEffect(() => () => {
    selectionVersionRef.current += 1;
    reportRequestVersionRef.current += 1;
    abortActiveAnalysis();
    reportAbortRef.current?.abort();
    reportAbortRef.current = null;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const handleFiles = async (files) => {
    if (!Array.isArray(files) || files.length !== 1) {
      setError('Choose exactly one photograph to continue.');
      return;
    }

    const nextFile = files[0];
    const validationError = validatePhotograph(nextFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    const selectionVersion = ++selectionVersionRef.current;
    abortActiveAnalysis();
    clearPersistedResult();
    setIsLoading(false);
    setIsPreparing(true);
    isPreparingRef.current = true;
    setError('');

    const nextPreviewUrl = URL.createObjectURL(nextFile);
    try {
      const dimensions = await readImageDimensions(nextPreviewUrl);
      if (selectionVersion !== selectionVersionRef.current) {
        URL.revokeObjectURL(nextPreviewUrl);
        return;
      }

      const previousPreviewUrl = previewUrlRef.current;
      previewUrlRef.current = nextPreviewUrl;
      setFile(nextFile);
      setPreviewUrl(nextPreviewUrl);
      setFileMetadata(dimensions);
      setAnalysisResult(null);
      if (previousPreviewUrl) URL.revokeObjectURL(previousPreviewUrl);
    } catch {
      URL.revokeObjectURL(nextPreviewUrl);
      if (selectionVersion === selectionVersionRef.current) {
        setError('This image could not be decoded. Choose another JPEG, PNG, or WebP file.');
      }
    } finally {
      if (selectionVersion === selectionVersionRef.current) {
        isPreparingRef.current = false;
        setIsPreparing(false);
      }
    }
  };

  const handleCancel = () => {
    selectionVersionRef.current += 1;
    abortActiveAnalysis();
    isPreparingRef.current = false;
    setIsPreparing(false);
    setIsLoading(false);
    setError('');
  };

  const handleAnalyze = async () => {
    if (isPreparingRef.current || isLoading || analysisAbortRef.current) return;
    if (!file || !previewUrl) {
      setError('Choose a photograph before starting the analysis.');
      return;
    }

    const selectionVersion = selectionVersionRef.current;
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ANALYSIS_TIMEOUT_MS);

    analysisAbortRef.current = controller;
    setIsLoading(true);
    setAnalysisResult(null);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      const body = await readResponseBody(response);

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(body, 'Failed to analyze the photograph.'));
      }
      if (!isAnalysisPayload(body)) {
        throw new Error('The critique service returned an invalid analysis response. Please try again.');
      }
      if (selectionVersion === selectionVersionRef.current && !controller.signal.aborted) {
        setAnalysisResult(body);
        void persistResultPreview(body, file, fileMetadata, () => selectionVersion === selectionVersionRef.current);
      }
    } catch (err) {
      if (selectionVersion === selectionVersionRef.current && !controller.signal.aborted) {
        const message = err instanceof TypeError
          ? 'Could not reach the critique service. Check your connection and try again.'
          : err.message || 'The critique could not be completed. Please try again.';
        setError(message);
      } else if (selectionVersion === selectionVersionRef.current && timedOut) {
        setError('The critique took longer than two minutes. Your photograph is still ready to retry.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (analysisAbortRef.current === controller) analysisAbortRef.current = null;
      if (selectionVersion === selectionVersionRef.current) setIsLoading(false);
    }
  };

  const handleDownloadReport = async (analysis, sourceFile) => {
    if (isDownloadingReport || reportAbortRef.current) return;
    const requestVersion = ++reportRequestVersionRef.current;
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REPORT_TIMEOUT_MS);
    reportAbortRef.current = controller;
    setIsDownloadingReport(true);
    setDownloadError('');
    const formData = new FormData();
    formData.append('analysis_json', JSON.stringify(analysis));

    try {
      if (sourceFile instanceof Blob) {
        formData.append('file', sourceFile);
      } else if (previewUrl.startsWith('data:image/')) {
        const restoredPreview = await fetch(previewUrl).then((response) => response.blob());
        formData.append('file', restoredPreview, 'restored-preview.webp');
      }
      const response = await fetch(`${BACKEND_URL}/critique-pdf`, { method: 'POST', body: formData, signal: controller.signal });
      if (!response.ok) {
        const body = await readResponseBody(response);
        throw new Error(getResponseErrorMessage(body, 'The report could not be prepared.'));
      }
      const report = await response.blob();
      if (requestVersion !== reportRequestVersionRef.current || controller.signal.aborted) return;
      const reportUrl = URL.createObjectURL(report);
      const link = document.createElement('a');
      link.href = reportUrl;
      link.download = reportFilename(response);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(reportUrl), 0);
    } catch (err) {
      if (requestVersion === reportRequestVersionRef.current) {
        const message = timedOut
          ? 'The report took too long to prepare. Try the download again.'
          : err instanceof TypeError
            ? 'Could not reach the report service. Try again when the connection is available.'
            : err.name === 'AbortError'
              ? ''
              : err.message || 'The report could not be prepared.';
        if (message) setDownloadError(message);
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (reportAbortRef.current === controller) reportAbortRef.current = null;
      if (requestVersion === reportRequestVersionRef.current) setIsDownloadingReport(false);
    }
  };

  const handleAnalyzeAnother = () => {
    selectionVersionRef.current += 1;
    reportRequestVersionRef.current += 1;
    abortActiveAnalysis();
    clearPersistedResult();
    reportAbortRef.current?.abort();
    reportAbortRef.current = null;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setFile(null);
    setPreviewUrl('');
    setFileMetadata(null);
    setAnalysisResult(null);
    setIsPreparing(false);
    setIsLoading(false);
    setIsDownloadingReport(false);
    setError('');
    setDownloadError('');
    window.history.replaceState({}, '', '/');
    setAppLocation(window.location.href);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (showResultPreview) {
    return (
      <ResultRead
        analysis={RESULT_PREVIEW}
        file={{ name: 'light-study.jpg' }}
        previewUrl="/background.jpg"
        imageDimensions={{ width: 4640, height: 6960 }}
        onDownloadReport={() => handleDownloadReport(RESULT_PREVIEW, null)}
        isDownloadingReport={isDownloadingReport}
        downloadError={downloadError}
        onAnalyzeAnother={handleAnalyzeAnother}
      />
    );
  }

  if (analysisResult) {
    return <ResultRead analysis={analysisResult} file={file} previewUrl={previewUrl} imageDimensions={fileMetadata} onDownloadReport={() => handleDownloadReport(analysisResult, file)} isDownloadingReport={isDownloadingReport} downloadError={downloadError} onAnalyzeAnother={handleAnalyzeAnother} />;
  }

  return (
    <UploadWorkspace
      file={file}
      previewUrl={previewUrl}
      fileMetadata={fileMetadata}
      isPreparing={isPreparing}
      isLoading={isLoading}
      error={error}
      onFiles={handleFiles}
      onAnalyze={handleAnalyze}
      onCancel={handleCancel}
    />
  );
}
