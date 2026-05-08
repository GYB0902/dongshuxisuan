# 东数西算碳减排与绿色算力评估系统

> 产品需求文档 PRD | 基于项目源码自动整理

| **项目** | **内容** |
|:---|:---|
| 项目路径 | D:\PythonEnv\CodeSpace\--main |
| 文档版本 | V1.1 |
| 生成日期 | 2026-05-03 |
| 产品定位 | 面向东数西算工程建设方、地方政府、环境监管部门的碳减排与绿色算力评估平台 |
| 当前技术栈 | React 19 / TypeScript / Vite / Tailwind CSS / Recharts / Lucide React / Flask / PyMySQL / MySQL / Vercel |
| 主要数据依据 | src/pages 页面、src/lib 数据封装、backend Flask API、public/data/live_overview.json、后端爬虫缓存 |
| 维护约定 | 后续涉及页面功能、指标口径、数据年份、数据源、接口、部署方式的变更，均需同步追加到本文档“变更同步记录” |

# 目录

1.  项目背景与产品目标

2.  用户角色与使用场景

3.  产品范围与信息架构

4.  功能需求清单

5.  核心模块详细需求

6.  数据需求与数据模型

7.  算法模型要求

8.  接口与系统集成

9.  非功能需求

10. 验收标准、版本计划与风险

11. 变更同步记录

12. 附录: 文档生成依据

# 1. 项目背景与产品目标

本系统围绕“东数西算”工程在内蒙古枢纽节点的建设与评估需求，聚合碳排放、算力基础设施、能源消费、绿色能源、社会经济等多源数据，提供数据清洗、指标计算、LMDI分解、DID因果推断、GM(1,1)预测、政策情景模拟和可视化展示能力。

| **目标编号** | **目标** | **度量方式** |
|:---|:---|:---|
| G1 | 形成内蒙古数据中心碳排放与绿色算力综合监测视图 | 首页KPI、趋势图、城市排名、地图分布可正常展示 |
| G2 | 量化东数西算政策对碳排放强度的影响 | DID估计、平行趋势检验、动态效应结果可计算和解释 |
| G3 | 解释碳排放变化来源 | LMDI分解输出规模效应、结构效应、强度效应及贡献率 |
| G4 | 支撑政策模拟与减排路径比较 | 按绿电目标、PUE目标、算力增长率生成预测排放和减排率 |
| G5 | 支撑课程/科研演示与后续论文实证扩展 | 数据、图表、接口、导出能力满足展示和复现需求 |

# 2. 用户角色与使用场景

| **角色** | **核心诉求** | **典型操作** | **权限** |
|:---|:---|:---|:---|
| 工程建设方 | 掌握算力规模、PUE、绿电消纳与减排效果 | 查看大屏、绿色算力评估、政策模拟 | 登录用户 |
| 地方政府/监管部门 | 评估政策成效、对比枢纽和非枢纽城市 | DID分析、城市排名、地图热力图 | 登录用户 |
| 数据管理员 | 维护CSV/XLS/XLSX数据、查看版本和导出结果 | 上传、清洗、预览、导出、版本管理 | 管理员 |
| 科研/论文用户 | 构建DID、LMDI、SCM、GCI等实证框架 | 读取面板数据、导出图表、保存模型结果 | 登录用户 |

# 3. 产品范围与信息架构

当前前端为 React + Vite 单页应用，路由由 `src/App.tsx` 统一维护。系统包含8个主要页面，其中数据管理页面要求管理员权限。

| **页面路径** | **页面名称** | **组件**         | **需登录** | **需管理员** |
|:-------------|:-------------|:-----------------|:-----------|:-------------|
| /login       | 登录         | Login            | 否         | 否           |
| /register    | 用户注册     | Register         | 否         | 否           |
| / 或 /overview | 数据概览   | Overview         | 是         | 否           |
| /lmdi        | LMDI分解分析 | LmdiDecomposition | 是       | 否           |
| /did         | DID模型分析  | DIDModel         | 是         | 否           |
| /green-compute | 绿色算力评估 | GreenCompute   | 是         | 否           |
| /simulation  | 政策模拟     | PolicySimulation | 是         | 否           |
| /geo-map     | 地理可视化   | GeoMap           | 是         | 否           |
| /data        | 数据管理     | DataManagement   | 是         | 是           |

## 产品范围

- 范围内: 登录认证、用户注册、数据概览、LMDI分解、DID模型、绿色算力、政策模拟、地理可视化、数据管理、CSV导出、实时爬取与静态快照兜底。

- 范围外: 真实生产级用户中心、正式多租户权限体系、自动定时调度、外部数据源的稳定授权和完整数据治理流程。

- 依赖项: MySQL 8.0、Flask API、React前端、Recharts可视化、公开数据源、本地静态快照和Vercel静态部署配置。

# 4. 功能需求清单

| **编号** | **模块** | **需求描述** | **优先级** | **源码依据** |
|:---|:---|:---|:---|:---|
| FR-001 | 登录认证 | 支持普通用户/管理员登录、注册、退出；后端可写入MySQL，静态部署时可回退本地浏览器账户 | P0 | src/lib/auth.ts; backend/auth_store.py |
| FR-002 | 数据概览 | 展示碳排放、算力、绿电、PUE等KPI和趋势，支持真实地图与实时数据片段 | P0 | src/pages/Overview.tsx |
| FR-003 | LMDI分解 | 按基准年份、目标年份和分析范围计算规模、结构、强度效应；目标年份支持2022、2023、2024、2025 | P0 | src/pages/LmdiDecomposition.tsx |
| FR-004 | DID模型 | 支持政策效应估计、平行趋势、动态效应；年份轴已覆盖2018到2025 | P0 | src/pages/DidModel.tsx |
| FR-005 | 绿色算力评估 | 展示PUE排名、算力分布、城市维度评分、重点项目状态和2025年绿色算力快照 | P0 | src/pages/GreenCompute.tsx |
| FR-006 | 政策模拟 | 按情景、能效和算力增长联动生成预测排放、减排量和情景对比 | P1 | src/pages/PolicySimulation.tsx |
| FR-007 | 地理可视化 | 使用真实GeoJSON边界展示内蒙古盟市、数据中心点位、碳排强度/绿电占比/PUE图层切换和能源结构联动 | P1 | src/pages/GeoMap.tsx |
| FR-008 | 数据管理 | 支持18条初始数据源、分类筛选、分页、上传、选择和导出 | P0 | src/pages/DataManagement.tsx |
| FR-009 | 数据爬取缓存 | 从公开网页拉取并缓存实时概览数据，前端API失败时读取public/data/live_overview.json | P1 | backend/live_scraper.py; src/lib/liveData.ts |
| FR-010 | 静态部署 | 支持Vercel按Vite构建dist并将前端路由回退到index.html | P1 | vercel.json |
| FR-011 | AI问答 | 顶部导航增加AI问答模块，参考同花顺项目由前端直接调用AI接口，采用全系统上下文问答，不再局限当前模块 | P1 | src/pages/AiAssistant.tsx; src/lib/aiClient.ts |

# 5. 核心模块详细需求

| **模块** | **页面能力** | **关键接口** | **业务规则** |
|:---|:---|:---|:---|
| 数据概览大屏 | KPI卡片、碳强度趋势、城市排名、LMDI效应、实时爬取数据池、盟市扩展数据 | GET /api/live/overview; public/data/live_overview.json | 碳排放趋势覆盖2020到2025；API失败时自动读取静态快照，不阻塞页面 |
| LMDI分解分析 | 总变化、规模效应、结构效应、强度效应、瀑布图、贡献率、历史驱动轨迹 | 前端内置场景计算 | 默认目标年份为2025，目标年份选项包含2022到2025 |
| DID模型分析 | 平行趋势、DID结果、动态效应、控制变量、模型运行 | 前端内置场景计算 | 年份轴覆盖2018到2025，控制变量默认全选 |
| 绿色算力评估 | PUE排名、城市维度评分、重点项目状态、PUE与绿电协同轨迹 | GET /api/live/overview; yearlyGreenCompute | 2025年为默认口径；PUE越低越优、绿电越高越优 |
| 政策模拟 | 基准情景、绿色提升、PUE优化、综合演练情景对比 | 前端内置场景计算 | 参数变化应即时反映预测排放、减排量和减排率 |
| 地理可视化 | 真实内蒙古盟市GeoJSON地图、城市详情、数据中心分布、图层切换、能源结构联动 | GET /api/live/overview; public/nmg-geo.json | 地图支持滚轮缩放且不带动页面滚动 |
| 数据管理 | 18条初始数据源、分页预览、分类筛选、上传、选择、导出 | 前端本地状态与downloadCsv | 支持csv、xlsx、xls、json、txt；上传后插入列表顶部 |
| AI问答 | AI对话、全系统主题上下文、推荐问题展示 | 前端直接请求兼容chat completions接口 | 未配置VITE_AI_API_KEY时返回明确提示；提问范围覆盖整个系统；页面不展示模型名和token消耗 |

# 6. 数据需求与数据模型

## 6.1 数据源与现有样例

当前数据由后端爬虫和前端静态快照共同提供。后端通过 `backend/live_scraper.py` 抓取公开网页并生成 `backend/cache/live_overview.json`；前端在静态部署或API不可用时读取 `public/data/live_overview.json`。当前缓存包含2024到2025公开数据摘要、30条实时指标片段、12个盟市节点、绿色算力年度快照和地图点位。

| **指标**     | **当前样例值** | **单位/说明** |
|:-------------|:---------------|:--------------|
| 碳排放总量   | 6400           | 万吨CO2       |
| 碳排放变化   | -10.53         | %             |
| 目标进度     | 72.0           | %             |
| 枢纽碳强度   | 0.68           | 吨CO2/万元GDP |
| 非枢纽碳强度 | 1.35           | 吨CO2/万元GDP |
| 绿电消纳     | 48.8           | 亿kWh         |
| 绿电占比     | 84.57          | %             |
| 总算力规模   | 12.6           | 万P           |
| AI算力       | 11.6           | 万P           |
| 平均PUE      | 1.35           | 无量纲        |
| 一季度用电   | 12.2           | 亿度          |
| 实时来源数量 | 11             | 个            |
| 指标片段数量 | 30             | 条            |

## 6.2 城市绿色算力排名样例

| **排名** | **城市** | **绿色算力得分** | **算力规模(万P)** | **绿电占比(%)** |
|:---------|:---------|:-----------------|:------------------|:----------------|
| 1        | 乌兰察布 | 92               | 3.5               | 88.5            |
| 2        | 呼和浩特 | 85               | 4.2               | 82.3            |
| 3        | 包头     | 78               | 2.8               | 79.6            |
| 4        | 鄂尔多斯 | 72               | 1.6               | 75.2            |
| 5        | 巴彦淖尔 | 65               | 0.5               | 68.4            |

## 6.3 年度趋势样例

| **年份** | **总算力(万P)** | **绿电占比(%)** | **平均PUE** | **枢纽碳强度** | **非枢纽碳强度** |
|:---|:---|:---|:---|:---|:---|
| 2020 | 5.2 | 35.2 | 1.55 | 0.92 | 1.35 |
| 2021 | 6.8 | 45.8 | 1.48 | 0.88 | 1.38 |
| 2022 | 8.5 | 58.3 | 1.42 | 0.82 | 1.42 |
| 2023 | 10.2 | 72.5 | 1.38 | 0.76 | 1.38 |
| 2024 | 12.6 | 84.57 | 1.35 | 0.68 | 1.35 |
| 2025 | 12.6 | 84.57 | 1.28 | 0.60 | 1.32 |

## 6.4 数据源管理初始数据

数据源管理页当前内置18条数据源，覆盖2023到2025年，类型包括因子、遥测、政策、负载。页面每页展示8条，支持按类型筛选、上传本地文件、勾选和导出。

| **类型** | **数量** | **代表数据源** |
|:---|:---|:---|
| 因子 | 5 | 全国电网排放因子、盟市绿电占比月度汇总、新能源装机与消纳基础表 |
| 遥测 | 5 | 内蒙古绿色算力实爬快照、数据中心碳强度监测明细、PUE逐日采集日志 |
| 政策 | 3 | 东数西算政策效果资料包、2025能源结构方案、重点机房液冷改造清单 |
| 负载 | 5 | 和林格尔新区算力规模台账、智算负载迁移调度记录、服务器机架利用率小时表 |

## 6.5 核心数据表

| **表名** | **用途** | **关键字段** |
|:---|:---|:---|
| city_basic_info | 城市基础信息 | city_code, city_name, province, is_hub, hub_level, latitude, longitude, area, population |
| carbon_emission | 碳排放数据 | city_code, year, quarter, total_emission, emission_intensity, coal/oil/gas/electricity_emission, carbon_factor |
| compute_infrastructure | 算力基础设施 | datacenter_count, standard_racks, total_compute_power, avg_pue, power_consumption, datacenter_name |
| energy_consumption | 能源消费 | total_energy, coal_consumption, oil_consumption, gas_consumption, electricity_consumption, energy_intensity |
| green_energy | 绿色能源 | wind_power, solar_power, hydro_power, total_renewable, green_power_consumption, green_ratio, grid_carbon_factor |
| socioeconomic | 社会经济 | gdp, gdp_per_capita, primary_ratio, secondary_ratio, tertiary_ratio, rd_expenditure, rd_intensity |
| lmdi_decomposition | LMDI结果 | total_change, scale_effect, structure_effect, intensity_effect, contribution fields, base_year |
| did_estimation | DID估计结果 | dependent_var, did_coefficient, did_std_error, did_t_stat, did_p_value, confidence interval, policy_time |
| policy_effect | 政策情景结果 | scenario_name, green_ratio_target, pue_target, compute_growth_rate, predicted_emission, emission_reduction |
| data_version | 数据版本 | version, file_name, file_path, row_count, city_count, year_start, year_end, status, uploaded_by |

## 6.6 数据治理规则

- 上传格式: csv、xlsx、xls、json、txt；当前前端为本地状态插入与导出，生产化后需保存原始文件路径、大小、行数、年份范围和上传人。

- 清洗规则: 数值字段缺失值使用均值填充；异常值按3 sigma原则裁剪。

- 主键与唯一性: 多数业务表按city_code、year、quarter建立唯一约束，数据中心表额外包含datacenter_name。

- 口径要求: 所有碳排放单位需在页面和导出中标明；绿电占比为百分比；PUE为无量纲。

# 7. 算法模型要求

| **模型** | **源码实现** | **输入** | **输出** | **验收口径** |
|:---|:---|:---|:---|:---|
| LMDI | app/algorithms/lmdi.py | 基准年与目标年的carbon、compute、green_ratio、pue | total_change、scale_effect、structure_effect、intensity_effect、contribution、residual | 结果字段完整，贡献率方向可解释，残差可追踪 |
| DID | app/algorithms/did.py | 城市、年份、因变量、is_hub、控制变量 | DID系数、标准误、t值、p值、置信区间、R2、样本量 | 支持双向固定效应和聚类标准误，平行趋势可检查 |
| GM(1,1) | app/algorithms/gm_predictor.py | 至少4个正数时间序列点 | 未来预测值、上下界、拟合值、后验差比C、小误差概率P | 精度等级可输出，不满足条件时返回明确错误 |
| 政策情景模拟 | app/services/prediction_service.py | 绿电占比目标、PUE目标、算力增长率、城市 | 预测排放、减排量、减排率、未来3年投影 | 参数变化必须影响结构效应和强度效应 |

# 8. 接口与系统集成

系统采用前后端分离结构。当前前端通过 `fetch` 请求Flask API，健康检查为 `/api/health`，本地默认后端端口为 `5050`。

当前 `--main` 版本为轻量React前端 + Flask API，实际可用接口以 `backend/app.py` 为准。历史Flask/Vue接口清单保留为旧版设计参考，后续新增接口时优先维护本节的“当前接口”。

## 8.1 当前接口

| **方法** | **接口** | **功能** |
|:---|:---|:---|
| GET | /api/health | 后端健康检查，返回backend api ok |
| GET | /api/auth/status | 检查MySQL用户表是否可用 |
| POST | /api/auth/register | 注册普通用户，本地后端写入MySQL |
| POST | /api/auth/login | 普通用户/管理员登录 |
| GET | /api/live/overview | 获取实时爬取概览数据，支持refresh=1 |
| POST | /api/live/scrape | 强制重新爬取公开网页并刷新缓存 |
| GET | /api/live/cache | 读取后端缓存数据 |

## 8.2 静态部署与兜底

- Vercel部署使用 `vercel.json`，按Vite构建 `dist`，并将SPA路由回退到 `index.html`。

- `src/lib/liveData.ts` 优先请求 `/api/live/overview`，失败后自动读取 `public/data/live_overview.json`。

- `src/lib/auth.ts` 优先请求后端登录/注册接口；Vercel静态部署无后端时，演示账号和注册账号回退到浏览器本地存储。

## 8.3 历史接口清单

| **接口模块** | **数量** | **方法**  | **主要路径段**                      |
|:-------------|:---------|:----------|:------------------------------------|
| DID          | 10       | GET; POST | did                                 |
| LMDI         | 12       | GET; POST | lmdi                                |
| 地图可视化   | 4        | GET       | map                                 |
| 城市         | 2        | GET       | city                                |
| 数据概览     | 9        | GET       | compute, dashboard, lmdi, overview  |
| 数据爬取     | 5        | GET; POST | scraper                             |
| 数据管理     | 13       | GET; POST | city, data, export, scraper, upload |
| 绿色算力     | 11       | GET       | compute, map                        |
| 绿色能源     | 3        | GET       | energy                              |
| 认证         | 5        | GET; POST | auth                                |
| 通用         | 4        | GET; POST | emission, filter                    |
| 预测模拟     | 10       | GET; POST | predict                             |

## 接口清单

| **模块** | **方法** | **接口** | **功能** | **来源** |
|:---|:---|:---|:---|:---|
| DID | GET | /api/did/did-results | 获取did results | backend\app\routes\did_routes.py |
| DID | GET | /api/did/dynamic-effect | 获取DID动态效应 | app\routes\did.py; backend\app\routes\did_routes.py |
| DID | GET | /api/did/dynamic-effects | 获取DID动态效应 | app\routes\did.py |
| DID | POST | /api/did/estimate | 执行DID政策效应估计 | app\routes\did.py |
| DID | GET | /api/did/full-data | 获取did full data | app\routes\did.py; backend\app\routes\did_routes.py |
| DID | GET | /api/did/panel-data | 获取panel data | app\routes\did.py |
| DID | GET | /api/did/parallel-test | 获取parallel test | backend\app\routes\did_routes.py |
| DID | GET | /api/did/parallel-trend | 平行趋势检验 | app\routes\did.py; backend\app\routes\did_routes.py |
| DID | GET | /api/did/results | 获取saved results | app\routes\did.py |
| DID | POST | /api/did/run | 运行DID模型 | app\routes\did.py; backend\app\routes\did_routes.py |
| LMDI | POST | /api/lmdi/calculate | 执行LMDI分解计算 | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| LMDI | POST | /api/lmdi/calculate-all | calculate all lmdi | app\routes\lmdi.py |
| LMDI | GET | /api/lmdi/chart | 获取lmdi chart | app\routes\lmdi.py |
| LMDI | GET | /api/lmdi/contribution-rate | 获取contribution rate | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| LMDI | GET | /api/lmdi/effects-cumulative | 获取effects cumulative | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| LMDI | GET | /api/lmdi/effects-trend | 获取effects trend | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| LMDI | GET | /api/lmdi/emission-timeline | 获取emission timeline | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| LMDI | GET | /api/lmdi/full-data | 获取lmdi full data | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| LMDI | GET | /api/lmdi/indicators | 获取indicators | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| LMDI | GET | /api/lmdi/result/\<int:year\> | 获取lmdi result | app\routes\lmdi.py |
| LMDI | GET | /api/lmdi/summary | 获取lmdi summary | app\routes\lmdi.py |
| LMDI | GET | /api/lmdi/waterfall | 获取waterfall | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| 地图可视化 | GET | /api/map/carbon-flow | 获取碳流桑基数据 | app\routes\map.py |
| 地图可视化 | GET | /api/map/city-emission | 获取map city emission | app\routes\map.py |
| 地图可视化 | GET | /api/map/data-center | 获取map data center | app\routes\map.py |
| 地图可视化 | GET | /api/map/heatmap | 获取地图热力数据 | app\routes\map.py |
| 城市 | GET | /api/city/\<city_code\> | 获取city detail | app\routes\city.py |
| 城市 | GET | /api/city/list | 获取city list | app\routes\city.py |
| 数据概览 | GET | /api/compute/overview | 获取compute overview | app\routes\compute.py; backend\app\routes\compute_routes.py |
| 数据概览 | GET | /api/dashboard/city-ranking | 获取城市绿色算力排名 | app\routes\overview.py; backend\app\routes\dashboard_routes.py |
| 数据概览 | GET | /api/dashboard/emission-trend | 获取首页碳强度趋势 | app\routes\overview.py; backend\app\routes\dashboard_routes.py |
| 数据概览 | GET | /api/dashboard/overview | 获取首页KPI总览 | app\routes\overview.py; backend\app\routes\dashboard_routes.py |
| 数据概览 | GET | /api/lmdi/overview | 获取lmdi overview | app\routes\lmdi.py; backend\app\routes\lmdi_routes.py |
| 数据概览 | GET | /api/overview | 获取overview | app\routes\overview.py |
| 数据概览 | GET | /api/overview/dashboard | 获取dashboard | app\routes\overview.py |
| 数据概览 | GET | /api/overview/emission-trend | 获取emission trend | app\routes\overview.py |
| 数据概览 | GET | /api/overview/hub-comparison | 获取hub comparison | app\routes\overview.py |
| 数据爬取 | POST | /api/scraper/cache/clear | clear cache | backend\app\routes\scraper_routes.py |
| 数据爬取 | GET | /api/scraper/cache/status | cache status | backend\app\routes\scraper_routes.py |
| 数据爬取 | POST | /api/scraper/scrape | scrape data | backend\app\routes\scraper_routes.py |
| 数据爬取 | GET | /api/scraper/sources | 获取sources | backend\app\routes\scraper_routes.py |
| 数据爬取 | GET | /api/scraper/status | 获取scraper status | app\routes\city.py |
| 数据管理 | GET | /api/city/\<city_code\>/data | 获取city data | app\routes\city.py |
| 数据管理 | GET | /api/data/export | 导出数据 | backend\app\routes\data_routes.py |
| 数据管理 | GET | /api/data/import-history | 获取import history | backend\app\routes\data_routes.py |
| 数据管理 | GET | /api/data/preview | 获取data preview | app\routes\city.py; backend\app\routes\dashboard_routes.py; backend\app\routes\data_routes.py |
| 数据管理 | GET | /api/data/stats | 获取stats | backend\app\routes\data_routes.py |
| 数据管理 | GET | /api/data/tables | 获取data tables | app\routes\city.py; backend\app\routes\data_routes.py |
| 数据管理 | GET | /api/data/versions | 获取versions | backend\app\routes\data_routes.py |
| 数据管理 | POST | /api/export/chart | 导出图表 | app\routes\export.py |
| 数据管理 | POST | /api/export/data | 导出数据 | app\routes\export.py |
| 数据管理 | POST | /api/export/report | 导出报告 | app\routes\export.py |
| 数据管理 | GET | /api/scraper/data | 获取data | backend\app\routes\scraper_routes.py |
| 数据管理 | POST | /api/upload | 上传单个数据文件 | app\routes\upload.py |
| 数据管理 | POST | /api/upload/batch | 批量上传数据文件 | app\routes\upload.py |
| 绿色算力 | GET | /api/compute/boxplot | 获取pue boxplot | app\routes\compute.py |
| 绿色算力 | GET | /api/compute/carbon-reduction | 获取carbon reduction | app\routes\compute.py |
| 绿色算力 | GET | /api/compute/compute-distribution | 获取算力分布数据 | backend\app\routes\compute_routes.py |
| 绿色算力 | GET | /api/compute/detail | 获取compute detail | app\routes\compute.py |
| 绿色算力 | GET | /api/compute/efficiency | 获取compute efficiency | app\routes\compute.py |
| 绿色算力 | GET | /api/compute/full-data | 获取compute full data | app\routes\compute.py; backend\app\routes\compute_routes.py |
| 绿色算力 | GET | /api/compute/green-radar | 获取green radar | backend\app\routes\compute_routes.py |
| 绿色算力 | GET | /api/compute/pue-ranking | 获取pue ranking | app\routes\compute.py; backend\app\routes\compute_routes.py |
| 绿色算力 | GET | /api/compute/pue-trend | 获取pue trend | backend\app\routes\compute_routes.py |
| 绿色算力 | GET | /api/compute/trend | 获取compute trend | app\routes\compute.py |
| 绿色算力 | GET | /api/map/compute-distribution | 获取算力分布数据 | app\routes\map.py |
| 绿色能源 | GET | /api/energy/green-ratio | 获取green ratio | app\routes\energy.py |
| 绿色能源 | GET | /api/energy/radar | 获取radar data | app\routes\energy.py |
| 绿色能源 | GET | /api/energy/trend | 获取energy trend | app\routes\energy.py |
| 认证 | POST | /api/auth/login | 用户登录并返回令牌 | backend\app\routes\auth_routes.py |
| 认证 | POST | /api/auth/logout | 退出登录并拉黑令牌 | backend\app\routes\auth_routes.py |
| 认证 | GET | /api/auth/me | 获取当前用户信息 | backend\app\routes\auth_routes.py |
| 认证 | POST | /api/auth/register | 用户注册 | backend\app\routes\auth_routes.py |
| 认证 | GET | /api/auth/users | 管理员查看用户列表 | backend\app\routes\auth_routes.py |
| 通用 | GET | /api/emission/by-city | 获取emission by city | app\routes\carbon.py |
| 通用 | POST | /api/emission/filter | filter emission | app\routes\carbon.py |
| 通用 | GET | /api/emission/trend | 获取emission trend | app\routes\carbon.py |
| 通用 | POST | /api/filter | filter data | app\routes\export.py |
| 预测模拟 | POST | /api/predict/all-cities | predict all cities | app\routes\prediction.py |
| 预测模拟 | POST | /api/predict/carbon | 碳排放预测 | app\routes\prediction.py |
| 预测模拟 | GET | /api/predict/carbon-history | 获取carbon history | backend\app\routes\predict_routes.py |
| 预测模拟 | POST | /api/predict/compare | compare scenarios | app\routes\prediction.py |
| 预测模拟 | GET | /api/predict/emission-forecast | 获取emission forecast | app\routes\prediction.py |
| 预测模拟 | GET | /api/predict/full-data | 获取predict full data | app\routes\prediction.py; backend\app\routes\predict_routes.py |
| 预测模拟 | POST | /api/predict/policy | 政策情景模拟 | app\routes\prediction.py; backend\app\routes\predict_routes.py |
| 预测模拟 | POST | /api/predict/predict | 运行预测模型 | app\routes\prediction.py; backend\app\routes\predict_routes.py |
| 预测模拟 | POST | /api/predict/scenario | 情景模拟计算 | app\routes\prediction.py |
| 预测模拟 | GET | /api/predict/scenarios | 获取saved scenarios | app\routes\prediction.py; backend\app\routes\predict_routes.py |

# 9. 非功能需求

| **类别** | **需求** |
|:---|:---|
| 性能 | 首页KPI、核心图表和数据表查询在本地开发环境下应在3秒内返回；数据源管理分页展示，避免一次性渲染过多行。 |
| 兼容 | 前端支持现代Chrome/Edge；后端支持Python 3.14本地虚拟环境；数据库支持MySQL 8.0；静态部署支持Vercel。 |
| 安全 | 管理员页面需鉴权；生产环境必须替换演示账号策略，并避免在前端暴露真实生产密钥。 |
| 可靠 | 接口统一返回code、message、data或明确错误信息；模型数据不足时返回可读错误，不允许页面静默失败。 |
| 可维护 | 前端API封装与视图解耦；新增指标需同步更新TypeScript类型、静态快照和本PRD变更记录。 |
| 可追溯 | 上传数据保留版本、文件路径、行数、年份范围；模型结果保存到lmdi_decomposition、did_estimation、policy_effect。 |
| 导出 | 支持数据、报告和图表导出，导出内容需携带筛选条件、生成时间和指标口径。 |
| 部署兜底 | Vercel无Flask后端时，数据读取静态快照，登录/注册使用本地存储兜底，页面不得因API不可用而白屏。 |

# 10. 验收标准与版本计划

| **验收项** | **通过标准** |
|:---|:---|
| 启动 | 前端 `npm.cmd run dev -- --port 3001 --host 0.0.0.0` 可启动，后端 `.venv\Scripts\python.exe backend\app.py` 可启动，/api/health返回ok |
| 登录 | admin/admin123、user/123456可完成演示登录，管理员可进入数据管理；无后端静态部署时可使用本地兜底登录 |
| 首页 | KPI、趋势、排名、LMDI卡片均有数据或明确空态；“碳排放趋势：枢纽与非枢纽城市对比”必须展示2025年数据点 |
| LMDI | 目标年份下拉包含2025，默认展示2025口径，并可生成三类效应、瀑布图和历史轨迹 |
| DID | 运行模型后可查看DID系数、显著性、平行趋势和动态效应，年份轴包含2025 |
| 绿色算力 | 默认展示2025年口径，PUE排名、城市维度评分、重点项目状态布局正常 |
| 数据管理 | 初始展示18条数据源，每页8条，支持因子/遥测/政策/负载筛选、上传和导出 |
| 地图 | 真实内蒙古盟市GeoJSON地图、数据中心点位、图层切换和能源结构联动无明显错位或空白 |
| AI问答 | 顶部导航可进入AI问答页，问题可直接调用AI接口；提问不绑定当前模块；未配置VITE_AI_API_KEY时显示可读错误 |
| 导出 | 数据/报告/图表导出文件可打开且内容与筛选条件一致 |
| Vercel | 线上访问根路径、/overview、/login、/policy、/data-management等前端路由时不出现404；API不可用时读取静态快照 |

| **阶段** | **目标** | **交付内容** |
|:---|:---|:---|
| MVP | 完成可演示闭环 | 登录、首页、LMDI、DID、绿色算力、数据管理基础能力 |
| V1.1 | 提升数据可信度 | 接入更完整原始数据、增加数据来源字段、导入校验报告 |
| V1.2 | 加强科研分析 | 扩展SCM、GCI指标体系、城市对比和论文图表导出 |
| V1.3 | 生产化改造 | 数据库用户系统、权限矩阵、定时任务、审计日志、部署监控 |

## 风险与待确认

- 当前线上Vercel部署只承载前端静态资源，不运行Flask后端；需要真实后端在线服务时，应单独部署Flask API并配置VITE_API_BASE_URL。

- AI问答参考同花顺项目采用前端直连AI接口方式；该方式适合课程演示，但静态部署后浏览器可看到前端环境变量，正式生产应改回后端代理。

- MySQL注册依赖PyMySQL和cryptography；若MySQL使用caching_sha2_password认证，虚拟环境必须安装cryptography。

- 当前爬虫缓存数据仍偏演示与摘要口径，后续论文实证需要补齐完整原始面板数据、来源URL、发布日期和口径说明。

- DID和LMDI结果需要与正式数据复核，避免用演示数据直接形成研究结论。

- 前端静态兜底数据会保证页面可用，但不等同于实时更新；正式展示真实实时结果时需确认后端API可访问。

# 11. 变更同步记录

| **日期** | **变更内容** | **涉及文件/模块** | **PRD同步要求** |
|:---|:---|:---|:---|
| 2026-05-08 | 地理可视化页真实行政区划地图补齐深色模式适配，深色下地图画布切换为深蓝底、网格降低亮度、行政区块整体压暗、地图文字改为浅色描边，指标小胶囊改为暗色底；对应 Git 检查点为 `7a74546`，公网已发布并验证 CSS 包包含地图暗色规则 | src/index.css; 公网 `/usr/share/nginx/html/dongshuxisuan_dist`; 页面 `/geo-map` | 后续调整地图画布、GeoJSON 行政区配色、地图标签、指标胶囊或深色主题地图样式时，需同步本记录 |
| 2026-05-08 | 数据管理页补齐深色模式适配，覆盖半透明白底容器、白色边框、表格 hover、状态胶囊与复选框，使 `/data` 页面在深色模式下不再保留浅色大块面板；对应 Git 检查点为 `3f7c144`，公网已发布并验证 CSS 包包含新暗色规则 | src/index.css; 公网 `/usr/share/nginx/html/dongshuxisuan_dist` | 后续调整数据管理页背景、玻璃态容器、表格状态样式、深色主题或全局半透明白色类时，需同步本记录 |
| 2026-05-08 | 登录失败兜底提示由“账号或密码错误，或后端服务暂时不可用”精简为“账号或密码错误”，删除后半句服务不可用说明；对应 Git 检查点为 `94e38de`，公网已发布并验证线上 JS 包不再包含旧文案 | src/lib/auth.ts; 公网 `/usr/share/nginx/html/dongshuxisuan_dist` | 后续调整登录失败、认证兜底、本地账号或后端认证错误提示时，需同步本记录 |
| 2026-05-08 | 公网 5050 后端网关补齐 `/api/live/overview`、`/api/live/cache`、`/api/live/scrape`，从已部署 `live_overview.json` 读取 12 个盟市与实时来源数据，解决地理可视化页“后端 API 未连接”兜底提示；对应 Git 检查点为 `3c91d49`，公网服务已部署并验证 `/api/live/overview` 返回 200 | backend/public_gateway.py; 服务器 `/opt/dongshuxisuan-api/app.py`; Nginx `/api/` 代理 | 后续调整公网后端端口、AI 网关、实时数据接口、地图数据来源或 `/api/live/*` 响应格式时，需同步本记录 |
| 2026-05-08 | 绿色算力页 PUE 排名副标题由“默认展示前 9 条，滚轮查看全部”改为“共 12 个盟市节点，滚轮查看全部”；对应 Git 检查点为 `cab4e47`，公网已发布并验证 JS 包包含新文案 | src/pages/GreenCompute.tsx; 公网 `/usr/share/nginx/html/dongshuxisuan_dist` | 后续调整 PUE 排名节点数量、盟市口径、列表滚动说明或绿色算力页文案时，需同步本记录 |
| 2026-05-08 | 绿色算力页 PUE 排名表头的 `PUE`、`评分`、`绿电` 三列增加右侧内边距，使表头视觉位置向左收并对齐下方数字；对应 Git 检查点为 `f30f9b4`，公网已发布并验证 JS 包包含新表头样式 | src/pages/GreenCompute.tsx; 公网 `/usr/share/nginx/html/dongshuxisuan_dist` | 后续调整 PUE 排名表格列宽、表头对齐、数字列排版或绿色算力页列表密度时，需同步本记录 |
| 2026-05-08 | 数据概览页 Recharts 图表 Tooltip 开启 `allowEscapeViewBox` 并提高悬浮层 `z-index`，能源结构等图表悬浮框不再被相邻模块遮挡；对应 Git 检查点为 `2b1e0b1`，公网已发布并验证 JS 包含本次层级配置 | src/pages/Overview.tsx; 公网 `/usr/share/nginx/html/dongshuxisuan_dist` | 后续调整图表 Tooltip、卡片层级、悬浮框定位或可视化交互时，需同步本记录 |
| 2026-05-08 | 建立“每步改动先做 Git 检查点，再按需发布公网，并把记录写回本 PRD”的固定流程，便于不满意时按提交点撤回 | Git; 本PRD变更同步记录 | 后续每次本地或公网改动都必须追加本节记录，并写明对应 Git 提交号、发布状态和验证结果 |
| 2026-05-08 | 注册页“设置密码”和“确认密码”输入框新增显示/隐藏密码按钮，右侧眼睛图标可切换明文和密文；对应 Git 检查点为 `169b905`，公网已发布 | src/pages/Register.tsx; 公网 `/usr/share/nginx/html/dongshuxisuan_dist` | 后续调整注册页密码输入框、确认密码交互、图标位置或登录/注册表单一致性时，需同步本记录 |
| 2026-05-06 | 顶部系统通知列表进一步收敛为仅保留最近 5 条操作记录，减少通知面板内容堆积 | src/components/layout/TopNav.tsx | 后续调整系统通知数量上限、通知面板密度或操作记录保留策略时，需同步顶部导航交互说明 |
| 2026-05-06 | 顶部系统通知列表调整为仅保留最近 10 条操作记录；管理员点击设置入口进入数据管理页不再弹出通知，也不写入系统通知列表 | src/components/layout/TopNav.tsx | 后续调整系统通知数量上限、静默操作范围或顶部设置入口反馈时，需同步顶部导航交互说明 |
| 2026-05-06 | 顶部系统通知改为监听全局 `notify()` 操作事件，导出数据、刷新、切换图层、跳转等操作会自动追加到铃铛通知列表并显示未读角标；通知区保留最近 12 条记录并区分成功/错误状态 | src/components/layout/TopNav.tsx; src/lib/actions.ts | 后续调整系统通知来源、未读规则、通知数量上限或操作反馈联动时，需同步顶部导航交互说明 |
| 2026-05-06 | 地理可视化页碳排强度图层颜色按参考橙点调整为纯橙 `#ff9800`，按钮激活态与地图指标胶囊保持一致 | src/pages/GeoMap.tsx | 后续调整碳排强度图层颜色、参考色或按钮/胶囊色系时，需同步地图交互说明 |
| 2026-05-06 | 地理可视化页碳排强度图层颜色继续调整为更稳的深琥珀橙，降低亮度，按钮激活态和地图指标胶囊同步使用该色系 | src/pages/GeoMap.tsx | 后续调整碳排强度图层颜色、亮度或按钮/胶囊色系时，需同步地图交互说明 |
| 2026-05-06 | 地理可视化页碳排强度图层颜色从亮黄调整回原先偏橙的 amber 黄色，按钮激活态和地图指标胶囊保持一致 | src/pages/GeoMap.tsx | 后续调整碳排强度图层颜色、按钮激活态或地图指标胶囊颜色时，需同步地图交互说明 |
| 2026-05-06 | 地理可视化页图层按钮颜色改为按指标本身绑定：碳排强度黄色、绿电占比绿色、PUE热度蓝色，避免按钮位置变化导致颜色对应错误 | src/pages/GeoMap.tsx | 后续调整图层按钮颜色、图层顺序或指标颜色语义时，需同步地图交互说明 |
| 2026-05-06 | 地理可视化页收回盟市指标胶囊偏移距离，使指标标记保持在对应盟市区域内部，仅做小幅错位以避免与城市名、节点点位完全重叠 | src/pages/GeoMap.tsx | 后续调整地图指标标签位置、区域对应关系或防遮挡策略时，需同步地图视觉说明 |
| 2026-05-06 | 地理可视化页为各盟市指标胶囊增加独立位置偏移，错开呼和浩特、包头、乌兰察布、鄂尔多斯、巴彦淖尔等容易被城市名或数据中心点位遮挡的标签 | src/pages/GeoMap.tsx | 后续调整地图指标标签位置、防遮挡策略或城市点位标注布局时，需同步地图视觉说明 |
| 2026-05-06 | 地理可视化页图层指标标签视觉继续优化，将白底大标签改为轻量胶囊式标记，使用半透明白底、细边框、小色点和紧凑数值，减少对地图主体的遮挡 | src/pages/GeoMap.tsx | 后续调整图层指标标记尺寸、透明度、颜色或地图遮挡策略时，需同步地图交互说明 |
| 2026-05-06 | 地理可视化页图层切换从小圆点指标层优化为白底数值标签卡片，标签左侧用颜色条区分碳排强度、绿电占比、PUE，按钮同步显示当前图层名称，提升地图指标可读性 | src/pages/GeoMap.tsx | 后续调整图层切换展示方式、指标标签样式、图层按钮文案或地图可读性策略时，需同步地图交互说明 |
| 2026-05-06 | 数据概览页地图与地理可视化页地图统一使用浅色 pastel 盟市行政区配色；地理可视化页恢复原有灰色网格背景，图层切换改为切换地图指标圆标层，按碳强度、绿电占比、PUE 展示不同颜色、大小和数值 | src/pages/GeoMap.tsx; src/components/maps/OverviewInnerMongoliaMap.tsx | 后续调整两张地图配色、网格背景、指标圆标层或图层切换语义时，需同步地图视觉和交互说明 |
| 2026-05-06 | 地理可视化页真实行政区划地图配色调整为浅色 pastel 分区底色，参考浅绿、浅蓝、浅紫、浅橙、浅黄的盟市行政区配色；地图背景改为白底弱网格，选中区域用黄色底色和红色边框高亮 | src/pages/GeoMap.tsx | 后续调整地图底色、盟市固定配色、选中高亮或图层视觉规则时，需同步地理可视化说明 |
| 2026-05-06 | 全局通知组件支持成功/错误两种状态，登录账号密码为空或登录失败时使用红色叉号错误提示，成功提示继续使用绿色对号 | src/lib/actions.ts; src/components/layout/ToastHost.tsx; src/pages/Login.tsx | 后续调整全局通知类型、错误提示样式或登录失败反馈时，需同步交互反馈说明 |
| 2026-05-05 | 登录页按标注反馈微调：左侧背景轮播说明恢复为原先的圆点切换、标题和副标题分离展示效果；右侧登录标题改为绿色字体以强化绿色算力主题 | src/pages/Login.tsx | 后续调整登录页轮播说明样式、登录标题颜色或表单头部视觉时，需同步登录页视觉说明 |
| 2026-05-05 | 登录页文字布局优化：左侧主标题改为主动两行展示，副文案拆成主说明和补充说明，轮播说明合并为半透明信息条；右侧登录标题改为图标+标题的信息头卡片，减少纵向堆叠 | src/pages/Login.tsx | 后续调整登录页标题断行、说明文案、轮播说明或表单头部布局时，需同步登录页视觉说明 |
| 2026-05-05 | 登录后的主要业务页面统一接入浅色数据可视化背景图与柔和遮罩，浅色模式展示清透背景，深色模式自动压暗背景，提升数据概览、LMDI、DID、绿色算力、政策模拟、地理可视化、AI问答等页面的整体视觉一致性 | src/App.tsx; src/index.css; public/images/data-preview-bg.png | 后续调整全局页面背景、主题遮罩、业务页面外壳或公共视觉风格时，需同步全局布局说明 |
| 2026-05-05 | 数据管理/数据预览页新增本地浅色数据背景图，页面外层加入柔和遮罩，左侧分类和表格区域调整为半透明玻璃态卡片，保持数据表可读性 | src/pages/DataManagement.tsx; public/images/data-preview-bg.png | 后续调整数据预览页背景图、遮罩透明度、表格玻璃态或数据管理页视觉风格时，需同步页面视觉说明 |
| 2026-05-05 | 登录页登录面板重新设计为更轻量的双层玻璃小卡片，压缩大框尺寸，演示账号提示改为胶囊条，注册入口改为轻量文字链接 | src/pages/Login.tsx | 后续调整登录面板尺寸、玻璃层级、账号提示或注册入口样式时，需同步登录页视觉说明 |
| 2026-05-05 | 登录页改造为Apple风格全屏滑动背景与半透明磨砂玻璃登录面板，新增3张本地PNG背景图，保留用户/管理员切换、演示账号填充、登录跳转和注册入口 | src/pages/Login.tsx; public/images/login-bg-grassland-datacenter.png; public/images/login-bg-green-compute-hall.png; public/images/login-bg-energy-cloud.png | 后续调整登录页视觉、背景图、轮播节奏、登录表单结构或认证流程时，需同步登录页说明和验收标准 |
| 2026-05-05 | 主题切换取消本地记忆，每次进入系统默认浅色模式，深色切换仅在当前会话内生效 | src/components/layout/TopNav.tsx | 后续恢复主题记忆、调整默认主题或跨页面主题策略时，需同步页面交互说明 |
| 2026-05-05 | 顶部主题按钮图标改为显示当前模式：浅色显示太阳、深色显示月亮；悬停时显示当前模式提示 | src/components/layout/TopNav.tsx | 后续调整主题图标、悬停提示或主题切换语义时，需同步页面交互说明 |
| 2026-05-05 | 顶部导航主题入口改为单击直接在浅色/深色之间切换，移除主题弹出选择框 | src/components/layout/TopNav.tsx | 后续调整主题入口交互、图标含义或切换反馈时，需同步页面交互说明 |
| 2026-05-05 | 顶部导航新增浅色/深色两种主题切换，去除跟随系统选项，主题偏好写入本地存储并通过全局样式作用到页面背景、卡片、文字和边框 | src/components/layout/TopNav.tsx; src/index.css | 后续调整主题模式数量、主题入口、深色样式覆盖或本地存储键名时，需同步页面布局和交互说明 |
| 2026-05-05 | 绿色算力页PUE排名表格压窄排名、PUE、评分、绿电列宽，城市列取消截断，保证“锡林郭勒盟”等长盟市名称完整显示 | src/pages/GreenCompute.tsx | 后续调整绿色算力页PUE排名表格列宽、字号或城市名称展示规则时，需同步页面布局说明 |
| 2026-05-05 | 绿色算力页PUE排名表格城市名称字号调小，避免长盟市名称在100%浏览器缩放下显得拥挤 | src/pages/GreenCompute.tsx | 后续调整绿色算力页PUE排名表格列宽、字号或滚动展示时，需同步页面布局说明 |
| 2026-05-05 | 首页与顶部导航按浏览器100%缩放重新压缩布局，降低导航高度、页面留白、卡片内边距、KPI字号、图表高度、地图高度和列表滚动区高度，提升首屏可观察内容密度 | src/pages/Overview.tsx; src/components/layout/TopNav.tsx; src/components/maps/OverviewInnerMongoliaMap.tsx | 后续调整首页100%缩放适配、首屏密度、图表高度或地图尺寸时，需同步页面布局说明 |
| 2026-05-05 | 顶部导航系统标题、副标题和模块入口文字整体缩小，提升导航栏紧凑度 | src/components/layout/TopNav.tsx | 后续调整顶部导航字号、间距、模块入口或响应式展示时，需同步页面布局说明 |
| 2026-05-05 | AI问答页隐藏回答气泡底部的模型名与token消耗信息，仅展示AI回复正文 | src/pages/AiAssistant.tsx | 后续恢复或新增AI调试信息展示时，需同步AI问答页面说明 |
| 2026-05-05 | AI问答页精简可见文案，删除“不再绑定单个模块”说明和“答辩老师问数据来源和模型可靠性”推荐问题，输入框与覆盖范围同步弱化答辩类提示 | src/pages/AiAssistant.tsx | 后续调整AI问答页标题说明、推荐问题、输入占位文案或覆盖范围时，需同步本变更记录 |
| 2026-05-05 | AI问答取消当前页面/当前模块上下文，改为全系统问答模式，顶部导航进入/ai时不再附带from参数，旧/deepseek入口统一跳转/ai | src/pages/AiAssistant.tsx; src/lib/aiClient.ts; src/components/layout/TopNav.tsx; src/App.tsx | 后续修改AI问答覆盖范围、系统上下文或导航入口时，需同步功能清单、验收标准和风险说明 |
| 2026-05-05 | AI问答改为参考同花顺项目的前端直连AI调用方式，使用VITE_AI_API_KEY、VITE_AI_API_URL、VITE_AI_MODEL，用户无需在页面手动填写Key | src/lib/aiClient.ts; src/pages/AiAssistant.tsx; .env.example; .env.local | 后续修改AI模型、base URL或密钥存放方式时，需同步AI接口说明和风险说明 |
| 2026-05-05 | 顶部导航新增AI问答模块，路由支持/ai并兼容旧/deepseek入口 | src/components/layout/TopNav.tsx; src/App.tsx; src/pages/AiAssistant.tsx; src/lib/aiClient.ts; .env.example | 后续调整AI模型、接口路径、密钥配置或上下文字段时，需同步功能清单、当前接口、验收标准和风险说明 |
| 2026-05-04 | 系统自检修复路由兼容、开发代理端口、顶部通知年份和实时爬取数据池数量，/policy与/data-management改为兼容跳转，数据池稳定展示30条 | src/App.tsx; src/components/layout/TopNav.tsx; vite.config.ts; backend/live_scraper.py; public/data/live_overview.json | 后续修改路由别名、后端端口或爬取池数量时，需同步静态快照、验收路由和部署说明 |
| 2026-05-03 | 数据概览页“碳排放趋势：枢纽与非枢纽城市对比”新增2025年数据点，前端兜底、后端生成逻辑与静态快照同步到2020—2025 | src/pages/Overview.tsx; backend/live_scraper.py; public/data/live_overview.json | 首页趋势年份、静态快照和后端缓存需同步更新 |
| 2026-05-03 | LMDI分解分析目标年份新增2025，并将默认目标年份切换为2025 | src/pages/LmdiDecomposition.tsx | 年份口径、验收项、数据趋势需同步更新 |
| 2026-05-03 | 数据源管理初始数据由4条扩展到18条，每页显示8条，新增负载数据筛选 | src/pages/DataManagement.tsx | 数据源数量、分类和页面验收需同步更新 |
| 2026-05-02 | Vercel静态部署增加SPA路由回退、静态数据快照和登录注册本地兜底 | vercel.json; src/lib/liveData.ts; src/lib/auth.ts; public/data/live_overview.json | 部署方式、接口兜底和风险说明需同步更新 |
| 2026-05-02 | 绿色算力评估接入2025年真实公开网页快照 | backend/live_scraper.py; src/pages/GreenCompute.tsx | 绿色算力年度口径和数据来源需同步更新 |
| 2026-05-02 | DID模型年份轴增加2025和t+4动态效应 | src/pages/DidModel.tsx | DID验收年份范围需同步更新 |

## 后续维护规则

- 以后凡是新增页面、按钮行为、图表口径、年份、城市数据、数据源、后端接口、部署配置，都必须在本节追加一条变更记录。

- 若变更影响用户能看到的功能，还要同步更新“功能需求清单”“核心模块详细需求”和“验收标准”。

- 若变更影响数据来源、真实爬取、静态快照或论文口径，还要同步更新“数据需求与数据模型”和“风险与待确认”。

# 12. 附录: 文档生成依据

| **类别** | **文件/目录** |
|:---|:---|
| 项目说明 | README.md, package.json, .env.example |
| 前端页面 | src/App.tsx, src/pages/\*.tsx, src/components/layout/TopNav.tsx |
| 前端接口 | src/lib/liveData.ts, src/lib/auth.ts, src/lib/actions.ts, src/lib/aiClient.ts |
| 后端接口 | backend/app.py, backend/auth_store.py, backend/live_scraper.py |
| 样例数据 | public/data/live_overview.json, backend/cache/live_overview.json |
| 部署配置 | vercel.json, vite.config.ts, backend/requirements.txt, start_backend.bat |

