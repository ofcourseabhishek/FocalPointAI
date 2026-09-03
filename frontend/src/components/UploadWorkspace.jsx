import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowRightIcon,
  ReplaceIcon,
  UploadIcon,
} from '@/components/icons/snapgrade-icons';
import '../upload-workspace.css';

const FILE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';


function hasFiles(dataTransfer) {
  return Boolean(dataTransfer?.types && Array.from(dataTransfer.types).includes('Files'));
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/**
 * Focused file-selection workbench. Parent owns file validation, preview creation,
 * and request state; this component owns only local input and drag affordances.
 */
export function UploadWorkspace({
  file,
  previewUrl,
  fileMetadata,
  isPreparing = false,
  isLoading = false,
  error = '',
  onFiles,
  onAnalyze,
  onCancel,
}) {
  const inputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const headingRef = useRef(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const hasPreview = Boolean(file && previewUrl);
  const isBusy = isPreparing || isLoading;
  
  const currentState = error ? 'error' : isLoading ? 'loading' : isPreparing ? 'preparing' : hasPreview ? 'ready' : 'idle';
  useEffect(() => {
    // Wait for the next tick to ensure the DOM has updated the heading
    const timer = setTimeout(() => {
      if (currentState !== 'idle') {
        headingRef.current?.focus();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [currentState]);

  const clearDragState = () => {
    dragDepthRef.current = 0;
    setIsDraggingFile(false);
  };

  useEffect(() => {
    const onDragEnter = (event) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (isLoading) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      dragDepthRef.current += 1;
      event.dataTransfer.dropEffect = 'copy';
      setIsDraggingFile(true);
    };

    const onDragOver = (event) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = isLoading ? 'none' : 'copy';
    };

    const onDragLeave = (event) => {
      if (!hasFiles(event.dataTransfer)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDraggingFile(false);
    };

    const onDrop = (event) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      clearDragState();
      if (isLoading) return;
      const files = Array.from(event.dataTransfer.files || []);
      if (files.length) onFiles?.(files);
    };
    
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && isBusy) {
        onCancel?.();
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', clearDragState);
    window.addEventListener('pagehide', clearDragState);
    document.addEventListener('visibilitychange', clearDragState);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', clearDragState);
      window.removeEventListener('pagehide', clearDragState);
      document.removeEventListener('visibilitychange', clearDragState);
    };
  }, [isLoading, isBusy, onFiles, onCancel]);

  const chooseFile = () => {
    if (!isBusy) inputRef.current?.click();
  };

  const onInputChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) onFiles?.(files);
    // Allow re-selecting the same file after a validation or network error.
    event.target.value = '';
  };

  const metadata = fileMetadata?.width && fileMetadata?.height
    ? `${fileMetadata.width} × ${fileMetadata.height}`
    : '';
  const isDropTarget = isDraggingFile && !isLoading;
  const surfaceClass = [
    'upload-workspace__surface',
    hasPreview && 'upload-workspace__surface--ready',
    isDropTarget && 'upload-workspace__surface--dragging',
    isLoading && 'upload-workspace__surface--loading',
  ].filter(Boolean).join(' ');

  let topContent = null;
  let bottomContent = null;
  if (error) {
    topContent = (
      <div className="upload-workspace__processing-header">
        <p className="upload-workspace__eyebrow">ANALYSIS INTERRUPTED</p>
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>We couldn't finish reading this photograph.</h1>
        <p className="upload-workspace__error">{error}</p>
        <p className="upload-workspace__description">Your image is still here. You can try again or choose another one.</p>
      </div>
    );
    bottomContent = (
      <div className="upload-workspace__processing-body">
        <Button className="upload-workspace__primary-button" type="button" onClick={onAnalyze}>
          Try again
        </Button>
        <Button className="upload-workspace__quiet-button" variant="ghost" type="button" onClick={chooseFile}>
          Choose another photograph
        </Button>
      </div>
    );
  } else if (isLoading) {
    topContent = (
      <div className="upload-workspace__processing-header">
        <p className="upload-workspace__eyebrow upload-workspace__eyebrow--gold">ANALYSIS IN PROGRESS</p>
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>Reading the frame.</h1>
        <p className="upload-workspace__description">Snapgrade is looking at the decisions shaping this image.</p>
      </div>
    );
    bottomContent = (
      <div className="upload-workspace__processing-body">
        <ul className="upload-workspace__category-list">
          <li>COMPOSITION</li>
          <li>LIGHT</li>
          <li>COLOR</li>
          <li>FOCUS</li>
          <li>VISUAL HIERARCHY</li>
        </ul>
        <div className="upload-workspace__working-indicator">
          <span className="upload-workspace__working-dot" aria-hidden="true">●</span> Working
        </div>
        {onCancel && (
          <Button className="upload-workspace__quiet-button" variant="ghost" type="button" onClick={onCancel} style={{ marginTop: '24px' }}>
            Cancel
          </Button>
        )}
      </div>
    );
  } else if (isPreparing) {
    topContent = (
      <div className="upload-workspace__processing-header">
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>Getting it ready.</h1>
        <div className="upload-workspace__progress" role="status" aria-live="polite" aria-busy="true">
          <span className="upload-workspace__spinner" aria-hidden="true" />
          <p>Checking the file and its dimensions.</p>
        </div>
      </div>
    );
  } else if (hasPreview) {
    topContent = (
      <div className="upload-workspace__processing-header">
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>Ready to read.</h1>
        <p className="upload-workspace__filename" title={file.name}>{file.name}</p>
        <p className="upload-workspace__metadata" aria-label={`Photo details: ${[metadata, formatFileSize(file.size)].filter(Boolean).join(', ')}`}>
          <span className="upload-workspace__desktop-meta">{metadata}</span>
          <span className="upload-workspace__desktop-meta">{metadata && formatFileSize(file.size) ? ' · ' : ''}</span>
          <span className="upload-workspace__desktop-meta">{formatFileSize(file.size)}</span>
        </p>
      </div>
    );
    bottomContent = (
      <div className="upload-workspace__processing-body">
        <Button className="upload-workspace__primary-button" type="button" onClick={onAnalyze}>
          Analyze photograph <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
        <Button className="upload-workspace__quiet-button" variant="ghost" type="button" onClick={chooseFile}>
          <ReplaceIcon data-icon="inline-start" aria-hidden="true" />
          Choose another
        </Button>
      </div>
    );
  } else {
    topContent = (
      <div className="upload-workspace__processing-header">
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>Add a photograph</h1>
        <p className="upload-workspace__description">Drop one here or choose a file from your device.</p>
      </div>
    );
    bottomContent = (
      <div className="upload-workspace__processing-body">
        <Button className="upload-workspace__primary-button" type="button" onClick={chooseFile}>
          Choose photo <UploadIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
        <p className="upload-workspace__file-hint">JPEG · PNG · WebP<br />Up to 20 MB</p>
      </div>
    );
  }

  return (
    <div className={`upload-workspace${isDropTarget ? ' upload-workspace--dragging' : ''}`}>
      <header className="upload-workspace__header">
        <a className="upload-workspace__wordmark" href={import.meta.env.VITE_LANDING_URL || 'https://snapgrade.com'}>snapgrade</a>
      </header>

      <main className="upload-workspace__main">
        <p className="upload-workspace__new-label">NEW ANALYSIS</p>
        <p className="upload-workspace__live-status" role="status" aria-live="polite">
          {error
            ? `Analysis interrupted. ${error}`
            : isLoading
              ? 'Reading the frame.'
              : isPreparing
                ? 'Preparing photograph.'
                : hasPreview
                  ? 'Photograph ready to analyze.'
                  : 'Ready to add a photograph.'}
        </p>
        <div className="upload-workspace__grid">
          <div className="upload-workspace__media-column">
            {hasPreview ? (
              <div className={surfaceClass}>
                <img className="upload-workspace__image" src={previewUrl} alt={`Preview of ${file.name}`} decoding="async" />
              </div>
            ) : (
              <button
                className={surfaceClass}
                type="button"
                onClick={chooseFile}
                disabled={isBusy}
                aria-label="Choose a photograph from your device"
              >
                  <span className="upload-workspace__empty-content">
                  <UploadIcon className="upload-workspace__frame-mark" aria-hidden="true" />
                  <span>{isDropTarget ? 'Release to add' : 'Drop a photograph here'}</span>
                </span>
              </button>
            )}
            {!isLoading && <p className="upload-workspace__privacy">Your photograph stays on this device until you analyze it.</p>}
          </div>

          <div className="upload-workspace__information" data-loading={isLoading}>
            <div className="upload-workspace__information-top">
              {topContent}
            </div>
            <div className="upload-workspace__information-bottom">
              {bottomContent}
            </div>
          </div>
        </div>
      </main>

      <input
        ref={inputRef}
        className="upload-workspace__input"
        type="file"
        accept={FILE_ACCEPT}
        onChange={onInputChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
