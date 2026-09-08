"""FastAPI application factory."""

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.analysis import router

ALLOWED_ORIGINS = [
    "https://snapgradebyark.vercel.app",
    "https://snapgrade-app.vercel.app",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]


def create_app() -> FastAPI:
    """Create the public API while keeping ``main:app`` deployment-compatible."""
    load_dotenv()
    app = FastAPI(title="Snapgrade Backend")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


__all__ = ["create_app"]
