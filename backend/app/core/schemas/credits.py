import uuid
from pydantic import BaseModel


class CreditTxOut(BaseModel):
    id: uuid.UUID
    delta: int
    reason: str
    job_id: uuid.UUID | None

    class Config:
        from_attributes = True


class CreditBalance(BaseModel):
    balance: int


class CreditTxList(BaseModel):
    items: list[CreditTxOut]
    total: int
