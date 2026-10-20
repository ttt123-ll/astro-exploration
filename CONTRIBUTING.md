# 参与开发 / 提交规范

本项目为「传智杯」参赛作品，**所有改动都必须以 Git 提交的形式保存并推送到远程仓库**，
以保证开发过程可追溯。

---

## 一、每次改动必须做的事

```bash
# 1. 查看改动
git status
git diff

# 2. 代码检查（必须零告警）
npm run lint

# 3. 构建验证（改到前端时必须）
npm run build

# 4. 提交（提交信息见下方规范）
git add -A
git commit -m "feat(scope): 说明"

# 5. 推送
git push
```

> 推送前请确认代理已开启（本项目已配置 `http.proxy = 127.0.0.1:7897`）。
> 若代理未运行会报 `Failed to connect to github.com:443`，先启动代理再推送。

---

## 二、提交信息规范（Conventional Commits）

```
<type>(<scope>): <subject>

可选的正文：说明"为什么改"，而不是"改了什么"
```

| type | 含义 | 示例 |
|---|---|---|
| `feat` | 新功能 | `feat(news): 新闻页支持关键词搜索` |
| `fix` | 修复 Bug | `fix(auth): 修复退出登录后 token 仍有效` |
| `docs` | 文档 | `docs: 补充环境变量说明` |
| `style` | 格式 / 代码规范 | `style: 修复 ESLint 告警` |
| `refactor` | 重构（不改功能） | `refactor(server): 拆分路由模块` |
| `perf` | 性能优化 | `perf: 首页视频改为按需加载` |
| `test` | 测试 | `test: 新增返回首页滚动位置用例` |
| `chore` | 构建 / 工具 / 依赖 | `chore(docker): 更新基础镜像` |

**要求**：

- 一个提交只做一件事，不要把无关改动混在一起
- 提交信息用中文或英文均可，但要能看懂改了什么
- 不要出现 `update`、`fix bug`、`123` 这类无意义信息

---

## 三、禁止提交的内容

`.gitignore` 已配置，但提交前仍需自查：

| 禁止提交 | 原因 |
|---|---|
| `.env` | 含数据库密码、JWT 密钥 |
| `node_modules/` | 依赖可由 `package-lock.json` 还原 |
| `client/dist/` | 构建产物 |
| `shots/` | 本地截图 |
| `docker-dist/` | 离线分发包（数百 MB） |
| `git-history.html` | 自动生成的提交历史页面 |

自查命令：

```bash
git status --porcelain
git ls-files | findstr /i ".env"
```

---

## 四、代码检查

```bash
npm run lint        # ESLint 检查（当前 0 error / 0 warning）
npm run lint:fix    # 自动修复
npm run test:all    # API + 前端回归测试
```

提交前至少保证 `npm run lint` 通过。

---

## 五、分支约定

| 分支 | 用途 |
|---|---|
| `main` | 主分支，保持可运行、可部署 |
| `backup/*` | 历史备份分支（仅本地，不推送） |

小改动直接在 `main` 上提交即可；较大的改动建议先建特性分支再合并。

---

## 六、推送与远程

```bash
# 远程地址（已配置）
git remote -v
# origin  https://github.com/ttt123-ll/astro-exploration.git

# 首次或换机器时需要认证：使用 GitHub Personal Access Token
# 生成：https://github.com/settings/tokens/new  → 勾选 repo
```

Windows 下可直接双击项目根目录的 **`推送.bat`**，粘贴 Token 自动完成提交推送。

---

## 七、查看历史

```bash
git log --oneline --graph        # 命令行
gitk                             # 图形界面
node tools/gen-git-history.js    # 生成可视化页面 git-history.html
```
