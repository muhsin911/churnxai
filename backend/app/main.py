"""Main FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.exceptions import ChurnXAIError
from app.utils.logging import setup_logging, get_logger
from app.api.router import api_router
from app.ml.predictor import predictor

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager handles startup and shutdown events.
    We load the heavy ML model ONCE at startup, not on every request.
    """
    # --- STARTUP ---
    setup_logging()
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    try:
        predictor.load()
        logger.info("✅ ML Model loaded successfully at startup.")
    except Exception as e:
        logger.error(f"❌ Failed to load ML model at startup: {e}")
    
    yield  # Application runs here
    
    # --- SHUTDOWN ---
    logger.info("🛑 Shutting down application.")

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade MLOps API for explainable customer churn prediction.",
    lifespan=lifespan,
)

# Add CORS middleware to allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler for our custom ChurnXAI errors
@app.exception_handler(ChurnXAIError)
async def churnxai_exception_handler(request, exc: ChurnXAIError):
    return exc.to_http_exception()

# Include the API routers with the configured prefix (e.g., /api/v1)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "documentation": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }