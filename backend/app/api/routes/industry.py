from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.macro import CapexData
from app.schemas.macro import CapexDataResponse

router = APIRouter()

SUPPLY_CHAIN_MAP = [
    {"ticker": "NVDA", "name": "NVIDIA", "layer": "compute", "sector": "ai_cloud", "description": "GPU accelerators, AI training/inference"},
    {"ticker": "AMD", "name": "AMD", "layer": "compute", "sector": "ai_cloud", "description": "CPUs, GPUs (MI300)"},
    {"ticker": "INTC", "name": "Intel", "layer": "compute", "sector": "semiconductor", "description": "CPUs, foundry services"},
    {"ticker": "QCOM", "name": "Qualcomm", "layer": "chip", "sector": "semiconductor", "description": "Mobile SoC, edge AI chips"},
    {"ticker": "TSM", "name": "TSMC", "layer": "foundry", "sector": "semiconductor", "description": "Leading semiconductor foundry"},
    {"ticker": "ASML", "name": "ASML", "layer": "equipment", "sector": "equipment", "description": "EUV lithography systems"},
    {"ticker": "AMAT", "name": "Applied Materials", "layer": "equipment", "sector": "equipment", "description": "Semiconductor manufacturing equipment"},
    {"ticker": "LRCX", "name": "Lam Research", "layer": "equipment", "sector": "equipment", "description": "Etch and deposition equipment"},
    {"ticker": "KLAC", "name": "KLA Corp", "layer": "equipment", "sector": "equipment", "description": "Process control and yield"},
    {"ticker": "SMCI", "name": "Super Micro", "layer": "compute", "sector": "ai_cloud", "description": "AI server systems"},
]


@router.get("/supply-chain")
async def get_supply_chain(
    _: object = Depends(get_current_user),
):
    return {"nodes": SUPPLY_CHAIN_MAP}


@router.get("/capex", response_model=List[CapexDataResponse])
async def get_capex(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_user),
):
    result = await db.execute(
        select(CapexData).order_by(CapexData.company, CapexData.fiscal_quarter)
    )
    return result.scalars().all()
