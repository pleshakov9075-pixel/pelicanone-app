from fastapi import APIRouter

from app.core.presets import list_presets
from app.core.schemas import PresetList

router = APIRouter(prefix="/presets", tags=["presets"])


@router.get("", response_model=PresetList)
async def get_presets():
    return PresetList(items=list_presets())
