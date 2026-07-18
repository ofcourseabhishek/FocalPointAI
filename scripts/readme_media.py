"""Build contact sheets and animated README clips from screen recordings."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import cv2
from PIL import Image, ImageDraw, ImageFont


def open_video(path: Path) -> tuple[cv2.VideoCapture, float, float, int, int]:
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open video: {path}")
    fps = capture.get(cv2.CAP_PROP_FPS)
    frames = capture.get(cv2.CAP_PROP_FRAME_COUNT)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if fps <= 0 or frames <= 0 or width <= 0 or height <= 0:
        raise RuntimeError(f"Invalid video metadata: {path}")
    return capture, frames / fps, fps, width, height


def read_frame(capture: cv2.VideoCapture, seconds: float) -> Image.Image:
    capture.set(cv2.CAP_PROP_POS_MSEC, max(0.0, seconds) * 1000)
    ok, frame = capture.read()
    if not ok:
        raise RuntimeError(f"Could not decode frame at {seconds:.2f}s")
    return Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))


def read_frames_sequential(
    capture: cv2.VideoCapture, times: list[float], source_fps: float
) -> list[Image.Image]:
    """Decode a time range once and select frames without repeated random seeks."""
    target_indices = [max(0, round(seconds * source_fps)) for seconds in times]
    first_index = max(0, target_indices[0] - 2)
    capture.set(cv2.CAP_PROP_POS_FRAMES, first_index)
    current_index = int(capture.get(cv2.CAP_PROP_POS_FRAMES))
    selected: list[Image.Image] = []
    target_position = 0

    while target_position < len(target_indices):
        ok, frame = capture.read()
        if not ok:
            break
        image = None
        while (
            target_position < len(target_indices)
            and current_index >= target_indices[target_position]
        ):
            if image is None:
                image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            selected.append(image.copy())
            target_position += 1
        current_index += 1

    if len(selected) != len(times):
        raise RuntimeError(
            f"Decoded {len(selected)} of {len(times)} requested frames sequentially"
        )
    return selected


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    filename = "GoogleSans-Bold.ttf" if bold else "GoogleSans-Regular.ttf"
    path = Path("frontend/public/fonts") / filename
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def timestamp(value: float) -> str:
    minutes, seconds = divmod(value, 60)
    return f"{int(minutes):02d}:{seconds:04.1f}"


def make_contact_sheet(args: argparse.Namespace) -> None:
    capture, duration, _, _, _ = open_video(args.input)
    start = min(max(0.0, args.start), duration)
    end = duration if args.end is None else min(max(start + 0.1, args.end), duration)
    count = max(2, args.count)
    times = [start + (end - start) * index / (count - 1) for index in range(count)]
    thumbs: list[Image.Image] = []
    font = load_font(20, bold=True)

    for seconds in times:
        frame = read_frame(capture, min(seconds, max(0.0, duration - 0.05)))
        frame.thumbnail((args.width, int(args.width * 9 / 16)), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (args.width, frame.height + 34), "#0b1020")
        canvas.paste(frame, ((args.width - frame.width) // 2, 0))
        draw = ImageDraw.Draw(canvas)
        draw.text((10, frame.height + 6), timestamp(seconds), font=font, fill="white")
        thumbs.append(canvas)

    columns = max(1, args.columns)
    rows = math.ceil(len(thumbs) / columns)
    gap = 10
    sheet_width = columns * args.width + (columns - 1) * gap
    sheet_height = rows * thumbs[0].height + (rows - 1) * gap
    sheet = Image.new("RGB", (sheet_width, sheet_height), "#050811")
    for index, thumb in enumerate(thumbs):
        x = (index % columns) * (args.width + gap)
        y = (index // columns) * (thumb.height + gap)
        sheet.paste(thumb, (x, y))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, quality=90, optimize=True)
    capture.release()


def smoothstep(value: float) -> float:
    return value * value * (3.0 - 2.0 * value)


def crop_with_motion(
    frame: Image.Image,
    progress: float,
    zoom_start: float,
    zoom_end: float,
    focus_start: tuple[float, float],
    focus_end: tuple[float, float],
    output_size: tuple[int, int],
) -> Image.Image:
    eased = smoothstep(progress)
    zoom = zoom_start + (zoom_end - zoom_start) * eased
    focus_x = focus_start[0] + (focus_end[0] - focus_start[0]) * eased
    focus_y = focus_start[1] + (focus_end[1] - focus_start[1]) * eased

    source_width, source_height = frame.size
    output_width, output_height = output_size
    target_ratio = output_width / output_height
    crop_width = source_width / max(1.0, zoom)
    crop_height = crop_width / target_ratio
    if crop_height > source_height:
        crop_height = source_height / max(1.0, zoom)
        crop_width = crop_height * target_ratio

    center_x = focus_x * source_width
    center_y = focus_y * source_height
    left = min(max(0.0, center_x - crop_width / 2), source_width - crop_width)
    top = min(max(0.0, center_y - crop_height / 2), source_height - crop_height)
    box = (round(left), round(top), round(left + crop_width), round(top + crop_height))
    return frame.crop(box).resize(output_size, Image.Resampling.LANCZOS)


def draw_caption(frame: Image.Image, caption: str) -> None:
    if not caption:
        return
    draw = ImageDraw.Draw(frame, "RGBA")
    font = load_font(28, bold=True)
    box = draw.textbbox((0, 0), caption, font=font)
    text_width = box[2] - box[0]
    text_height = box[3] - box[1]
    x, y = 26, 24
    draw.rounded_rectangle(
        (x - 14, y - 10, x + text_width + 14, y + text_height + 14),
        radius=12,
        fill=(5, 8, 17, 220),
        outline=(139, 92, 246, 210),
        width=2,
    )
    draw.text((x, y), caption, font=font, fill=(255, 255, 255, 255))


def parse_point(value: str) -> tuple[float, float]:
    x, y = (float(part) for part in value.split(",", 1))
    if not 0 <= x <= 1 or not 0 <= y <= 1:
        raise argparse.ArgumentTypeError("Focus coordinates must be between 0 and 1")
    return x, y


def make_clip(args: argparse.Namespace) -> None:
    capture, duration, source_fps, _, _ = open_video(args.input)
    start = min(max(0.0, args.start), duration)
    end = min(max(start + 0.1, args.end), duration)
    output_duration = args.output_duration or (end - start)
    frame_count = max(2, round(output_duration * args.fps))
    times = [start + (end - start) * index / (frame_count - 1) for index in range(frame_count)]
    images: list[Image.Image] = []
    source_frames = read_frames_sequential(capture, times, source_fps)

    for index, frame in enumerate(source_frames):
        progress = index / (frame_count - 1)
        frame = crop_with_motion(
            frame,
            progress,
            args.zoom_start,
            args.zoom_end,
            args.focus_start,
            args.focus_end,
            (args.width, round(args.width * 9 / 16)),
        )
        draw_caption(frame, args.caption)
        images.append(frame)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    frame_duration = round(1000 / args.fps)
    if args.output.suffix.lower() == ".webp":
        images[0].save(
            args.output,
            format="WEBP",
            save_all=True,
            append_images=images[1:],
            duration=frame_duration,
            loop=0,
            quality=args.quality,
            method=4,
        )
    else:
        palette_frames = [
            image.convert("P", palette=Image.Palette.ADAPTIVE, colors=args.colors)
            for image in images
        ]
        palette_frames[0].save(
            args.output,
            save_all=True,
            append_images=palette_frames[1:],
            duration=frame_duration,
            loop=0,
            optimize=False,
            disposal=2,
        )
    capture.release()


def make_gif_sheet(args: argparse.Namespace) -> None:
    font = load_font(18, bold=True)
    width = args.width
    frame_height = round(width * 9 / 16)
    label_height = 34
    gap = 10
    rows: list[list[Image.Image]] = []

    for path in args.inputs:
        animation = Image.open(path)
        total = getattr(animation, "n_frames", 1)
        indices = [0, max(0, total // 2), max(0, total - 1)]
        previews: list[Image.Image] = []
        for index in indices:
            animation.seek(index)
            frame = animation.convert("RGB").resize((width, frame_height), Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (width, frame_height + label_height), "#0b1020")
            canvas.paste(frame, (0, 0))
            draw = ImageDraw.Draw(canvas)
            draw.text((10, frame_height + 6), f"{path.name} - frame {index + 1}/{total}", font=font, fill="white")
            previews.append(canvas)
        rows.append(previews)

    sheet_width = 3 * width + 2 * gap
    sheet_height = len(rows) * (frame_height + label_height) + max(0, len(rows) - 1) * gap
    sheet = Image.new("RGB", (sheet_width, sheet_height), "#050811")
    for row_index, previews in enumerate(rows):
        for column_index, preview in enumerate(previews):
            x = column_index * (width + gap)
            y = row_index * (frame_height + label_height + gap)
            sheet.paste(preview, (x, y))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, quality=90, optimize=True)


def inspect_animations(args: argparse.Namespace) -> None:
    for path in args.inputs:
        animation = Image.open(path)
        duration = animation.info.get("duration")
        print(
            f"{path.name}|{animation.width}x{animation.height}"
            f"|frames={animation.n_frames}|frame_duration_ms={duration}"
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    contact = subparsers.add_parser("contact-sheet")
    contact.add_argument("input", type=Path)
    contact.add_argument("output", type=Path)
    contact.add_argument("--count", type=int, default=12)
    contact.add_argument("--columns", type=int, default=4)
    contact.add_argument("--width", type=int, default=360)
    contact.add_argument("--start", type=float, default=0.0)
    contact.add_argument("--end", type=float)
    contact.set_defaults(func=make_contact_sheet)

    clip = subparsers.add_parser("clip")
    clip.add_argument("input", type=Path)
    clip.add_argument("output", type=Path)
    clip.add_argument("--start", type=float, required=True)
    clip.add_argument("--end", type=float, required=True)
    clip.add_argument("--caption", default="")
    clip.add_argument("--width", type=int, default=960)
    clip.add_argument("--fps", type=float, default=8)
    clip.add_argument("--output-duration", type=float)
    clip.add_argument("--colors", type=int, default=128)
    clip.add_argument("--quality", type=int, default=82)
    clip.add_argument("--zoom-start", type=float, default=1.0)
    clip.add_argument("--zoom-end", type=float, default=1.12)
    clip.add_argument("--focus-start", type=parse_point, default=(0.5, 0.5))
    clip.add_argument("--focus-end", type=parse_point, default=(0.5, 0.5))
    clip.set_defaults(func=make_clip)

    gif_sheet = subparsers.add_parser("gif-sheet")
    gif_sheet.add_argument("output", type=Path)
    gif_sheet.add_argument("inputs", type=Path, nargs="+")
    gif_sheet.add_argument("--width", type=int, default=320)
    gif_sheet.set_defaults(func=make_gif_sheet)

    inspect = subparsers.add_parser("inspect")
    inspect.add_argument("inputs", type=Path, nargs="+")
    inspect.set_defaults(func=inspect_animations)
    return parser


if __name__ == "__main__":
    parsed = build_parser().parse_args()
    parsed.func(parsed)
