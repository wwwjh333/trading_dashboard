from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@db:5432/trading_db"

    FRED_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    BENZINGA_API_KEY: str = ""

    JWT_SECRET_KEY: str = "change_this_secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080

    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    WATCH_TICKERS: List[str] = [
        "NVDA", "AMD", "TSM", "ASML", "SMCI",
        "AMAT", "LRCX", "KLAC", "INTC", "QCOM"
    ]

    CAPEX_COMPANIES: List[str] = ["MSFT", "GOOG", "META", "AMZN"]

    # 行业全景固定跟踪（不在 watchlist，但维护价格数据）
    INDUSTRY_TICKERS: List[str] = [
        "MSFT", "AMZN", "GOOG",           # 云厂商
        "DELL",                             # 服务器
        "MU",                               # HBM/存储
        "AMKR", "ENTG",                     # 晶圆/封装/材料
    ]

    MACRO_INDICATORS: List[str] = ["DGS10", "DGS2", "VIXCLS", "SOX", "DXY"]

    # i18n / LLM
    SUMMARY_LANGUAGE: str = "zh"   # "zh" or "en"

    # Claude API cost control
    LLM_DAILY_LIMIT: int = 100
    LLM_BATCH_SIZE: int = 5

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
