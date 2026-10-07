# =============================================================
#  一键部署脚本：构建前端并上传到云服务器
#
#  用法（在本目录打开 PowerShell 后执行）：
#      powershell -ExecutionPolicy Bypass -File .\deploy.ps1
# =============================================================

# ---------------- 配置区（换服务器只需改这里） ----------------
$ServerIP   = "120.26.56.74"        # 云服务器公网 IP
$ServerUser = "root"                # 登录用户名
$RemoteDir  = "/var/www/pickup"     # 服务器上的网站目录

$ProjectDir = $PSScriptRoot         # 脚本所在目录（即项目根目录）
# -------------------------------------------------------------

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===== 开始部署 =====" -ForegroundColor Cyan
Write-Host "目标服务器：$ServerUser@$ServerIP`:$RemoteDir"
Write-Host ""

# ---- 第 1 步：构建 ----
Write-Host "[1/3] 正在构建前端..." -ForegroundColor Yellow
Set-Location $ProjectDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "构建失败。如果报的是 TypeScript 类型错误，可以先临时跳过类型检查：" -ForegroundColor Red
    Write-Host "    npm run build-only" -ForegroundColor Red
    exit 1
}
Write-Host "[1/3] 构建完成" -ForegroundColor Green

# ---- 第 2 步：检查产物 ----
$DistDir = Join-Path $ProjectDir "dist"
if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
    Write-Host "[2/3] 找不到 dist\index.html，构建产物异常，已终止。" -ForegroundColor Red
    exit 1
}
Write-Host "[2/3] 产物检查通过" -ForegroundColor Green

# ---- 第 3 步：上传（会提示输入服务器密码）----
Write-Host "[3/3] 正在上传（请输入服务器密码）..." -ForegroundColor Yellow
scp -r "$DistDir\*" "${ServerUser}@${ServerIP}:${RemoteDir}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "上传失败。常见原因：" -ForegroundColor Red
    Write-Host "  1. 密码输错" -ForegroundColor Red
    Write-Host "  2. 安全组没有放行 22 端口" -ForegroundColor Red
    Write-Host "  3. 服务器已关机或欠费" -ForegroundColor Red
    exit 1
}
Write-Host "[3/3] 上传完成" -ForegroundColor Green

Write-Host ""
Write-Host "===== 部署成功 =====" -ForegroundColor Cyan
Write-Host "访问地址：http://$ServerIP" -ForegroundColor White
Write-Host "重要：浏览器必须按 Ctrl + Shift + R 强制刷新，否则看到的还是旧页面。" -ForegroundColor Yellow
Write-Host ""

# -------------------------------------------------------------
# 附注：
# 1. 每次构建会生成带新哈希的文件名（如 index-Dta2iwsb.js），
#    旧文件会保留在服务器 assets 目录里。不影响使用，只是占一点空间。
#    想清理可在服务器执行： rm -rf /var/www/pickup/assets
# 2. 每次运行都要输密码。想免密可配置 SSH 密钥（在本机执行一次）：
#      ssh-keygen -t ed25519
#      type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@120.26.56.74 "cat >> ~/.ssh/authorized_keys"
# -------------------------------------------------------------
