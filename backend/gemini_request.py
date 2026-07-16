import base64
import re
import httpx
from fastapi import HTTPException
import json


async def analyze_gemini(image_bytes: bytes, exif: str, api_key: str) -> dict:
    """
    Call Gemini API to perform multi-modal analysis on the image.
    """
    # Encode image in base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"

    headers = {
        "Content-Type": "application/json"
    }

    with open("prompt.txt", "r") as f:
        prompt = f.read()

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{prompt}\n\nImage EXIF Metadata:\n{exif}"},
                    {
                        "inlineData": {
                            "mimeType": "image/jpeg",
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