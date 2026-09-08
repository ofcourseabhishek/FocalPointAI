import React from 'react';
import { cn } from '@/lib/utils';

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const firstAvailable = (...values) => values.find(hasValue);

/** Compact capture metadata for the analyzed photograph. */
export function PhotoMetaStrip({
  camera,
  cameraModel,
  camera_model: cameraModelSnake,
  lens,
  lensModel,
  lens_model: lensModelSnake,
  focalLength,
  focal_length: focalLengthSnake,
  aperture,
  shutterSpeed,
  shutter_speed: shutterSpeedSnake,
  iso,
  date,
  captureDate,
  capture_date: captureDateSnake,
  location,
  colorProfile,
  color_profile: colorProfileSnake,
  className,
}) {
  const items = [
    { label: 'Camera', value: firstAvailable(camera, cameraModel, cameraModelSnake) },
    { label: 'Lens', value: firstAvailable(lens, lensModel, lensModelSnake) },
    { label: 'Focal', value: firstAvailable(focalLength, focalLengthSnake) },
    { label: 'Aperture', value: aperture },
    { label: 'Shutter', value: firstAvailable(shutterSpeed, shutterSpeedSnake) },
    { label: 'ISO', value: iso },
    { label: 'Date', value: firstAvailable(date, captureDate, captureDateSnake) },
    { label: 'Location', value: location },
    { label: 'Profile', value: firstAvailable(colorProfile, colorProfileSnake) },
  ].filter((item) => hasValue(item.value));

  if (!items.length) return null;

  return (
    <dl className={cn('result-read__photo-meta', className)}>
      {items.map((item) => (
        <div className="result-read__photo-meta-item" key={item.label}>
          <dt className="result-read__photo-meta-label">{item.label}</dt>
          <dd className="result-read__photo-meta-value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
