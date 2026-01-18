from typing import Any
from pydantic import BaseModel


class PresetField(BaseModel):
    name: str
    label: str
    type: str
    required: bool
    default: Any | None = None
    enum: list[Any] | None = None


class PresetOut(BaseModel):
    id: str
    label: str
    job_type: str
    network_id: str
    eta_seconds: int | None = None
    poll_interval_seconds: float | None = None
    timeout_seconds: int | None = None
    fields: list[PresetField]


class PresetList(BaseModel):
    items: list[PresetOut]
