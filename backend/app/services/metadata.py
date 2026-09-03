"""Upload validation and image/EXIF metadata extraction."""
from __future__ import annotations

import io
from typing import Any

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageCms, ImageOps
from PIL.ExifTags import GPSTAGS, TAGS
from PIL.TiffImagePlugin import IFDRational

MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
SUPPORTED_IMAGE_MIME_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
SUPPORTED_IMAGE_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})


def ensure_safe_image_dimensions(width: int, height: int) -> None:
    if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=413, detail="Decoded image exceeds 40 megapixels")


async def read_image_bytes(file: UploadFile) -> bytes:
    image_bytes = await file.read(MAX_IMAGE_UPLOAD_BYTES + 1)
    if len(image_bytes) > MAX_IMAGE_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded image exceeds 20 MiB")
    return image_bytes


def require_image_upload(file: UploadFile) -> None:
    if (file.content_type or "").casefold() not in SUPPORTED_IMAGE_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Use a JPEG, PNG, or WebP image")


def open_verified_image(image_bytes: bytes) -> Image.Image:
    """Reject truncated/corrupt data before it reaches CV or EXIF code."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            ensure_safe_image_dimensions(image.width, image.height)
            image.verify()
        image = Image.open(io.BytesIO(image_bytes))
        image_format = image.format
        image.load()
        if image.format not in SUPPORTED_IMAGE_FORMATS:
            image.close()
            raise HTTPException(status_code=400, detail="Use a JPEG, PNG, or WebP image")
        oriented = ImageOps.exif_transpose(image)
        if oriented is not image:
            image.close()
        oriented.format = image_format
        return oriented
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a readable image") from exc


def extract_exif_data(image: Image.Image) -> dict[str, Any]:
    exif_data: dict[str, Any] = {}
    try:
        image_exif = image.getexif()
        for key, value in (image_exif or {}).items():
            tag = TAGS.get(key, str(key))
            if tag != "exif":
                exif_data[tag] = value
        for ifd_id, tags in ((0x8769, TAGS), (0x8825, GPSTAGS)):
            try:
                for key, value in (image_exif.get_ifd(ifd_id) or {}).items():
                    exif_data[tags.get(key, str(key))] = value
            except Exception:
                pass
        profile = image.info.get("icc_profile")
        if profile:
            try:
                exif_data["ICCProfileDescription"] = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile))).strip("\x00 \r\n") or "Embedded ICC profile"
            except Exception:
                exif_data["ICCProfileDescription"] = "Embedded ICC profile"
    except Exception:
        pass
    return exif_data


def clean_exif_value(value: Any) -> Any:
    if isinstance(value, IFDRational):
        return float(value) if value.denominator else 0.0
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore").strip("\x00 ")
    if isinstance(value, tuple):
        return [clean_exif_value(item) for item in value]
    return value


def get_camera_device_name(exif_data: dict) -> str | None:
    make = str(clean_exif_value(exif_data.get("Make")) or "").strip()
    model = str(clean_exif_value(exif_data.get("Model")) or "").strip()
    if make and model:
        return model if model.casefold().startswith(make.casefold()) else f"{make} {model}"
    return model or make or None


def format_shutter_speed(value: Any) -> str | None:
    if not value:
        return None
    try:
        seconds = float(value)
        if seconds <= 0 or seconds >= 1:
            return f"{round(seconds, 1)}s"
        return f"1/{round(1 / seconds)}s"
    except (TypeError, ValueError):
        return str(value)


def format_flash_usage(value: Any) -> str | None:
    value = clean_exif_value(value)
    if value is None:
        return None
    try:
        return "Flash used" if int(value) & 1 else "No flash"
    except (TypeError, ValueError):
        text = str(value).strip().casefold()
        return None if not text else ("No flash" if "not" in text or "no flash" in text else "Flash used")


def format_exposure_compensation(value: Any) -> str | None:
    value = clean_exif_value(value)
    if value is None:
        return None
    try:
        exposure = float(value)
    except (TypeError, ValueError):
        return str(value).strip() or None
    if abs(exposure) < 0.005:
        return "0 EV"
    return f"{'+' if exposure > 0 else '−'}{f'{abs(exposure):.2f}'.rstrip('0').rstrip('.')} EV"


def get_color_profile_name(exif_data: dict) -> str | None:
    profile = clean_exif_value(exif_data.get("ICCProfileDescription"))
    if profile:
        return str(profile).strip() or None
    value = clean_exif_value(exif_data.get("ColorSpace"))
    try:
        code = int(value) if value is not None else None
    except (TypeError, ValueError):
        code = None
    return {1: "sRGB", 2: "Adobe RGB", 0xFFFF: "Uncalibrated"}.get(code, str(value) if value not in (None, "") else None)


def get_exif_summary(exif_data: dict) -> dict:
    raw = {"exposure_time": clean_exif_value(exif_data.get("ExposureTime")), "f_number": clean_exif_value(exif_data.get("FNumber")), "iso": clean_exif_value(exif_data.get("ISOSpeedRatings")), "focal_length": clean_exif_value(exif_data.get("FocalLength")), "focal_length_35mm": clean_exif_value(exif_data.get("FocalLengthIn35mmFilm")), "flash": clean_exif_value(exif_data.get("Flash")), "exposure_compensation": clean_exif_value(exif_data.get("ExposureBiasValue")), "color_profile": get_color_profile_name(exif_data), "camera": get_camera_device_name(exif_data), "lens": clean_exif_value(exif_data.get("LensModel"))}
    if isinstance(raw["iso"], (list, tuple)):
        raw["iso"] = raw["iso"][0] if raw["iso"] else None
    formatted = {"shutter_speed": format_shutter_speed(raw["exposure_time"]), "aperture": f"f/{raw['f_number']}" if raw["f_number"] else None, "iso": f"ISO {raw['iso']}" if raw["iso"] else None, "focal_length": f"{round(raw['focal_length'])}mm" if raw["focal_length"] else None, "focal_length_35mm": f"{round(raw['focal_length_35mm'])}mm" if raw["focal_length_35mm"] else None, "flash_usage": format_flash_usage(raw["flash"]), "exposure_compensation": format_exposure_compensation(raw["exposure_compensation"]), "color_profile": raw["color_profile"], "camera": str(raw["camera"]) if raw["camera"] else None, "lens": str(raw["lens"]) if raw["lens"] else None}
    return {"raw": raw, "formatted": formatted, "text": "\n".join(f"{key}: {clean_exif_value(value)}" for key, value in exif_data.items() if clean_exif_value(value) is not None)}


def image_metadata(filename: str | None, image: Image.Image, exif_data: dict) -> dict:
    orientation = "landscape" if image.width > image.height else "portrait" if image.height > image.width else "square"
    result = {"filename": filename or "image", "width": image.width, "height": image.height, "orientation": orientation, "format": image.format.lower() if image.format else None}
    exif = {key: clean_exif_value(value) for key, value in exif_data.items() if clean_exif_value(value) not in (None, "", [], {})}
    if exif:
        result["exif"] = exif
    settings = {key: value for key, value in get_exif_summary(exif_data)["formatted"].items() if value is not None}
    if settings:
        result["camera_settings"] = settings
    return result
