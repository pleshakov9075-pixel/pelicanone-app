from fastapi import FastAPI

from app.api.v1.routes import auth, billing, credits, health, jobs, presets
from app.core.settings import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(credits.router, prefix=settings.api_prefix)
app.include_router(billing.router, prefix=settings.api_prefix)
app.include_router(jobs.router, prefix=settings.api_prefix)
app.include_router(presets.router, prefix=settings.api_prefix)
