from pydantic import BaseModel, Field


class TopUpRequest(BaseModel):
    amount: int = Field(..., ge=1)
