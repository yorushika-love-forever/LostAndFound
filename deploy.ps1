# =============================================================
#  一键部署脚本：构建「学生端 + 管理端」并上传到云服务器
#
#  用法（在本目录打开 PowerShell 后执行）：
#      powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#
#  部署结构（两端共用同一个域名，靠路径前缀区分）：
#      https://<IP>/            → 学生端   /var/www/pickup/
#      https://<IP>/admin/...   → 管理端   /var/www/pickup/admin/
#  之所以管理端要放子目录，是因为两个工程的打包产物里都有 /assets/ 目录，
#  同目录部署会互相覆盖；管理端已在 vite.config.ts 里设置 base: '/admin/'。
#
#  站点使用自签名证书（见本目录 Caddyfile）：浏览器首次访问会提示「连接不安全」，
#  点「继续访问」即可。这是开启浏览器定位（需 HTTPS 安全上下文）的前提。
# =============================================================

# ---------------- 配置区（换服务器只需改这里） ----------------
$ServerIP       = "120.26.56.74"           # 云服务器公网 IP
$ServerUser     = "root"                   # 登录用户名
$RemoteDir      = "/var/www/pickup"        # 学生端在服务器上的目录
$AdminRemoteDir = "/var/www/pickup/admin"  # 管理端在服务器上的目录（子路径必须叫 admin）

$ProjectDir = $PSScriptRoot                                    # 脚本所在目录（学生端项目根目录）
$AdminDir   = Join-Path $ProjectDir "new-LostAndFoung-admin"   # 管理端子工程目录
# -------------------------------------------------------------

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===== 开始部署 =====" -ForegroundColor Cyan
Write-Host "学生端：$ServerUser@$ServerIP`:$RemoteDir"
Write-Host "管理端：$ServerUser@$ServerIP`:$AdminRemoteDir"
Write-Host ""

# ---- 第 1 步：构建学生端 ----
Write-Host "[1/5] 正在构建学生端..." -ForegroundColor Yellow
Set-Location $ProjectDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "学生端构建失败。如果报的是 TypeScript 类型错误，可以先临时跳过类型检查：" -ForegroundColor Red
    Write-Host "    npm run build-only" -ForegroundColor Red
    exit 1
}
Write-Host "[1/5] 学生端构建完成" -ForegroundColor Green

# ---- 第 2 步：构建管理端 ----
# 管理端是独立子工程（自己的 package.json / node_modules），必须切到它自己的目录再构建。
Write-Host "[2/5] 正在构建管理端..." -ForegroundColor Yellow
Set-Location $AdminDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "管理端构建失败，已终止。" -ForegroundColor Red
    exit 1
}
Write-Host "[2/5] 管理端构建完成" -ForegroundColor Green

# ---- 第 3 步：检查产物 ----
# 两端都必须存在 index.html，少一个就说明构建没真正跑成功，提前拦住比传上去再排查省事。
$DistDir      = Join-Path $ProjectDir "dist"
$AdminDistDir = Join-Path $AdminDir   "dist"
foreach ($pair in @(@($DistDir, "学生端"), @($AdminDistDir, "管理端"))) {
    if (-not (Test-Path (Join-Path $pair[0] "index.html"))) {
        Write-Host "[3/5] 找不到 $($pair[1]) 的 dist\index.html，构建产物异常，已终止。" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[3/5] 两端产物检查通过" -ForegroundColor Green

# ---- 第 4 步：上传学生端 ----
# 注意：这里是「复制进」已有目录，不会删除服务器上的 admin 子目录。
Write-Host "[4/5] 正在上传学生端（请输入服务器密码）..." -ForegroundColor Yellow
scp -r "$DistDir\*" "${ServerUser}@${ServerIP}:${RemoteDir}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "上传失败。常见原因：" -ForegroundColor Red
    Write-Host "  1. 密码输错" -ForegroundColor Red
    Write-Host "  2. 安全组没有放行 22 端口" -ForegroundColor Red
    Write-Host "  3. 服务器已关机或欠费" -ForegroundColor Red
    exit 1
}
Write-Host "[4/5] 学生端上传完成" -ForegroundColor Green

# ---- 第 5 步：上传管理端 ----
# 顺序必须是：建目录 → 上传 → 最后修权限，三步不能颠倒。
# chmod 修的是「已经传上去的文件」，若放在上传之前执行，新传的 assets 目录
# 就拿不到授权，Caddy 会读不到里面的 JS/CSS，表现为 index.html 能打开但页面白屏。
Write-Host "[5/5] 正在上传管理端（请输入服务器密码）..." -ForegroundColor Yellow
ssh "${ServerUser}@${ServerIP}" "mkdir -p $AdminRemoteDir"
if ($LASTEXITCODE -ne 0) {
    Write-Host "创建管理端目录失败，已终止。" -ForegroundColor Red
    exit 1
}
scp -r "$AdminDistDir\*" "${ServerUser}@${ServerIP}:${AdminRemoteDir}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "管理端上传失败，已终止。" -ForegroundColor Red
    exit 1
}
# Caddy 以 caddy 用户（而非 root）运行，静态文件必须对它可读、目录必须可进入。
# a+rX 里的 X 是「只给目录加执行位」，这样既能遍历目录又不会误给普通文件加执行权限。
ssh "${ServerUser}@${ServerIP}" "chmod -R a+rX $RemoteDir"
if ($LASTEXITCODE -ne 0) {
    Write-Host "修改文件权限失败，已终止。" -ForegroundColor Red
    exit 1
}
Write-Host "[5/5] 管理端上传完成" -ForegroundColor Green

Write-Host ""
Write-Host "===== 部署成功 =====" -ForegroundColor Cyan
Write-Host "学生端：https://$ServerIP" -ForegroundColor White
Write-Host "管理端：https://$ServerIP/admin/login" -ForegroundColor White
Write-Host "重要：浏览器必须按 Ctrl + Shift + R 强制刷新，否则看到的还是旧页面。" -ForegroundColor Yellow
Write-Host ""
Write-Host "提示：管理端构建产物带 /admin/ 前缀，必须配合 Caddy 的 /admin* 回退规则才能刷新子路由不掉 404。" -ForegroundColor Yellow
Write-Host ""

# -------------------------------------------------------------
# 附注：
# 1. 每次构建会生成带新哈希的文件名（如 index-Dta2iwsb.js），
#    旧文件会保留在服务器 assets 目录里。不影响使用，只是占一点空间。
#    想清理可在服务器执行： rm -rf /var/www/pickup/assets /var/www/pickup/admin/assets
# 2. 每次运行都要输密码（共 4 次：scp 学生端、ssh 建目录、scp 管理端、ssh 修权限）。想免密可配置 SSH 密钥：
#      ssh-keygen -t ed25519
#      type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@120.26.56.74 "cat >> ~/.ssh/authorized_keys"
# 3. 管理端的后端地址由 new-LostAndFoung-admin\.env.development 控制，仅影响本地开发；
#    线上管理端的接口走相对路径 /api/v1，由 Caddy 反向代理到后端。
# -------------------------------------------------------------
