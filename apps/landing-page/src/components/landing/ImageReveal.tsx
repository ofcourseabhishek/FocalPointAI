"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { READ_IMAGE_URL } from "./read-image";

interface ImageRevealProps { overlay?: ReactNode; }

/** A stable, calibrated photo frame. Lens changes are carried by its overlay. */
export function ImageReveal({ overlay }: ImageRevealProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm bg-[#0a0a0a] shadow-2xl">
      {/* The photo and calibrated atlas share this original 2:3 source canvas. */}
      <div className="absolute inset-x-0 top-1/2 aspect-[2/3] -translate-y-1/2">
        <Image
          src={READ_IMAGE_URL}
          alt="Editorial storefront photograph prepared for visual analysis"
          fill
          className="object-cover"
          sizes="(max-width: 767px) calc(100vw - 3rem), 50vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')] opacity-[0.03] mix-blend-overlay" />
        {overlay}
      </div>
    </div>
  );
}
