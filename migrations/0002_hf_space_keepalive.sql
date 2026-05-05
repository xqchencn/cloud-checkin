PRAGMA foreign_keys = ON;

-- Hugging Face 用户表：存储公开用户名和最近同步时间，不保存 HF Token。
CREATE TABLE IF NOT EXISTS hf_space_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- HF 用户本地唯一标识符
  username TEXT NOT NULL,                         -- Hugging Face 用户名（如 cnxqchen）
  source_input TEXT NOT NULL,                     -- 用户添加时输入的原始内容（用户名、个人主页或 Spaces 地址）
  last_synced_at TEXT,                            -- 最近一次从 Hugging Face 拉取 Space 列表的时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 创建时间
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP       -- 更新时间
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hf_space_users_username ON hf_space_users(username);

-- Hugging Face Space 保活目标表。
CREATE TABLE IF NOT EXISTS hf_space_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- HF Space 保活目标本地唯一标识符
  hf_user_id INTEGER NOT NULL,                    -- 关联的 HF 用户 ID
  space_id TEXT NOT NULL,                         -- Hugging Face Space 标识（owner/name）
  space_name TEXT NOT NULL,                       -- Space 短名称（不含 owner）
  title TEXT,                                     -- Space 展示标题（优先来自 cardData.title）
  alias TEXT NOT NULL,                            -- Space 别名，默认等于原项目名，可由用户手动修改
  base_url TEXT NOT NULL,                         -- Space 应用基础地址（如 https://xxx.hf.space）
  keepalive_url TEXT NOT NULL,                    -- 实际定时请求地址，必须与 base_url 同源
  runtime_stage TEXT,                             -- Hugging Face runtime 阶段（RUNNING、PAUSED 等）
  domain_stage TEXT,                              -- Hugging Face 运行域名阶段（来自 runtime.domains）
  enabled INTEGER DEFAULT 1 NOT NULL,             -- 是否启用保活（1=启用，0=禁用）
  last_checked_at TEXT,                           -- 最近一次保活请求时间
  last_status TEXT,                               -- 最近一次保活结果（success、failed）
  last_http_status INTEGER,                       -- 最近一次保活 HTTP 状态码
  last_latency_ms INTEGER,                        -- 最近一次保活请求耗时（毫秒）
  last_error TEXT,                                -- 最近一次保活失败原因
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 创建时间
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 更新时间
  FOREIGN KEY (hf_user_id) REFERENCES hf_space_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hf_space_targets_user_id ON hf_space_targets(hf_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hf_space_targets_space_id ON hf_space_targets(space_id);
CREATE INDEX IF NOT EXISTS idx_hf_space_targets_enabled ON hf_space_targets(enabled);

-- Hugging Face Space 保活日志表。
CREATE TABLE IF NOT EXISTS hf_space_keepalive_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- 保活日志唯一标识符
  target_id INTEGER NOT NULL,                     -- 关联的 HF Space 保活目标 ID
  hf_user_id INTEGER NOT NULL,                    -- 关联的 HF 用户 ID，便于按用户筛选日志
  space_id TEXT NOT NULL,                         -- 请求时对应的 Space 标识（owner/name）
  request_url TEXT NOT NULL,                      -- 本次实际请求的保活地址
  status TEXT NOT NULL,                           -- 请求结果（success、failed）
  http_status INTEGER,                            -- HTTP 状态码，网络错误时为空
  latency_ms INTEGER,                             -- 请求耗时（毫秒）
  response_excerpt TEXT,                          -- 响应正文摘要，最多保留一小段用于排查
  error TEXT,                                     -- 失败错误信息或非 2xx/3xx 状态描述
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 创建时间
  FOREIGN KEY (target_id) REFERENCES hf_space_targets(id) ON DELETE CASCADE,
  FOREIGN KEY (hf_user_id) REFERENCES hf_space_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hf_space_keepalive_logs_created_at ON hf_space_keepalive_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_hf_space_keepalive_logs_target_created ON hf_space_keepalive_logs(target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hf_space_keepalive_logs_user_created ON hf_space_keepalive_logs(hf_user_id, created_at);
