PRAGMA foreign_keys = ON;

-- Cloud Checkin 的运行时设置中，密码哈希、会话有效期和日志保留天数以 D1 为权威来源。
-- Cron Triggers 由 Wrangler 配置管理，不写入 app_settings。

-- 站点表：存储所有 API 站点的配置信息
CREATE TABLE IF NOT EXISTS api_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 站点唯一标识符
  name TEXT NOT NULL,                     -- 站点名称
  url TEXT NOT NULL,                      -- 站点基础 URL
  api_type TEXT NOT NULL,                 -- API 类型（NewApi、OneApi、Veloera 等）
  account_label TEXT,                     -- 账户标签（用于区分同一 URL 的多个账户）
  sort_order INTEGER DEFAULT 0,           -- 排序顺序（数字越小越靠前）
  auth_method TEXT NOT NULL,              -- 认证方式（token、sessions、password）
  auth_value TEXT,                        -- 认证值（token 或 session cookie）
  user_id TEXT,                           -- 用户 ID
  login_username TEXT,                    -- 登录用户名（密码认证模式）
  login_password TEXT,                    -- 登录密码（密码认证模式）
  enabled INTEGER DEFAULT 1,              -- 是否启用（1=启用，0=禁用）
  auto_checkin INTEGER DEFAULT 0,         -- 是否自动签到（1=启用，0=禁用）
  site_username TEXT,                     -- 站点用户名（从用户信息接口获取）
  site_user_group TEXT,                   -- 站点用户组
  site_aff_code TEXT,                     -- 站点推广码
  site_quota REAL DEFAULT 0,              -- 站点总配额（已转换为标准单位）
  site_used_quota REAL DEFAULT 0,         -- 站点已用配额（已转换为标准单位）
  site_request_count INTEGER DEFAULT 0,   -- 站点请求次数统计
  site_aff_count INTEGER DEFAULT 0,       -- 站点推广次数统计
  site_aff_quota REAL DEFAULT 0,          -- 站点推广配额
  site_aff_history_quota REAL DEFAULT 0,  -- 站点历史推广配额
  last_checkin TEXT,                      -- 最后签到时间
  last_checkin_status TEXT,               -- 最后签到状态
  last_check_time TEXT,                   -- 最后检查时间
  last_check_status TEXT DEFAULT 'pending',  -- 最后检查状态（pending、success、failed）
  last_check_message TEXT,                -- 最后检查消息
  remarks TEXT,                           -- 备注信息
  checkin_endpoint TEXT,                  -- 自定义签到端点（路径或完整 URL）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP   -- 更新时间
);

-- 站点表索引
CREATE INDEX IF NOT EXISTS idx_api_sites_enabled ON api_sites(enabled);  -- 按启用状态查询
CREATE INDEX IF NOT EXISTS idx_api_sites_url ON api_sites(url);  -- 按 URL 查询
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_sites_url_name_unique ON api_sites(url, name);  -- URL + 站点名称唯一约束
CREATE INDEX IF NOT EXISTS idx_api_sites_api_type ON api_sites(api_type);  -- 按 API 类型查询
CREATE INDEX IF NOT EXISTS idx_api_sites_auto_checkin ON api_sites(auto_checkin);  -- 按自动签到状态查询
CREATE INDEX IF NOT EXISTS idx_api_sites_last_checkin ON api_sites(last_checkin);  -- 按最后签到时间查询
CREATE INDEX IF NOT EXISTS idx_api_sites_checkin_endpoint ON api_sites(checkin_endpoint);  -- 按签到端点查询
CREATE INDEX IF NOT EXISTS idx_api_sites_enabled_sort_balance ON api_sites(enabled, sort_order, site_quota);  -- 按启用状态、排序、余额查询（用于站点列表排序）

-- 签到日志表：存储所有站点的签到记录
CREATE TABLE IF NOT EXISTS api_site_checkin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- 签到日志唯一标识符
  api_site_id INTEGER NOT NULL,                   -- 关联的站点 ID
  checkin_time TEXT NOT NULL,                     -- 签到时间
  checkin_type TEXT NOT NULL,                     -- 签到类型（manual、auto、batch）
  status TEXT NOT NULL,                           -- 签到状态（success、failed、skipped）
  message TEXT,                                   -- 签到消息
  skip_reason TEXT,                               -- 跳过原因
  failure_reason TEXT,                            -- 失败原因
  balance_before REAL,                            -- 签到前余额
  balance_after REAL,                             -- 签到后余额
  reward_amount REAL,                             -- 签到奖励金额
  new_balance REAL,                               -- 新余额（兼容旧字段）
  response_time REAL,                             -- 响应时间（毫秒）
  http_status_code INTEGER,                       -- HTTP 状态码
  error_details TEXT,                             -- 错误详情
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 创建时间
  FOREIGN KEY (api_site_id) REFERENCES api_sites(id) ON DELETE CASCADE
);

-- 签到日志表索引
CREATE INDEX IF NOT EXISTS idx_api_site_checkin_logs_api_site_id ON api_site_checkin_logs(api_site_id);  -- 按站点 ID 查询
CREATE INDEX IF NOT EXISTS idx_api_site_checkin_logs_status ON api_site_checkin_logs(status);  -- 按签到状态查询
CREATE INDEX IF NOT EXISTS idx_api_site_checkin_logs_created_at ON api_site_checkin_logs(created_at);  -- 按创建时间查询

-- 令牌表：存储站点的 API 令牌信息
CREATE TABLE IF NOT EXISTS api_site_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- 令牌唯一标识符
  api_site_id INTEGER NOT NULL,                   -- 关联的站点 ID
  remote_token_id TEXT,                           -- 远程令牌 ID（从平台获取）
  token_key TEXT NOT NULL,                        -- 令牌密钥（实际的 API 密钥）
  value_status TEXT DEFAULT 'ready',              -- 令牌值状态（ready、masked_pending、missing）
  token_name TEXT,                                -- 令牌名称
  token_group TEXT DEFAULT 'default' NOT NULL,    -- 令牌分组
  source TEXT DEFAULT 'remote',                   -- 令牌来源（remote、import）
  is_active INTEGER DEFAULT 1,                    -- 是否激活（1=激活，0=未激活）
  token_quota REAL,                               -- 令牌配额
  token_used_quota REAL,                          -- 令牌已用配额
  token_unlimited_quota INTEGER DEFAULT 0 NOT NULL,  -- 令牌是否无限配额（1=无限，0=有限）
  created_time TEXT,                              -- 令牌创建时间（从平台获取）
  accessed_time TEXT,                             -- 令牌访问时间（从平台获取）
  expired_time TEXT,                              -- 令牌过期时间（从平台获取）
  last_synced TEXT,                               -- 最后同步时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 创建时间
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 更新时间
  FOREIGN KEY (api_site_id) REFERENCES api_sites(id) ON DELETE CASCADE
);

-- 令牌表索引
CREATE INDEX IF NOT EXISTS idx_api_site_tokens_api_site_id ON api_site_tokens(api_site_id);  -- 按站点 ID 查询
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_site_tokens_site_remote_id_unique ON api_site_tokens(api_site_id, remote_token_id) WHERE remote_token_id IS NOT NULL;  -- 站点 + 远程令牌 ID 唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_site_tokens_site_token_key_unique ON api_site_tokens(api_site_id, token_key);  -- 站点 + 令牌密钥唯一约束
CREATE INDEX IF NOT EXISTS idx_api_site_tokens_is_active ON api_site_tokens(is_active);  -- 按激活状态查询
CREATE INDEX IF NOT EXISTS idx_api_site_tokens_last_synced ON api_site_tokens(last_synced);  -- 按最后同步时间查询
CREATE INDEX IF NOT EXISTS idx_api_site_tokens_value_status ON api_site_tokens(value_status);  -- 按令牌值状态查询

-- 任务日志表：存储站点的定时任务执行记录
CREATE TABLE IF NOT EXISTS api_site_task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- 任务日志唯一标识符
  api_site_id INTEGER NOT NULL,                   -- 关联的站点 ID
  log_date TEXT NOT NULL,                         -- 日志日期（YYYY-MM-DD）
  checkin_status TEXT,                            -- 签到状态
  checkin_time TEXT,                              -- 签到时间
  checkin_message TEXT,                           -- 签到消息
  checkin_error TEXT,                             -- 签到错误
  sync_token_status TEXT,                         -- 令牌同步状态
  sync_token_time TEXT,                           -- 令牌同步时间
  sync_token_message TEXT,                        -- 令牌同步消息
  sync_token_error TEXT,                          -- 令牌同步错误
  query_balance_status TEXT,                      -- 查询余额状态
  query_balance_time TEXT,                        -- 查询余额时间
  query_balance_message TEXT,                     -- 查询余额消息
  query_balance_error TEXT,                       -- 查询余额错误
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 创建时间
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 更新时间
  FOREIGN KEY (api_site_id) REFERENCES api_sites(id) ON DELETE CASCADE
);

-- 任务日志表索引
CREATE INDEX IF NOT EXISTS idx_api_site_task_logs_site_id ON api_site_task_logs(api_site_id);  -- 按站点 ID 查询
CREATE INDEX IF NOT EXISTS idx_api_site_task_logs_log_date ON api_site_task_logs(log_date);  -- 按日志日期查询
CREATE INDEX IF NOT EXISTS idx_api_site_task_logs_site_date ON api_site_task_logs(api_site_id, log_date);  -- 按站点 ID 和日期查询

-- 站点模型表：存储站点支持的 AI 模型信息
CREATE TABLE IF NOT EXISTS api_site_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- 模型唯一标识符
  site_id INTEGER NOT NULL,                       -- 关联的站点 ID
  model_name TEXT NOT NULL,                       -- 模型名称（如 gpt-4o、claude-sonnet）
  model_type TEXT DEFAULT '',                     -- 模型类型（如 chat、embedding）
  is_active INTEGER DEFAULT 1,                    -- 是否激活（1=激活，0=未激活）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 创建时间
  FOREIGN KEY (site_id) REFERENCES api_sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, model_name)                     -- 同一站点不能有重复的模型名称
);

-- 站点模型表索引
CREATE INDEX IF NOT EXISTS idx_api_site_models_site_id ON api_site_models(site_id);  -- 按站点 ID 查询
CREATE INDEX IF NOT EXISTS idx_api_site_models_is_active ON api_site_models(is_active);  -- 按激活状态查询

-- 应用设置表：存储应用程序的配置信息
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,                           -- 设置键名（唯一标识符）
  value TEXT NOT NULL,                            -- 设置值
  type TEXT NOT NULL DEFAULT 'string',            -- 设置类型（string、number、secret、boolean）
  label TEXT NOT NULL DEFAULT '',                 -- 设置标签（显示名称）
  description TEXT NOT NULL DEFAULT '',           -- 设置描述
  category TEXT NOT NULL DEFAULT 'general',       -- 设置分类（auth、logs、scheduler 等）
  sort_order INTEGER DEFAULT 0,                   -- 排序顺序
  editable INTEGER DEFAULT 1,                     -- 是否可编辑（1=可编辑，0=只读）
  options TEXT,                                   -- 选项配置（JSON 格式）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- 创建时间
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP       -- 更新时间
);

-- 初始化应用设置（仅在首次创建时插入）
INSERT OR IGNORE INTO app_settings (key, value, type, label, description, category, sort_order, editable, options)
VALUES
  -- 认证安全设置
  ('auth.password_hash', 'uqgJnDIKp0-i_DXpcpD4cfDtHZ00Rayw43sHvHvMrBo', 'secret', '登录密码哈希', '登录密码 PBKDF2 哈希，初始化默认密码为 change-this-password。', 'auth_secret', 1, 0, NULL),
  ('auth.password_salt', 'Y2xvdWQtY2hlY2tpbi1kZQ', 'secret', '登录密码盐值', '登录密码 PBKDF2 salt。', 'auth_secret', 2, 0, NULL),
  ('auth.password_iterations', '100000', 'secret', '登录密码迭代次数', '登录密码 PBKDF2 迭代次数。', 'auth_secret', 3, 0, NULL),

  -- 认证分类元数据
  ('meta.category.auth.title', '认证与会话', 'string', '分类标题', '设置页分组标题。', 'meta', 4, 0, NULL),
  ('meta.category.auth.description', '登录密码保存在 D1，SESSION_SECRET 仍由 Cloudflare Secret 管理。', 'string', '分类说明', '设置页分组说明。', 'meta', 5, 0, NULL),
  ('meta.category.auth.sort_order', '10', 'number', '分类排序', '设置页分组排序。', 'meta', 6, 0, NULL),

  -- 定时任务分类元数据
  ('meta.category.scheduler.title', '定时任务', 'string', '分类标题', '设置页分组标题。', 'meta', 7, 0, NULL),
  ('meta.category.scheduler.description', 'Cron 由 wrangler.toml 维护，这里只读展示当前配置。', 'string', '分类说明', '设置页分组说明。', 'meta', 8, 0, NULL),
  ('meta.category.scheduler.sort_order', '20', 'number', '分类排序', '设置页分组排序。', 'meta', 9, 0, NULL),

  -- 会话设置
  ('session.ttl_seconds', '2592000', 'number', '会话有效期', '登录会话有效秒数，修改后对新登录会话生效。', 'auth', 10, 1, '{"min":300,"max":31536000,"step":300,"unit":"秒"}'),

  -- 日志分类元数据
  ('meta.category.logs.title', '历史记录', 'string', '分类标题', '设置页分组标题。', 'meta', 11, 0, NULL),
  ('meta.category.logs.description', '历史记录保留策略由数据库设置驱动。', 'string', '分类说明', '设置页分组说明。', 'meta', 12, 0, NULL),
  ('meta.category.logs.sort_order', '30', 'number', '分类排序', '设置页分组排序。', 'meta', 13, 0, NULL),

  -- 日志保留设置
  ('logs.retention_days', '31', 'number', '历史记录保留天数', '清理任务会删除早于该天数的签到日志和任务日志。', 'logs', 40, 1, '{"min":1,"max":3650,"step":1,"unit":"天"}');
