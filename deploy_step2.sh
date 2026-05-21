#!/bin/bash
# Trading Dashboard 部署第二步 — 启动服务
set -e
cd /opt/trading

echo "=== [6/7] 创建生产环境配置 ==="
cat > backend/.env << 'EOF'
DATABASE_URL=postgresql+asyncpg://trading_user:trading_pass_2026@db:5432/trading_db
POSTGRES_DB=trading_db
POSTGRES_USER=trading_user
POSTGRES_PASSWORD=trading_pass_2026
FRED_API_KEY=1d88391e49b493f02b4915b37f8ec264
ANTHROPIC_API_KEY=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
BENZINGA_API_KEY=
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
ENVIRONMENT=production
CORS_ORIGINS=http://64.177.113.222,https://64.177.113.222
EOF

echo "=== [7/7] 启动 Docker Compose ==="
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "=== 部署完成 ==="
echo "访问地址: http://64.177.113.222"
docker compose -f docker-compose.prod.yml ps
