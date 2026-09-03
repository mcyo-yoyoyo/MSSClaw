@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM ============================================================
REM  MSS Claw 内网重启脚本（Windows）
REM
REM  用法：
REM    restart.bat            拉取代码 + 装依赖 + 迁移 + 构建 + 重启
REM    restart.bat quick      仅重启服务（不拉代码 / 不装依赖 / 不构建）
REM    restart.bat nopull     跳过 git pull，其余照常（离线拷贝部署时用）
REM
REM  为什么默认要装依赖和跑迁移：
REM    node_modules 与数据库表结构都不在 git 里，只拉代码不做这两步，
REM    会以 "Cannot find module xxx" 或 "no such column" 的形式在启动后才炸，
REM    报错信息不会提示你少做了哪一步。
REM ============================================================

set "MODE=%~1"
if "%MODE%"=="" set "MODE=full"

REM 切到仓库根目录（本脚本位于 deploy\windows\）
cd /d "%~dp0..\.."
echo [信息] 仓库目录：%CD%
echo.

REM ---------- 1. 停止占用端口的进程 ----------
REM 只停 API（3000）。前端是静态产物，只需重新 build，不杀 5173 上的进程。
call :STOP_PORT 3000 API

if /I "%MODE%"=="quick" goto :START

REM ---------- 2. 拉取代码 ----------
if /I not "%MODE%"=="nopull" (
  where git >nul 2>&1
  if errorlevel 1 (
    echo [跳过] 未找到 git，跳过拉取代码
  ) else (
    echo [1/5] 拉取最新代码...
    git pull
    if errorlevel 1 (
      echo [失败] git pull 出错，请先处理冲突或本地改动后重试
      goto :FAIL
    )
  )
) else (
  echo [跳过] nopull 模式，不拉取代码
)
echo.

REM ---------- 3. 安装依赖 ----------
echo [2/5] 安装依赖（npm ci，严格按 package-lock 安装）...
call npm ci
if errorlevel 1 (
  echo [提示] npm ci 失败，回退到 npm install...
  call npm install
  if errorlevel 1 (
    echo [失败] 依赖安装失败，请检查网络或内网 npm 镜像配置
    goto :FAIL
  )
)
echo.

REM ---------- 4. 数据库：先备份，再迁移 ----------
echo [3/5] 备份数据库并执行迁移...
call :BACKUP_DB

REM migrate deploy 只应用未执行的迁移，绝不重置数据库；
REM 切勿在生产使用 prisma migrate dev（会交互提问，检测到 drift 时会清库）
call npx prisma migrate deploy --schema apps\api\prisma\schema.prisma
if errorlevel 1 (
  echo [失败] 数据库迁移失败，服务未启动。数据库备份见 backups 目录
  goto :FAIL
)
call npm run prisma:generate --workspace @mss-claw/api
if errorlevel 1 (
  echo [失败] Prisma Client 生成失败
  goto :FAIL
)
echo.

REM ---------- 5. 构建 ----------
echo [4/5] 构建前端与 API...
call npm run build
if errorlevel 1 (
  echo [失败] 前端构建失败
  goto :FAIL
)
call npm run build:api
if errorlevel 1 (
  echo [失败] API 构建失败
  goto :FAIL
)
echo.

:START
REM ---------- 6. 启动 API ----------
REM LLM 调用必须直连内网模型网关。Node 的全局 fetch 默认忽略 HTTP_PROXY，
REM 但只要环境里有 NODE_USE_ENV_PROXY=1 就会启用 EnvHttpProxyAgent，把内网
REM 地址也塞进公司代理；代理没有内网路由，表现为 6 秒后 502/504，前台看到的是
REM "Proxy response (504) !== 200 when HTTP Tunneling"。
REM 注意 NO_PROXY 救不了：它按主机名匹配，写 10.0.0.0/8 这类网段对域名无效。
REM AI 快讯不受影响，那条路是显式 new ProxyAgent(HTTPS_PROXY)，不依赖本变量。
set "NODE_USE_ENV_PROXY="

echo [5/5] 启动 API...
start "MSS Claw API" cmd /k "cd /d %CD%\apps\api && npm run start:prod"

REM 等待健康检查通过，最多 30 秒
set /a TRIES=0
:WAIT
timeout /t 2 /nobreak >nul
set /a TRIES+=1
curl -s -m 3 http://localhost:3000/api/v1/health >nul 2>&1
if not errorlevel 1 goto :OK
if !TRIES! LSS 15 goto :WAIT

echo.
echo [警告] 30 秒内未通过健康检查。请查看新开的 "MSS Claw API" 窗口里的日志。
echo         常见原因：apps\api\.env 缺失或 DATABASE_URL 配置错误。
goto :END

:OK
echo.
echo [完成] API 已启动：http://localhost:3000/api/v1/health
echo.
echo 前端为静态产物，位于 apps\web\dist，由 Nginx/IIS 托管即可。
echo 若需本机预览：npm run preview
goto :END

REM ============================================================
REM  子过程
REM ============================================================

:STOP_PORT
REM %1=端口 %2=名称。按端口精确定位 PID，不用 taskkill /IM node.exe，
REM 那会误杀机器上其它与本项目无关的 Node 进程。
set "FOUND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%~1 "') do (
  if not "%%P"=="0" (
    echo [停止] %~2 占用端口 %~1，结束进程 PID=%%P
    taskkill /PID %%P /F >nul 2>&1
    set "FOUND=1"
  )
)
if not defined FOUND echo [信息] 端口 %~1 无进程占用（%~2）
exit /b 0

:BACKUP_DB
REM SQLite 是单文件；WAL 模式下 -wal/-shm 也要一并备份，否则可能丢最近写入
if not exist "backups" mkdir "backups"
REM %DATE% 的格式随系统区域设置变化，按下标截取会错位；用 PowerShell 取标准格式。
REM 这里是 -Command 内联调用，不受 .ps1 脚本执行策略限制。
set "TS="
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss" 2^>nul') do set "TS=%%T"
if not defined TS set "TS=%RANDOM%"
set "DBDIR=apps\api\prisma"
if exist "%DBDIR%\prod.db" (
  copy /Y "%DBDIR%\prod.db" "backups\prod_%TS%.db" >nul
  if exist "%DBDIR%\prod.db-wal" copy /Y "%DBDIR%\prod.db-wal" "backups\prod_%TS%.db-wal" >nul
  if exist "%DBDIR%\prod.db-shm" copy /Y "%DBDIR%\prod.db-shm" "backups\prod_%TS%.db-shm" >nul
  echo [备份] backups\prod_%TS%.db
) else (
  echo [信息] 未找到 %DBDIR%\prod.db，跳过备份（首次部署或使用了其它 DATABASE_URL）
)
exit /b 0

:FAIL
echo.
echo ===== 执行中断，服务未启动 =====
pause
exit /b 1

:END
endlocal
pause
