from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "PelicanOne API"
    environment: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"

    database_url: str = Field(
        default="postgresql+asyncpg://pelican:pelican@db:5432/pelican",
        validation_alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://redis:6379/0", validation_alias="REDIS_URL")

    telegram_bot_token: str = Field(default="", validation_alias="TELEGRAM_BOT_TOKEN")
    admin_telegram_ids: str = Field(default="", validation_alias="ADMIN_TELEGRAM_IDS")

    genapi_base_url: str = Field(
        default="https://api.gen-api.ru/api/v1", validation_alias="GENAPI_BASE_URL"
    )
    genapi_api_key: str = Field(default="", validation_alias="GENAPI_API_KEY")
    text_model: str = Field(default="gpt-5-2", validation_alias="TEXT_MODEL")

    media_dir: str = Field(default="/app/media", validation_alias="MEDIA_DIR")
    media_base_url: str = Field(default="/media", validation_alias="MEDIA_BASE_URL")
    media_ttl_seconds: int = Field(default=60 * 60 * 24, validation_alias="MEDIA_TTL_SECONDS")
    media_cleanup_interval_seconds: int = Field(
        default=10 * 60, validation_alias="MEDIA_CLEANUP_INTERVAL_SECONDS"
    )

    price_text_rub: int = Field(default=1, validation_alias="PRICE_TEXT_RUB")
    price_image_rub: int = Field(default=9, validation_alias="PRICE_IMAGE_RUB")
    price_video_rub: int = Field(default=50, validation_alias="PRICE_VIDEO_RUB")
    price_audio_rub: int = Field(default=5, validation_alias="PRICE_AUDIO_RUB")
    price_upscale_rub: int = Field(default=3, validation_alias="PRICE_UPSCALE_RUB")
    price_edit_rub: int = Field(default=8, validation_alias="PRICE_EDIT_RUB")

    credit_topup_packages: list[int] = [100, 300, 500]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def build_cost_table(settings: Settings) -> dict[str, int]:
    return {
        "text": settings.price_text_rub,
        "image": settings.price_image_rub,
        "video": settings.price_video_rub,
        "audio": settings.price_audio_rub,
        "upscale": settings.price_upscale_rub,
        "edit": settings.price_edit_rub,
    }
