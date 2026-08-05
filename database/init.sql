-- 初始化数据库与账号（docker-compose 首次启动时自动执行）
CREATE USER IF NOT EXISTS btc_dca WITH PASSWORD 'btc_dca';
CREATE DATABASE IF NOT EXISTS btc_dca OWNER btc_dca;
GRANT ALL PRIVILEGES ON DATABASE btc_dca TO btc_dca;
