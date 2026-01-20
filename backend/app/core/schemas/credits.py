import uuid
from pydantic import BaseModel


class CreditLedgerOut(BaseModel):
    id: uuid.UUID
    delta: int
    reason: str
    job_id: uuid.UUID | None

    class Config:
        from_attributes = True


class CreditBalance(BaseModel):
    balance: int


class CreditLedgerList(BaseModel):
    items: list[CreditLedgerOut]
    total: int
