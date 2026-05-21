# Trading Dashboard

AI/半导体板块催化剂驱动交易策略平台。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite + Tailwind CSS + React Query + Recharts |
| 后端 | Python 3.11 + FastAPI + SQLAlchemy + APScheduler |
| 数据库 | PostgreSQL 15 |
| 容器 | Docker + Docker Compose |

## 快速启动（本地开发）

### 1. 配置环境变量

```bash
cp .env.example backend/.env
# 编辑 backend/.env，填写 API Keys：
# FRED_API_KEY=...
# ANTHROPIC_API_KEY=...
```

### 2. 启动服务

```bash
docker compose -f docker-compose.dev.yml up --build
```

服务地址：
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

### 3. 数据库迁移

```bash
docker compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

### 4. 初始化股票列表（可选）

```bash
docker compose -f docker-compose.dev.yml exec backend python -c "
import asyncio
from app.database import AsyncSessionLocal
from app.models.stock import Stock

async def seed():
    stocks = [
        ('NVDA', 'NVIDIA', 'ai_cloud', 'compute'),
        ('AMD', 'AMD', 'ai_cloud', 'compute'),
        ('TSM', 'TSMC', 'semiconductor', 'foundry'),
        ('ASML', 'ASML', 'equipment', 'equipment'),
        ('SMCI', 'Super Micro', 'ai_cloud', 'compute'),
        ('AMAT', 'Applied Materials', 'equipment', 'equipment'),
        ('LRCX', 'Lam Research', 'equipment', 'equipment'),
        ('KLAC', 'KLA Corp', 'equipment', 'equipment'),
        ('INTC', 'Intel', 'semiconductor', 'compute'),
        ('QCOM', 'Qualcomm', 'semiconductor', 'chip'),
    ]
    async with AsyncSessionLocal() as db:
        for ticker, name, sector, layer in stocks:
            s = Stock(ticker=ticker, name=name, sector=sector, supply_chain_layer=layer)
            db.add(s)
        await db.commit()

asyncio.run(seed())
"
```

## 功能模块

- **每日概览** — 宏观信号看板 + 关注股票涨跌 + 高影响新闻
- **个股研究** — 价格/技术图表 + 期权数据 + 相关新闻
- **行业全景** — AI供应链地图 + 大厂Capex趋势
- **催化剂日历** — 财报/宏观事件 + 用户预判填写
- **交易日志** — 完整进出场记录 + 复盘笔记 + 统计分析

## 定时任务

| 任务 | 频率 | 来源 |
|---|---|---|
| 价格+技术指标 | 每15分钟（交易时段） | yfinance |
| 宏观数据 | 每天 8:00 ET | FRED + yfinance |
| 新闻抓取+LLM处理 | 每30分钟 | RSS + Claude |
| 期权快照 | 每小时（交易时段） | yfinance |
| 财报日历 | 每天 7:00 ET | yfinance |

## 生产部署

```bash
# 编辑 backend/.env 设置 ENVIRONMENT=production
docker compose -f docker-compose.prod.yml up --build -d
```

## API 文档

启动后访问 http://localhost:8000/docs 查看完整 Swagger 文档。
