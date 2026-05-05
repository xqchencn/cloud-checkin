# Hugging Face Spaces 识别调研

## 背景

Hugging Face 用户名为 `cnxqchen`，用户主页地址：

```text
https://huggingface.co/cnxqchen/spaces
```

本调研用于后续新增 Hugging Face Spaces 识别模块，目前只记录请求规律、Space 地址和运行态，不展开实现。

## 识别请求

可用一个列表请求识别该用户下的 7 个 Space，并一次性带出运行态：

```http
GET https://huggingface.co/api/spaces?author=cnxqchen&expand[]=runtime&expand[]=author&expand[]=subdomain&expand[]=cardData
```

关键参数：

- `author=cnxqchen`：按 Hugging Face 用户名过滤 Space。
- `expand[]=runtime`：返回 `runtime.stage`、硬件、实例数、域名状态等运行态字段。
- `expand[]=subdomain`：返回 Space 子域名。
- `expand[]=cardData`：返回 Space 卡片信息，如标题、SDK、端口配置。

注意：

- `GET https://huggingface.co/api/users/cnxqchen/overview` 可以识别 `numSpaces = 7`，但只适合确认数量，不返回 7 个 Space 明细。
- `GET https://huggingface.co/api/spaces?author=cnxqchen&full=true` 可以返回 7 个 Space 的基础仓库信息，但本次验证中 `runtime` 为 `null`，不适合作为状态来源。
- 单个 Space 的详情请求 `GET https://huggingface.co/api/spaces/{owner}/{space}` 也包含 `host` 和 `runtime`，适合作为详情页或二次校验。
- 单个 Space 的运行态请求 `GET https://huggingface.co/api/spaces/{owner}/{space}/runtime` 可直接返回运行态，适合作为状态刷新接口。

## 地址和状态

验证时间：2026-05-04。运行态会随 Hugging Face 平台实时变化，落库或展示时应按需重新请求。

| Space ID | Space 页面 | 应用地址 | SDK | Runtime | Domain | 硬件 | 实例 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `cnxqchen/cx` | `https://huggingface.co/spaces/cnxqchen/cx` | `https://cnxqchen-cx.hf.space` | `docker` | `RUNNING` | `READY` | `cpu-basic` | `1/1` |
| `cnxqchen/c` | `https://huggingface.co/spaces/cnxqchen/c` | `https://cnxqchen-c.hf.space` | `docker` | `RUNNING` | `READY` | `cpu-basic` | `1/1` |
| `cnxqchen/ar` | `https://huggingface.co/spaces/cnxqchen/ar` | `https://cnxqchen-ar.hf.space` | `docker` | `RUNNING` | `READY` | `cpu-basic` | `1/1` |
| `cnxqchen/team` | `https://huggingface.co/spaces/cnxqchen/team` | `https://cnxqchen-team.hf.space` | `docker` | `RUNNING` | `READY` | `cpu-basic` | `1/1` |
| `cnxqchen/metapi` | `https://huggingface.co/spaces/cnxqchen/metapi` | `https://cnxqchen-metapi.hf.space` | `docker` | `PAUSED` | `READY` | `requested: cpu-basic` | `requested: 1` |
| `cnxqchen/self` | `https://huggingface.co/spaces/cnxqchen/self` | `https://cnxqchen-self.hf.space` | `docker` | `RUNNING` | `READY` | `cpu-basic` | `1/1` |
| `cnxqchen/g2a` | `https://huggingface.co/spaces/cnxqchen/g2a` | `https://cnxqchen-g2a.hf.space` | `docker` | `RUNNING` | `READY` | `cpu-basic` | `1/1` |

## 规律总结

Space 仓库 ID 规律：

```text
{username}/{space_name}
```

应用访问地址规律：

```text
https://{username}-{space_name}.hf.space
```

当前用户固定值：

```text
username = cnxqchen
```

因此 `cnxqchen/g2a` 的应用地址是：

```text
https://cnxqchen-g2a.hf.space
```

## 状态字段含义

- `runtime.stage`：Space 运行态。当前看到的值有 `RUNNING` 和 `PAUSED`。
- `runtime.domains[].stage`：域名状态。当前 7 个 Space 的域名均为 `READY`。
- `runtime.hardware.current`：当前实际硬件。`PAUSED` 状态下可能为 `null`。
- `runtime.hardware.requested`：请求的硬件规格。
- `runtime.replicas.current`：当前实例数。`PAUSED` 状态下可能缺失。
- `runtime.replicas.requested`：期望实例数。

展示建议：

- 主状态优先展示 `runtime.stage`。
- 域名可用性展示 `runtime.domains[0].stage`。
- 对 `PAUSED` 状态不要强行读取 `current` 字段，应允许为空，并退回展示 `requested` 字段。

## 后续模块建议

新增 Hugging Face Spaces 识别模块时，建议先做只读识别：

1. 用户输入用户名或主页 URL，例如 `https://huggingface.co/cnxqchen/spaces`。
2. 解析出用户名 `cnxqchen`。
3. 请求 `GET /api/spaces?author={username}&expand[]=runtime&expand[]=author&expand[]=subdomain&expand[]=cardData`。
4. 将返回的 `id`、`subdomain`、`runtime.stage`、`domains[0].stage` 映射到站点候选项。
5. 应用地址优先使用 `runtime.domains[0].domain` 拼接 `https://`，缺失时再用 `{username}-{space_name}.hf.space` 规律兜底。

本模块暂不建议做启动、暂停、重启、日志拉取、变量或密钥管理；这些都涉及账号权限和更高风险操作，应单独设计。
