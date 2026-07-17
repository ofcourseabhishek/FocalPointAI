import base64
import re
import httpx
from fastapi import HTTPException
import json
import os


def classify_gemini_error(error: Exception) -> str:
    """Map Gemini failures to a stable, client-facing status value."""
    status_code = getattr(error, "status_code", None)
    detail = str(getattr(error, "detail", error)).lower()

    if status_code == 429 or "resource_exhausted" in detail or "quota" in detail:
        return "rate_limited"
    if status_code in (401, 403):
        return "authentication_error"
    if "timeout" in detail or "timed out" in detail:
        return "timeout"
    if isinstance(status_code, int) and status_code >= 500:
        return "service_unavailable"
    return "failed"


async def analyze_gemini(
    image_bytes: bytes,
    analysis_context: dict,
    api_key: str,
    mime_type: str = "image/jpeg",
) -> dict:
    """
    Call Gemini API to perform multi-modal analysis on the image.
    """
    # Encode image in base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"

    headers = {
        "Content-Type": "application/json"
    }

    prompt_path = os.path.join(os.path.dirname(__file__), "prompt.txt")
    with open(prompt_path, "r", encoding="utf-8") as f:
        prompt = f.read()

    context_json = json.dumps(analysis_context, ensure_ascii=False, indent=2)

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            f"{prompt}\n\n"
                            "APPLICATION-COMPUTED EVIDENCE AND SCORES:\n"
                            f"{context_json}"
                        )
                    },
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64_image,

                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API error: {response.text}"
            )

        result = response.json()

        try:
            # Extract text candidate
            text_response = result["candidates"][0]["content"]["parts"][0]["text"]

            # Clean text if it has Markdown formatting
            text_response = text_response.strip()
            if text_response.startswith("```"):
                # strip out ```json and ```
                text_response = re.sub(r"^```(?:json)?\n", "", text_response)
                text_response = re.sub(r"\n```$", "", text_response)
                text_response = text_response.strip()

            analysis_data = json.loads(text_response)
            analysis_data["mode"] = "gemini_ai"
            return analysis_data
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise ValueError(f"Failed to parse Gemini response: {str(e)}. Raw response: {response.text}")
