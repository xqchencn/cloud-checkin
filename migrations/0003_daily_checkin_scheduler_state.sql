PRAGMA foreign_keys = ON;

-- Free 计划下的每日签到调度状态。
-- 记录当天批次游标、失败重试队列和重试次数；页面不展示，Worker 内部维护。
INSERT OR IGNORE INTO app_settings (key, value, type, label, description, category, sort_order, editable, options)
VALUES (
  'scheduler.checkin_daily_state',
  '',
  'secret',
  '每日签到调度状态',
  'Worker 内部使用：记录每日分批签到进度、失败队列和重试次数。',
  'scheduler',
  0,
  0,
  NULL
);
