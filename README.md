# 🍊 餐算子 CanSuanZi

> 让西澳餐饮老板不再为排班、工资、成本发愁的一站式SaaS

## 技术栈

- 前端: Vue 3 + Vite + Naive UI + Pinia + Vue Router + Vue I18n
- 后端: Node.js + Express + Knex.js + JWT + MySQL
- 部署: Docker Compose (Nginx + API + MySQL)

## 本地开发

```bash
# 后端
cd server
cp .env.example .env   # 编辑数据库密码和 JWT_SECRET
npm install
npm run migrate        # 建表
npm run seed           # 灌入系统模板
npm run dev            # 启动 API (port 3000)

# 前端
cd client
npm install
npm run dev            # 启动前端 (port 5173，自动代理 /api 到后端)
```

## Docker 部署

```bash
# 构建前端
cd client && npm run build

# 启动所有服务
cd ..
DB_PASSWORD=xxx JWT_SECRET=xxx MYSQL_ROOT_PASSWORD=xxx docker compose up -d

# 首次运行迁移
docker compose exec api npm run migrate
docker compose exec api npm run seed
```

## 项目结构

```
can-suan-zi/
├── client/          # Vue 3 前端
│   └── src/
│       ├── api/     # API 请求
│       ├── i18n/    # 中英文
│       ├── layouts/ # 布局
│       ├── router/  # 路由
│       ├── store/   # Pinia
│       └── views/   # 页面
├── server/          # Node.js 后端
│   └── src/
│       ├── config/  # 数据库
│       ├── middleware/ # JWT + 权限
│       ├── routes/  # REST API
│       └── utils/   # 工资计算
├── docker-compose.yml
├── nginx.conf
└── docs/            # PRD / 架构 / 设计 / 组件 / 迭代
```

## API 端点

| 模块 | 端点 |
|------|------|
| 认证 | POST /api/auth/register, /login, /me |
| 员工 | GET/POST /api/employees |
| 排班 | GET/POST /api/shifts, /templates |
| 审批 | /api/approvals/swaps, /leaves |
| 日报 | /api/reports/pos, /pos/import-csv |
| 支出 | /api/expenses |
| 工资 | /api/payroll |
| 看板 | /api/dashboard |
| 设置 | /api/settings |
