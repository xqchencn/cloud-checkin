PRAGMA foreign_keys = ON;

-- Cloud Checkin 的运行时设置中，密码哈希、会话有效期和日志保留天数以 D1 为权威来源。
-- Cron Triggers 由 Wrangler 配置管理，不写入 app_settings。

CREATE TABLE IF NOT EXISTS api_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_type TEXT NOT NULL,
  account_label TEXT,
  sort_order INTEGER DEFAULT 0,
  auth_method TEXT NOT NULL,
  auth_value TEXT,
  user_id TEXT,
  login_username TEXT,
  login_password TEXT,
  enabled INTEGER DEFAULT 1,
  auto_checkin INTEGER DEFAULT 0,
  site_username TEXT,
  site_user_group TEXT,
  site_aff_code TEXT,
  site_quota REAL DEFAULT 0,
  site_used_quota REAL DEFAULT 0,
  site_request_count INTEGER DEFAULT 0,
  site_aff_count INTEGER DEFAULT 0,
  site_aff_quota REAL DEFAULT 0,
  site_aff_history_quota REAL DEFAULT 0,
  last_checkin TEXT,
  last_checkin_status TEXT,
  last_check_time TEXT,
  last_check_status TEXT DEFAULT 'pending',
  last_check_message TEXT,
  remarks TEXT,
  checkin_endpoint TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_sites_enabled ON api_sites(enabled);
CREATE INDEX IF NOT EXISTS idx_api_sites_url ON api_sites(url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_sites_url_account_label_unique ON api_sites(url, account_label) WHERE account_label IS NOT NULL AND account_label != '';
CREATE INDEX IF NOT EXISTS idx_api_sites_api_type ON api_sites(api_type);
CREATE INDEX IF NOT EXISTS idx_api_sites_auto_checkin ON api_sites(auto_checkin);
CREATE INDEX IF NOT EXISTS idx_api_sites_last_checkin ON api_sites(last_checkin);
CREATE INDEX IF NOT EXISTS idx_api_sites_checkin_endpoint ON api_sites(checkin_endpoint);
CREATE INDEX IF NOT EXISTS idx_api_sites_enabled_sort_balance ON api_sites(enabled, sort_order, site_quota);

CREATE TABLE IF NOT EXISTS api_site_checkin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_site_id INTEGER NOT NULL,
  checkin_time TEXT NOT NULL,
  checkin_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  skip_reason TEXT,
  failure_reason TEXT,
  balance_before REAL,
  balance_after REAL,
  reward_amount REAL,
  new_balance REAL,
  response_time REAL,
  http_status_code INTEGER,
  error_details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_site_id) REFERENCES api_sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_site_checkin_logs_api_site_id ON api_site_checkin_logs(api_site_id);
CREATE INDEX IF NOT EXISTS idx_api_site_checkin_logs_status ON api_site_checkin_logs(status);
CREATE INDEX IF NOT EXISTS idx_api_site_checkin_logs_created_at ON api_site_checkin_logs(created_at);

CREATE TABLE IF NOT EXISTS api_site_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_site_id INTEGER NOT NULL,
  remote_token_id TEXT,
  token_key TEXT NOT NULL,
  value_status TEXT DEFAULT 'ready',
  token_name TEXT,
  token_group TEXT DEFAULT 'default' NOT NULL,
  source TEXT DEFAULT 'remote',
  is_active INTEGER DEFAULT 1,
  token_quota REAL,
  token_used_quota REAL,
  token_unlimited_quota INTEGER DEFAULT 0 NOT NULL,
  created_time TEXT,
  accessed_time TEXT,
  expired_time TEXT,
  last_synced TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_site_id) REFERENCES api_sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_site_tokens_api_site_id ON api_site_tokens(api_site_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_site_tokens_site_remote_id_unique ON api_site_tokens(api_site_id, remote_token_id) WHERE remote_token_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_site_tokens_site_token_key_unique ON api_site_tokens(api_site_id, token_key);
CREATE INDEX IF NOT EXISTS idx_api_site_tokens_is_active ON api_site_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_api_site_tokens_last_synced ON api_site_tokens(last_synced);
CREATE INDEX IF NOT EXISTS idx_api_site_tokens_value_status ON api_site_tokens(value_status);

CREATE TABLE IF NOT EXISTS api_site_task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_site_id INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  checkin_status TEXT,
  checkin_time TEXT,
  checkin_message TEXT,
  checkin_error TEXT,
  sync_token_status TEXT,
  sync_token_time TEXT,
  sync_token_message TEXT,
  sync_token_error TEXT,
  query_balance_status TEXT,
  query_balance_time TEXT,
  query_balance_message TEXT,
  query_balance_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_site_id) REFERENCES api_sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_site_task_logs_site_id ON api_site_task_logs(api_site_id);
CREATE INDEX IF NOT EXISTS idx_api_site_task_logs_log_date ON api_site_task_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_api_site_task_logs_site_date ON api_site_task_logs(api_site_id, log_date);

CREATE TABLE IF NOT EXISTS api_site_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  model_name TEXT NOT NULL,
  model_type TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES api_sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, model_name)
);

CREATE INDEX IF NOT EXISTS idx_api_site_models_site_id ON api_site_models(site_id);
CREATE INDEX IF NOT EXISTS idx_api_site_models_is_active ON api_site_models(is_active);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string',
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  editable INTEGER DEFAULT 1,
  options TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_settings (key, value, type, label, description, category, sort_order, editable, options)
VALUES
  ('auth.password_hash', 'moo80zKiLhD_jeLkIlPhhODo3BZKcpBLOkqm8QTrcMQ', 'secret', '登录密码哈希', '登录密码 PBKDF2 哈希，初始化默认密码为 change-this-password。', 'auth_secret', 1, 0, NULL),
  ('auth.password_salt', 'Y2xvdWQtY2hlY2tpbi1kZQ', 'secret', '登录密码盐值', '登录密码 PBKDF2 salt。', 'auth_secret', 2, 0, NULL),
  ('auth.password_iterations', '210000', 'secret', '登录密码迭代次数', '登录密码 PBKDF2 迭代次数。', 'auth_secret', 3, 0, NULL),
  ('meta.category.auth.title', '认证与会话', 'string', '分类标题', '设置页分组标题。', 'meta', 4, 0, NULL),
  ('meta.category.auth.description', '登录密码保存在 D1，SESSION_SECRET 仍由 Cloudflare Secret 管理。', 'string', '分类说明', '设置页分组说明。', 'meta', 5, 0, NULL),
  ('meta.category.auth.sort_order', '10', 'number', '分类排序', '设置页分组排序。', 'meta', 6, 0, NULL),
  ('meta.category.scheduler.title', '定时任务', 'string', '分类标题', '设置页分组标题。', 'meta', 7, 0, NULL),
  ('meta.category.scheduler.description', 'Cron 由 wrangler.toml 维护，这里只读展示当前配置。', 'string', '分类说明', '设置页分组说明。', 'meta', 8, 0, NULL),
  ('meta.category.scheduler.sort_order', '20', 'number', '分类排序', '设置页分组排序。', 'meta', 9, 0, NULL),
  ('session.ttl_seconds', '2592000', 'number', '会话有效期', '登录会话有效秒数，修改后对新登录会话生效。', 'auth', 10, 1, '{"min":300,"max":31536000,"step":300,"unit":"秒"}'),
  ('meta.category.logs.title', '历史记录', 'string', '分类标题', '设置页分组标题。', 'meta', 11, 0, NULL),
  ('meta.category.logs.description', '历史记录保留策略由数据库设置驱动。', 'string', '分类说明', '设置页分组说明。', 'meta', 12, 0, NULL),
  ('meta.category.logs.sort_order', '30', 'number', '分类排序', '设置页分组排序。', 'meta', 13, 0, NULL),
  ('logs.retention_days', '31', 'number', '历史记录保留天数', '清理任务会删除早于该天数的签到日志和任务日志。', 'logs', 40, 1, '{"min":1,"max":3650,"step":1,"unit":"天"}');
