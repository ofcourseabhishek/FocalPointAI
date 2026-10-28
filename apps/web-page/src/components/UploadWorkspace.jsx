import { useRef, useState } from 'react';
import CommandButton from '@/components/kokonutui/command-button';
import FileUpload from '@/components/kokonutui/file-upload';
import Loader from '@/components/kokonutui/loader';
import ShapeHero from '@/components/kokonutui/shape-hero';

const REPO_URL = 'https://github.com/ofcourseabhishek/FocalPointAI';

const PILL = 'h-11 px-5 font-medium text-base tracking-tight';
const OUTLINE = 'border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100';
const SOLID = 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900';
const GOLD = 'bg-[#b8924a] text-zinc-950';

const HERO_TERMS = [
  'Composition', 'Light', 'Color', 'Focus', 'Visual hierarchy', 'Rule of thirds', 'Exposure',
  'Leading lines', 'Contrast', 'Negative space', 'Aperture', 'Shutter speed', 'ISO', 'White balance',
  'Depth of field', 'Bokeh', 'Golden hour', 'Framing', 'Symmetry', 'Balance', 'Texture', 'Saturation',
  'Highlights', 'Shadows', 'Sharpness', 'Horizon', 'Subject', 'Crop', 'Perspective', 'Silhouette',
  'Tone', 'Mood', 'Grain', 'Vignette', 'Dynamic range', 'Reflection', 'Pattern', 'Motion blur',
];
const PILL_STYLES = [SOLID, OUTLINE, OUTLINE, GOLD, OUTLINE];
const DOT_STYLES = [`size-16 ${GOLD}`, `size-12 ${SOLID}`, `size-20 ${OUTLINE}`, `size-14 ${GOLD}`];

// Three passes over the terms so even a 1080p hero can reach its fill; ShapeHero hides what doesn't fit.
// ponytail: ~130 bodies is the physics' O(n²) ceiling, scale pill size instead if screens get bigger.
const HERO_SHAPES = [0, 1, 2].flatMap((pass) =>
  HERO_TERMS.flatMap((term, i) => {
    const pill = { id: `${pass}-${term}`, content: term, className: `${PILL} ${PILL_STYLES[(i + pass) % PILL_STYLES.length]}` };
    return i % 6 === 2 ? [pill, { id: `${pass}-dot-${i}`, className: DOT_STYLES[(i + pass) % DOT_STYLES.length] }] : [pill];
  }),
);

/**
 * Landing hero with the photo drop zone. Two stages, each with its own retry:
 * - upload: FileUpload's row runs `onPrepare(file)`; a bad photo fails on the row (Retry / remove).
 * - analysis: the Enter command runs `onAnalyze(file, dimensions, signal)`; a failure keeps the
 *   uploaded photo and shows under the button, which then retries just the analysis.
 */
export function UploadWorkspace({ onPrepare, onAnalyze }) {
  const cancelRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const upload = async (file, { signal }) => {
    const dimensions = await onPrepare(file);
    if (signal.aborted) return;
    setPhoto({ file, dimensions });
    setAnalysisError('');
  };

  const removePhoto = () => {
    cancelRef.current?.abort();
    setPhoto(null);
    setAnalysisError('');
  };

  const send = async () => {
    if (!photo || isAnalyzing) return;
    const controller = new AbortController();
    cancelRef.current = controller;
    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      await onAnalyze(photo.file, photo.dimensions, controller.signal);
    } catch (err) {
      // Cancel is the user's choice, not a failure worth reporting.
      if (!controller.signal.aborted) setAnalysisError(err?.message || 'The critique could not be completed. Please try again.');
    } finally {
      if (cancelRef.current === controller) cancelRef.current = null;
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative font-['Neue_Haas_Grotesk_Display',Geist,Inter,sans-serif]">
      <a
        className="absolute top-6 left-6 z-10 font-semibold text-xl text-zinc-900 tracking-tight sm:left-10 dark:text-zinc-100"
        href={import.meta.env.VITE_LANDING_URL || 'https://snapgrade.com'}
      >
        snapgrade
      </a>
      {/* At least one screen tall; on short screens it grows (and the page scrolls) so the
          Analyze button is never pushed off-screen, with room below for the shapes to settle. */}
      <ShapeHero
        className="min-h-svh pt-[max(8svh,6rem)] pb-24 sm:[&_h1]:text-5xl [&>div>p]:mt-4 [&>div>p]:max-w-xl [&>div:last-child>div]:mt-6"
        fill={0.2}
        as="h1"
        title="Every photograph has a story. Let's read yours."
        description="Snapgrade scores your composition, light, color and focus, then tells you the one change that would make the frame stronger."
        actions={(
          <>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-900 px-5 font-medium text-sm text-white transition-colors duration-150 ease-out hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
            >
              <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
            <a
              className="inline-flex h-10 items-center rounded-full border border-zinc-200 bg-white px-5 font-medium text-sm text-zinc-700 transition-colors duration-150 ease-out hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              href={`${REPO_URL}/tree/master/docs`}
              target="_blank"
              rel="noreferrer"
            >
              Read the docs
            </a>
            <div className="mt-3 basis-full">
              <FileUpload
                acceptedFileTypes={['image/jpeg', 'image/png', 'image/webp']}
                maxFileSize={20 * 1024 * 1024}
                multiple={false}
                onUpload={upload}
                onFileRemove={removePhoto}
              />
              <CommandButton className="mx-auto mt-3 flex disabled:text-zinc-400 disabled:opacity-100 dark:disabled:text-zinc-500" shortcut="enter" disabled={!photo || isAnalyzing} onClick={send}>
                {analysisError ? 'Retry analysis' : 'Analyze photograph'}
              </CommandButton>
            </div>
          </>
        )}
        shapes={HERO_SHAPES}
      />
      {/* Analysis status: the loader while it runs, then the error with a retry that keeps the photo. */}
      {(isAnalyzing || analysisError) && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-zinc-950/85"
          role="dialog"
          aria-modal="true"
          aria-label={isAnalyzing ? 'Analyzing photograph' : 'Analysis failed'}
        >
          {isAnalyzing ? (
            <Loader title="Reading your photograph" subtitle="Looking at composition, light, color and focus." />
          ) : (
            <div className="flex max-w-sm flex-col items-center gap-2 p-8 text-center" role="alert">
              <p className="font-medium text-base text-zinc-900 dark:text-zinc-100">We couldn't finish the read.</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{analysisError} Your photo is still added.</p>
            </div>
          )}
          <div className="flex gap-2">
            {!isAnalyzing && (
              <button
                className="h-9 rounded-full bg-zinc-900 px-4 text-sm text-white transition-colors duration-150 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                type="button"
                autoFocus
                onClick={send}
              >
                Retry analysis
              </button>
            )}
            <button
              className="h-9 rounded-full border border-zinc-200 px-4 text-sm text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              type="button"
              autoFocus={isAnalyzing}
              onClick={() => (isAnalyzing ? cancelRef.current?.abort() : setAnalysisError(''))}
            >
              {isAnalyzing ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
