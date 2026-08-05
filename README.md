# 东数西算碳减排与绿色算力评估系统

面向“东数西算”场景的碳减排与绿色算力评估 Web 应用。项目提供 React 前端、Python 后端接口和 Vercel 部署配置。

在线地址：[dongshuxisuan.vercel.app](https://dongshuxisuan.vercel.app)

## 技术栈

- React 19、TypeScript、Vite 与 Tailwind CSS
- Python 后端服务
- Vercel Serverless Function（`api/ai/chat.js`）

## 本地运行

前置条件：Node.js 22+、npm 和 Python 3.10+。

1. 复制 `.env.example` 为 `.env`，按本地环境填写数据库、后端地址和 AI 服务配置。不要提交 `.env` 或任何密钥。
2. 安装前端依赖并启动开发服务器：

   ```bash
   npm install
   npm run dev
   ```

3. 创建 Python 虚拟环境，安装后端依赖并启动接口：

   ```bash
   python -m venv .venv
   .venv\\Scripts\\python -m pip install -r backend/requirements.txt
   .venv\\Scripts\\python backend/app.py
   ```

在 macOS 或 Linux 上，将 `.venv\\Scripts\\python` 替换为 `.venv/bin/python`。

## 检查与构建

```bash
npm run lint
npm run build
```

每次向 `main` 推送代码或创建 Pull Request 时，GitHub Actions 会执行以上两项检查。

## 贡献流程

1. 从 `main` 创建描述明确的功能或修复分支。
2. 本地运行 lint 和 build。
3. 创建 Pull Request，说明改动目的、验证方式和对部署或环境变量的影响。
4. 检查通过后合并。

## 许可证

本项目采用 [MIT License](LICENSE)。
