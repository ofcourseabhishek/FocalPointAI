import os
import unittest
from email import message_from_string
from unittest.mock import MagicMock, patch

from main import generate_email_content, send_report_email_async


class EmailContentTests(unittest.TestCase):
    def setUp(self):
        self.analysis = {
            "filename": "portrait <final>.jpg",
            "overall_rating": 8.4,
            "mode": "gemini_ai",
            "first_impression": "Strong subject separation & natural light.",
            "suggested_edits": [
                {"key": "brightness", "text": "Raise exposure by +0.20 EV."},
            ],
            "aspects": {
                "composition": {
                    "rating": 84,
                    "what_works": "The subject is placed with intent.",
                    "what_could_be_improved": "Leave slightly more headroom.",
                    "suggested_edit_hint": "Crop 2% from the left edge.",
                },
                "brightness": {
                    "rating": 67,
                    "what_works": "Highlights retain detail.",
                    "what_could_be_improved": "Lift the midtones.",
                },
            },
            "exif_analysis": {
                "camera_settings": {
                    "shutter_speed": "1/250s",
                    "aperture": "f/2.8",
                    "iso": 200,
                    "focal_length": "50mm",
                    "camera": "Demo Camera",
                    "lens": "50mm Prime",
                },
                "diagnostics": {
                    "status": "ok",
                    "issue": "Settings are balanced.",
                    "suggestion": "Keep this baseline.",
                },
            },
        }

    def test_dashboard_styling_and_report_sections_are_present(self):
        text_content, html_content = generate_email_content(
            "photographer@example.com", self.analysis, is_simulation=True
        )

        self.assertIn("Constructive Critique Dashboard", html_content)
        self.assertIn("background-color:#020F15", html_content)
        self.assertIn("Camera settings", html_content)
        self.assertIn("Aspect quality metrics", html_content)
        self.assertIn("Raise exposure by +0.20 EV.", html_content)
        self.assertIn("Overall Rating: 8.4 / 10", text_content)

    def test_dynamic_values_are_html_escaped(self):
        _, html_content = generate_email_content(
            "photo+test@example.com", self.analysis, image_bytes=b"demo", is_simulation=True
        )

        self.assertIn("portrait &lt;final&gt;.jpg", html_content)
        self.assertIn("Strong subject separation &amp; natural light.", html_content)
        self.assertNotIn("portrait <final>.jpg", html_content)

    @patch("main.smtplib.SMTP")
    @patch("main.smtplib.SMTP_SSL")
    def test_ssl_delivery_uses_ssl_directly_and_embeds_dashboard_html(
        self, smtp_ssl_mock, smtp_mock
    ):
        server = MagicMock()
        smtp_ssl_mock.return_value = server
        smtp_env = {
            "SMTP_HOST": "smtp.example.com",
            "SMTP_PORT": "465",
            "SMTP_USERNAME": "sender@example.com",
            "SMTP_PASSWORD": "app-password",
            "SMTP_SENDER": "FocalPointAI <sender@example.com>",
        }

        with patch.dict(os.environ, smtp_env, clear=True), patch("builtins.print"):
            send_report_email_async(
                "photographer@example.com",
                self.analysis,
                b"image-bytes",
                "portrait.jpg",
            )

        smtp_ssl_mock.assert_called_once_with("smtp.example.com", 465, timeout=15)
        smtp_mock.assert_not_called()
        server.login.assert_called_once_with("sender@example.com", "app-password")
        raw_message = server.sendmail.call_args.args[2]
        self.assertIn("Content-ID: <analyzed_image>", raw_message)
        parsed_message = message_from_string(raw_message)
        html_part = next(
            part for part in parsed_message.walk() if part.get_content_type() == "text/html"
        )
        decoded_html = html_part.get_payload(decode=True).decode("utf-8")
        self.assertIn("Constructive Critique Dashboard", decoded_html)


if __name__ == "__main__":
    unittest.main()
