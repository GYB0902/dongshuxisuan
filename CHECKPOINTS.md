# 项目操作检查点

## 固定规则

- 本地项目路径：`D:\PythonEnv\CodeSpace\dongshuxisuan`
- 公网访问地址：`http://8.136.19.124/`、`http://8.136.19.124/dongshuxisuan/`
- 公网前端目录：`/usr/share/nginx/html/dongshuxisuan_dist`
- 公网 AI 服务：`dongshuxisuan-ai.service`
- 公网 Nginx 配置：`/etc/nginx/nginx.conf`

以后每个小功能按这个顺序处理：

1. 改本地源码。
2. 本地运行或检查。
3. 做 Git 检查点提交。
4. 需要上线时打包并发布到公网。
5. 验证公网地址。
6. 把操作记录写进这个 Markdown 文档。

不满意时优先用 `git revert <commit>` 回退对应检查点，避免破坏其他未提交改动。

## 操作记录

| 日期 | 操作 | Git 检查点 | 公网状态 | 验证 |
| --- | --- | --- | --- | --- |
| 2026-05-08 | 注册页“设置密码”和“确认密码”增加显示/隐藏密码按钮 | `169b905` | 已发布 | 线上 JS 包包含 `显示密码`、`隐藏密码`、`显示确认密码`、`隐藏确认密码` |
| 2026-05-08 | 建立“每步 Git 检查点 + 写入 MD 文档”的固定流程 | 本文档提交 | 不涉及 | 新增 `CHECKPOINTS.md` |
