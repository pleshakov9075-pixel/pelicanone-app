from functools import lru_cache
from pydantic import BaseModel, Field
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

    jwt_secret: str = Field(default="change-me", validation_alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60 * 24 * 7

    telegram_bot_token: str = Field(default="", validation_alias="TELEGRAM_BOT_TOKEN")
    vk_app_secret: str = Field(default="", validation_alias="VK_APP_SECRET")
    dev_auth: bool = Field(default=False, validation_alias="DEV_AUTH")

    genapi_base_url: str = Field(
        default="https://api.gen-api.ru/api/v1", validation_alias="GENAPI_BASE_URL"
    )
    genapi_api_key: str = Field(default="", validation_alias="GENAPI_API_KEY")

    credit_topup_packages: list[int] = [100, 300, 500]


@lru_cache
def get_settings() -> Settings:
    return Settings()


class CostTable(BaseModel):
    text: int = 1
    image: int = 10
    video: int = 50
    audio: int = 5
    upscale: int = 3
    edit: int = 8


COST_TABLE = CostTable()
