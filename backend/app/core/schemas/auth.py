from pydantic import BaseModel


class TelegramAuthIn(BaseModel):
    initData: str


class VkAuthIn(BaseModel):
    launchParams: str | dict


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
