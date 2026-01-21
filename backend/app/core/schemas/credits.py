import uuid
from pydantic import BaseModel, Field


class CreditLedgerOut(BaseModel):
    id: uuid.UUID
    delta: int
    reason: str
    job_id: uuid.UUID | None
    provider_payment_id: str | None

    class Config:
        from_attributes = True


class CreditBalance(BaseModel):
    balance: int


class CreditLedgerList(BaseModel):
    items: list[CreditLedgerOut]
    total: int


class AdminCreditAddRequest(BaseModel):
    platform_user_id: int
    amount: int


class AdminCreditAddResponse(BaseModel):
    platform_user_id: int
    balance: int


class AdminTopupRequest(BaseModel):
    user_id: int
    amount: int
    reason: str = Field(default="manual_topup")


class AdminTopupResponse(BaseModel):
    ok: bool
    user_id: int
    new_balance: int
    ledger_id: uuid.UUID
