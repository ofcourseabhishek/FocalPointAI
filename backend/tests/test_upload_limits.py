"""Streaming upload-size boundary coverage."""

import unittest
from unittest.mock import AsyncMock

from fastapi import HTTPException

from app.services.metadata import MAX_IMAGE_UPLOAD_BYTES, read_image_bytes


class ImageUploadLimitTests(unittest.IsolatedAsyncioTestCase):
    async def test_accepts_an_image_at_the_20_mib_boundary(self):
        payload = b"x" * MAX_IMAGE_UPLOAD_BYTES
        upload = AsyncMock()
        upload.read.return_value = payload

        result = await read_image_bytes(upload)

        self.assertIs(result, payload)
        upload.read.assert_awaited_once_with(MAX_IMAGE_UPLOAD_BYTES + 1)

    async def test_rejects_an_image_one_byte_above_the_20_mib_boundary(self):
        upload = AsyncMock()
        upload.read.return_value = b"x" * (MAX_IMAGE_UPLOAD_BYTES + 1)

        with self.assertRaises(HTTPException) as context:
            await read_image_bytes(upload)

        self.assertEqual(context.exception.status_code, 413)
        self.assertEqual(context.exception.detail, "Uploaded image exceeds 20 MiB")
        upload.read.assert_awaited_once_with(MAX_IMAGE_UPLOAD_BYTES + 1)


if __name__ == "__main__":
    unittest.main()
