# FocalPointAI Roadmap

## Vision

FocalPointAI is an AI-powered photography mentor that critiques photographs and helps photographers improve through personalized feedback, learning resources, and progress tracking.

---

# Current Progress

### Core Platform

* Modern React + Vite frontend
* FastAPI backend
* Drag-and-drop image upload
* Interactive photography analysis dashboard
* Dual analysis engine (Gemini AI + OpenCV fallback)
* Detailed photography scores and actionable editing suggestions
* Responsive HTML email reports
* Automated testing suite

The current version is a functional MVP that can deliver AI-powered photography critiques even when cloud AI services are unavailable.

---

# Development Roadmap

## Phase 1 - EXIF Intelligence and RAW File Support

Make every critique context-aware by reading camera metadata and supporting professional image formats.

### Features

* RAW image upload and decoding
* RAW preview generation
* Preserve EXIF metadata through the upload and analysis pipeline
* Camera model and lens detection
* Aperture, ISO, shutter speed, white balance, and focal-length extraction
* Context-aware recommendations based on capture settings

### Example Feedback

> ISO 6400 detected. Consider lowering ISO or using a tripod to reduce image noise while preserving detail.

---

## Phase 2 - Enhanced Computer Vision

Expand the local analysis engine beyond basic heuristics.

### New Capabilities

* Rule-of-thirds detection
* Horizon alignment detection
* Subject positioning analysis
* Blur detection and noise estimation
* Face and eye detection
* Background clutter detection
* Saliency mapping
* Color palette extraction
* Symmetry detection

These improvements ensure meaningful feedback even without cloud AI services.

---

## Phase 3 - AI Crop and Lightroom Preset Suggestions

Turn analysis results into practical editing guidance.

### Features

* AI crop recommendations with suggested aspect ratios and framing
* Crop overlays and before-and-after previews
* Lightroom preset suggestions based on image style, lighting, and color
* Recommended Lightroom adjustments for exposure, contrast, color, and detail
* Exportable editing guidance

---

## Phase 4 - User Authentication

Transform the application from a demo into a personalized platform.

### Features

* User registration and login
* Google OAuth
* Protected routes
* User profiles
* Session management

**Suggested Technologies**

* Clerk or Supabase Authentication
* JWT Authentication

---

## Phase 5 - Persistent Storage

Store every uploaded photograph and analysis.

### Features

* Analysis history
* Photo gallery
* Saved critiques
* Favorite analyses
* User preferences

**Database**

* PostgreSQL
* SQLAlchemy ORM

---

## Phase 6 - Cloud Storage

Store uploaded images securely with optimization, automatic cleanup, and CDN delivery.

**Suggested Providers**

* Cloudinary
* Supabase Storage

---

## Phase 7 - AI Photography Coach

Introduce an interactive AI mentor that can explain scores, recommend camera settings and Lightroom edits, and provide advice for future sessions.

---

## Phase 8 - Progress Tracking

Track total photos analyzed, average scores, skill trends, strengths, weaknesses, monthly improvement, and photography milestones.

---

## Phase 9 - Learning Hub

Provide personalized lessons, practice assignments, weekly challenges, genre-specific tutorials, and skill recommendations based on the user's weakest areas.

---

## Phase 10 - Community Platform

Enable public portfolios, community critiques, before-and-after comparisons, weekly contests, likes, comments, and photographer profiles.

---

## Phase 11 - Professional Features

* Batch image analysis
* Portfolio review mode
* Photography genre classification
* Viewer attention heatmaps
* Camera setting recommendations
* Personalized improvement plans

---

# Long-Term Vision

FocalPointAI will evolve from an image critique application into a comprehensive AI photography mentor that gives photographers actionable insights, measurable progress, and a structured path to better images.
