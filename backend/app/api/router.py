"""Main API router that aggregates all endpoint routers."""
from fastapi import APIRouter
from app.api import auth, health, predict, explain, predictions

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(health.router)
api_router.include_router(predict.router)
api_router.include_router(explain.router)
api_router.include_router(predictions.router)