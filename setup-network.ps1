#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Celestial Reverie 离线网络环境自动配置工具   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "`n[1/4] 正在探测当前系统活跃上网网卡与网络参数..." -ForegroundColor Yellow
$defaultRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1

if (-not $defaultRoute) {
    Write-Host "[!] 错误: 未检测到活动的默认网关，请确保计算机已连接互联网或局域网。" -ForegroundColor Red
    exit 1
}

$adapterAlias = $defaultRoute.InterfaceAlias
$gateway = $defaultRoute.NextHop
$ipObj = Get-NetIPAddress -InterfaceAlias $adapterAlias -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1

if (-not $ipObj) {
    Write-Host "[!] 错误: 未能获取网卡 [$adapterAlias] 的 IPv4 地址。" -ForegroundColor Red
    exit 1
}

$currentIP = $ipObj.IPAddress
$prefixLength = $ipObj.PrefixLength
$dnsList = (Get-DnsClientServerAddress -InterfaceAlias $adapterAlias -AddressFamily IPv4 -ErrorAction SilentlyContinue).ServerAddresses

Write-Host "  [OK] 检测到活跃网卡: [$adapterAlias]" -ForegroundColor Green
Write-Host "       本机 IPv4 地址 : $currentIP" -ForegroundColor Gray
Write-Host "       子网掩码长度   : /$prefixLength" -ForegroundColor Gray
Write-Host "       默认网关       : $gateway" -ForegroundColor Gray
Write-Host "       当前 DNS 服务器: $($dnsList -join ', ')" -ForegroundColor Gray

Write-Host "`n[2/4] 正在安全固化本地静态 IP（防止与游戏别名冲突导致断网）..." -ForegroundColor Yellow
$ipInterface = Get-NetIPInterface -InterfaceAlias $adapterAlias -AddressFamily IPv4
if ($ipInterface.Dhcp -eq 'Enabled') {
    Write-Host "  [*] 网卡当前为 DHCP 自动获取，正在平滑转换为静态 IP..." -ForegroundColor Cyan

    $maskBytes = @(0,0,0,0)
    for ($i = 0; $i -lt $prefixLength; $i++) {
        $maskBytes[[math]::Floor($i / 8)] = $maskBytes[[math]::Floor($i / 8)] -bor (1 -shl (7 - ($i % 8)))
    }
    $subnetMask = $maskBytes -join '.'

    netsh interface ip set address name="$adapterAlias" static $currentIP $subnetMask $gateway 1 | Out-Null
    if ($dnsList -and $dnsList.Count -gt 0) {
        netsh interface ip set dnsservers name="$adapterAlias" static $($dnsList[0]) validate=no | Out-Null
        if ($dnsList.Count -gt 1) {
            netsh interface ip add dnsservers name="$adapterAlias" $($dnsList[1]) validate=no | Out-Null
        }
    }
    Write-Host "  [OK] 已成功将网卡 [$adapterAlias] 固化为静态 IP，网络连接平稳保持！" -ForegroundColor Green
} else {
    Write-Host "  [i] 网卡 [$adapterAlias] 已是静态 IP，无需转换。" -ForegroundColor Gray
}

Write-Host "`n[3/4] 正在添加游戏服务器目标 IP 别名..." -ForegroundColor Yellow
$gameIPs = @('106.12.163.121', '47.102.114.186', '120.48.80.27', '8.211.243.233')

foreach ($gip in $gameIPs) {
    $existing = Get-NetIPAddress -InterfaceAlias $adapterAlias -IPAddress $gip -ErrorAction SilentlyContinue
    if (-not $existing) {
        try {
            netsh interface ip add address "$adapterAlias" $gip 255.255.255.255 | Out-Null
            Write-Host "  [OK] 成功绑定别名: $gip/32 -> [$adapterAlias]" -ForegroundColor Green
        } catch {
            Write-Host "  [!] 绑定别名 $gip 失败: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  [i] 别名 $gip 已经存在，跳过添加。" -ForegroundColor Gray
    }
}

Write-Host "`n[4/4] 正在配置系统 hosts 文件重定向..." -ForegroundColor Yellow
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsEntries = @(
    "127.0.0.1  106.12.163.121",
    "127.0.0.1  47.102.114.186",
    "127.0.0.1  120.48.80.27",
    "127.0.0.1  8.211.243.233",
    "127.0.0.1  singulardance.cn",
    "127.0.0.1  singulardance.cn-sh2.ufileos.com"
)

$hostsContent = Get-Content $hostsPath -Raw -ErrorAction SilentlyContinue
foreach ($entry in $hostsEntries) {
    $domainOrIp = ($entry -split '\s+')[1]
    if ($hostsContent -notmatch [regex]::Escape($domainOrIp)) {
        Add-Content $hostsPath "`r`n$entry"
        Write-Host "  [OK] 追加 hosts 规则: $entry" -ForegroundColor Green
    } else {
        Write-Host "  [i] hosts 中已包含 $domainOrIp 规则，跳过。" -ForegroundColor Gray
    }
}

ipconfig /flushdns | Out-Null
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  🎉 网络配置全部完成！游戏流量已成功定向至本地 Mock 服务。" -ForegroundColor Green
Write-Host "  后续启动游戏前，请确保在终端运行: node server.js" -ForegroundColor Yellow
Write-Host "  如需还原原始网络设置，可运行: powershell -File scripts/cleanup-network.ps1" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
