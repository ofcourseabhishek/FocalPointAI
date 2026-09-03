import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

const ViewportContext = createContext(null);

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
  onDimensionsLoaded,
  ...props
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const observerRef = useRef(null);
  
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0, top: 0, left: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setIsLoaded(true);
    if (onDimensionsLoaded) {
      onDimensionsLoaded({ width: naturalWidth, height: naturalHeight });
    }
  };

  useEffect(() => {
    if (!isLoaded || !containerRef.current || naturalSize.width === 0) return;

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

      setRenderSize({
        width: renderWidth,
        height: renderHeight,
        top,
        left,
      });
    };

    observerRef.current = new ResizeObserver(() => {
      calculateSafeArea();
    });

    observerRef.current.observe(containerRef.current);
    calculateSafeArea();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoaded, naturalSize, objectFit]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 select-none",
        className
      )}
      data-loaded={isLoaded}
      {...props}
    >
      {/* Decorative background grid for a refined, technical aesthetic */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      {src && (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          className="absolute inset-0 w-full h-full transition-all duration-500 ease-out"
          style={{ 
            objectFit, 
            opacity: isLoaded ? 1 : 0,
            transform: isLoaded ? 'scale(1)' : 'scale(1.02)'
          }}
          draggable={false}
        />
      )}
      
      {!isLoaded && src && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin dark:border-zinc-800 dark:border-t-zinc-200" />
            <span className="text-xs font-medium tracking-widest uppercase text-zinc-500">Loading</span>
          </div>
        </div>
      )}

      {/* Safe Area Viewport */}
      {isLoaded && children && (
        <div
          className="absolute pointer-events-none"
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
  // x, y, w, h are normalized [0, 1]
  const style = {
    top: `${y * 100}%`,
    left: `${x * 100}%`,
    width: `${w * 100}%`,
    height: `${h * 100}%`,
  };

  return (
    <div
      ref={ref}
      className={cn("absolute pointer-events-auto", className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});
Geometry.displayName = 'ResultPhotoViewport.Geometry';

ResultPhotoViewport.Geometry = Geometry;
