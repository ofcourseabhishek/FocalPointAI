import { forwardRef } from "react"
import { MorphIcon } from "morphicons/react"

/**
 * Snapgrade's product icon set is intentionally small and uses Morphicons for
 * rendering and reduced-motion handling. Paths are original 24px stroke paths
 * so the application does not depend on a second icon library.
 */
const iconPaths = {
  analyzeAnother: "M12 3a9 9 0 1 0 8.7 11.3M21 4v6h-6M3 20v-6h6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  camera: "M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  close: "M6 6l12 12M18 6 6 18",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  expand: "M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5",
  focus: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 3v2M12 19v2M3 12h2M19 12h2",
  info: "M12 17v-5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
  replace: "M19 7v5h-5M5 17v-5h5M18 12a6.5 6.5 0 0 0-11-3M6 12a6.5 6.5 0 0 0 11 3",
  upload: "M12 21V9M7 14l5-5 5 5M5 3h14",
}

function createSnapgradeIcon(path) {
  return forwardRef(function SnapgradeIcon(
    { color = "currentColor", reducedMotion = "user", strokeWidth = 1.75, ...props },
    ref
  ) {
    return (
      <MorphIcon
        ref={ref}
        icon={path}
        color={color}
        reducedMotion={reducedMotion}
        strokeWidth={strokeWidth}
        {...props}
      />
    )
  })
}

const AnalyzeAnotherIcon = createSnapgradeIcon(iconPaths.analyzeAnother)
const ArrowRightIcon = createSnapgradeIcon(iconPaths.arrowRight)
const CameraIcon = createSnapgradeIcon(iconPaths.camera)
const CloseIcon = createSnapgradeIcon(iconPaths.close)
const DownloadIcon = createSnapgradeIcon(iconPaths.download)
const ExpandIcon = createSnapgradeIcon(iconPaths.expand)
const FocusIcon = createSnapgradeIcon(iconPaths.focus)
const InfoIcon = createSnapgradeIcon(iconPaths.info)
const ReplaceIcon = createSnapgradeIcon(iconPaths.replace)
const UploadIcon = createSnapgradeIcon(iconPaths.upload)

export {
  AnalyzeAnotherIcon,
  ArrowRightIcon,
  CameraIcon,
  CloseIcon,
  DownloadIcon,
  ExpandIcon,
  FocusIcon,
  InfoIcon,
  ReplaceIcon,
  UploadIcon,
}
