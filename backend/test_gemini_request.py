import unittest

from fastapi import HTTPException

try:
    from .gemini_request import classify_gemini_error
except ImportError:
    from gemini_request import classify_gemini_error


class GeminiErrorClassificationTests(unittest.TestCase):
    def test_rate_limit_status(self):
        error = HTTPException(
            status_code=429,
            detail="RESOURCE_EXHAUSTED: project quota exceeded",
        )
        self.assertEqual(classify_gemini_error(error), "rate_limited")

    def test_other_statuses(self):
        self.assertEqual(
            classify_gemini_error(HTTPException(status_code=403, detail="Forbidden")),
            "authentication_error",
        )
        self.assertEqual(classify_gemini_error(TimeoutError("Request timed out")), "timeout")
        self.assertEqual(classify_gemini_error(RuntimeError("Bad response")), "failed")


if __name__ == "__main__":
    unittest.main()
