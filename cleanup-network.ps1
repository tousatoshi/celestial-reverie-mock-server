#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Celestial Reverie 网络环境还原与清理工具     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$defaultRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1
$adapterAlias = if ($defaultRoute) { $defaultRoute.InterfaceAlias } else { 'WLAN' }

Write-Host "`n[1/3] 正在移除游戏 IP 别名 (网卡: $adapterAlias)..." -ForegroundColor Yellow
$gameIPs = @('106.12.163.121', '47.102.114.186', '120.48.80.27', '8.211.243.233')

foreach ($gip in $gameIPs) {
    try {
        Remove-NetIPAddress -IPAddress $gip -InterfaceAlias $adapterAlias -Confirm:$false -ErrorAction Stop | Out-Null
        Write-Host "  [OK] 已移除别名: $gip" -ForegroundColor Green
    } catch {
        Write-Host "  [i] 别名 $gip 未绑定或已移除。" -ForegroundColor Gray
    }
}

Write-Host "`n[2/3] 正在清理 hosts 文件中的重定向规则..." -ForegroundColor Yellow
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
if (Test-Path $hostsPath) {
    $domains = @('106.12.163.121', '47.102.114.186', '120.48.80.27', '8.211.243.233', 'singulardance.cn', 'singulardance.cn-sh2.ufileos.com')
    $lines = Get-Content $hostsPath
    $filteredLines = $lines | Where-Object {
        $line = $_
        $matched = $false
        foreach ($d in $domains) {
            if ($line -match [regex]::Escape($d)) {
                $matched = $true
                break
            }
        }
        -not $matched
    }
    Set-Content -Path $hostsPath -Value $filteredLines
    Write-Host "  [OK] hosts 重定向规则清理完毕！" -ForegroundColor Green
}

Write-Host "`n[3/3] 正在将网卡 [$adapterAlias] 还原为 DHCP 自动获取..." -ForegroundColor Yellow
try {
    netsh interface ip set address name="$adapterAlias" source=dhcp | Out-Null
    netsh interface ip set dnsservers name="$adapterAlias" source=dhcp | Out-Null
    Write-Host "  [OK] 网卡 [$adapterAlias] 已恢复为 DHCP 自动获取 IP 与 DNS！" -ForegroundColor Green
} catch {
    Write-Host "  [!] 恢复 DHCP 失败: $_" -ForegroundColor Red
}

ipconfig /flushdns | Out-Null
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  🎉 网络环境已成功完全还原！系统网络恢复原生状态。" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
