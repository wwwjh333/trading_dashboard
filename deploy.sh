#!/bin/bash
# Trading Dashboard 一键部署脚本 — Ubuntu 24.04
set -e

echo "=== [1/7] 系统更新 ==="
apt-get update -qq && apt-get upgrade -y -qq

echo "=== [2/7] 安装 Docker ==="
apt-get install -y -qq ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker && systemctl start docker
echo "Docker 安装完成: $(docker --version)"

echo "=== [3/7] 安装其他工具 ==="
apt-get install -y -qq git nginx certbot python3-certbot-nginx ufw

echo "=== [4/7] 防火墙配置 ==="
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "防火墙已配置"

echo "=== [5/7] 克隆/上传项目 ==="
mkdir -p /opt/trading
cd /opt/trading
echo "请手动上传项目文件到 /opt/trading 后继续运行 step6.sh"

echo "=== 基础环境准备完成 ==="
echo ""
echo "下一步："
echo "1. 上传项目: scp -r D:/trading_dashboard/* root@64.177.113.222:/opt/trading/"
echo "2. 运行: bash /opt/trading/deploy_step2.sh"
