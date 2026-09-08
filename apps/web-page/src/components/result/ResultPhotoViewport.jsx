import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { getResultMediaAspectRatio } from '@/lib/result-read';

const ViewportContext = createContext(null);
const emptyDimensions = { width: 0, height: 0 };

function normalizeDimensions(dimensions) {
  const width = Number(dimensions?.width);
  const height = Number(dimensions?.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return emptyDimensions;
  }

  return { width, height };
}

function getOrientation({ width, height }) {
  if (!width || !height) return 'landscape';
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

export function useViewport() {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error('useViewport must be used within a ResultPhotoViewport');
  }
  return context;
}

export function ResultPhotoViewport({
  src,
  alt = 'Viewport image',
  className,
  children,
  objectFit = 'contain',
  imageDimensions,
  onDimensionsLoaded,
  loading = 'eager',
  fetchPriority = 'high',
  style,
  ...props
}) {
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const providedDimensions = normalizeDimensions(imageDimensions);
  const [loadedImage, setLoadedImage] = useState({ src: null, ...emptyDimensions });
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0, top: 0, left: 0 });

  const naturalSize = loadedImage.src === src
    ? { width: loadedImage.width, height: loadedImage.height }
    : emptyDimensions;
  const dimensions = naturalSize.width ? naturalSize : providedDimensions;
  const isLoaded = Boolean(src && loadedImage.src === src);
  const sourceAspectRatio = dimensions.width ? dimensions.width / dimensions.height : null;
  const stageAspectRatio = getResultMediaAspectRatio(dimensions.width, dimensions.height);
  const aspectRatio = stageAspectRatio || undefined;

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const nextDimensions = normalizeDimensions({ width: naturalWidth, height: naturalHeight });

    setLoadedImage({ src, ...nextDimensions });
    onDimensionsLoaded?.(nextDimensions);
  };

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !naturalSize.width) return undefined;

    const calculateSafeArea = () => {
      if (!containerRef.current) return;
      const container = containerRef.current.getBoundingClientRect();
      if (container.width === 0 || container.height === 0) return;

      const containerRatio = container.width / container.height;
      const imageRatio = naturalSize.width / naturalSize.height;

      let renderWidth = container.width;
      let renderHeight = container.height;
      let top = 0;
      let left = 0;

      if (objectFit === 'contain') {
        if (containerRatio > imageRatio) {
          renderWidth = container.height * imageRatio;
          renderHeight = container.height;
          left = (container.width - renderWidth) / 2;
        } else {
          renderWidth = container.width;
          renderHeight = container.width / imageRatio;
          top = (container.height - renderHeight) / 2;
        }
      } else if (objectFit === 'cover') {
        if (containerRatio > imageRatio) {
          renderWidth = container.width;
          renderHeight = container.width / imageRatio;
          top = (container.height - renderHeight) / 2;
        } else {
          renderWidth = container.height * imageRatio;
          renderHeight = container.height;
          left = (container.width - renderWidth) / 2;
        }
      } else if (objectFit === 'fill') {
        renderWidth = container.width;
        renderHeight = container.height;
      }

      setRenderSize({ width: renderWidth, height: renderHeight, top, left });
    };

    observerRef.current = new ResizeObserver(calculateSafeArea);
    observerRef.current.observe(containerRef.current);
    calculateSafeArea();

    return () => observerRef.current?.disconnect();
  }, [isLoaded, naturalSize.width, naturalSize.height, objectFit]);

  return (
    <div
      ref={containerRef}
      className={cn('result-read__photo-viewport', className)}
      data-loaded={isLoaded}
      data-orientation={getOrientation(dimensions)}
      data-framing={stageAspectRatio && stageAspectRatio !== sourceAspectRatio ? 'bounded' : 'natural'}
      style={{
        ...style,
        '--rr-photo-aspect': sourceAspectRatio || undefined,
        aspectRatio,
      }}
      {...props}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          width={dimensions.width || undefined}
          height={dimensions.height || undefined}
          onLoad={handleImageLoad}
          className="result-read__photo-viewport-image"
          data-loaded={isLoaded}
          style={{ objectFit }}
          draggable={false}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
        />
      )}

      {!isLoaded && src && (
        <div className="result-read__photo-viewport-loading" role="status" aria-live="polite">
          <div className="result-read__photo-viewport-loading-content">
            <span className="result-read__photo-viewport-loading-spinner" aria-hidden="true" />
            <span className="result-read__photo-viewport-loading-label">Loading</span>
          </div>
        </div>
      )}

      {isLoaded && children && (
        <div
          className="result-read__photo-viewport-safe-area"
          style={{
            top: renderSize.top,
            left: renderSize.left,
            width: renderSize.width,
            height: renderSize.height,
          }}
        >
          <ViewportContext.Provider value={renderSize}>
            {children}
          </ViewportContext.Provider>
        </div>
      )}
    </div>
  );
}

const Geometry = React.forwardRef(({
  x = 0, y = 0, w = 0, h = 0,
  className, children, ...props
}, ref) => {
  const style = {
    top: `${y * 100}%`,
    left: `${x * 100}%`,
    width: `${w * 100}%`,
    height: `${h * 100}%`,
  };

  return (
    <div
      ref={ref}
      className={cn('absolute pointer-events-auto', className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});
Geometry.displayName = 'ResultPhotoViewport.Geometry';

ResultPhotoViewport.Geometry = Geometry;
