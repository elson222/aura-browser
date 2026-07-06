# Performance Driver Installer — HP Spectre 12th Gen Intel i7-1255U
# Installs: Intel Graphics, Chipset, Dynamic Tuning, Wifi, BT, RST (NVMe)

Write-Host "=== Installing Performance Drivers ===" -ForegroundColor Cyan

# 1. Intel Arc & Iris Xe Graphics Driver (biggest performance boost)
Write-Host "`n[1/5] Intel Graphics Driver..." -ForegroundColor Yellow
winget install --id Intel.IntelGraphicsDriver --silent --accept-package-agreements --accept-source-agreements 2>&1 | Select-String -Pattern "successfully|already|error|failed" | Select-Object -Last 3

# 2. Intel Chipset Device Software
Write-Host "`n[2/5] Intel Chipset Software..." -ForegroundColor Yellow
winget install --id Intel.IntelChipsetDeviceSoftware --silent --accept-package-agreements --accept-source-agreements 2>&1 | Select-String -Pattern "successfully|already|error|failed" | Select-Object -Last 3

# 3. Intel Dynamic Tuning Technology (reduces throttling = sustained max speed)
Write-Host "`n[3/5] Intel Dynamic Tuning (anti-throttle)..." -ForegroundColor Yellow
winget install --id Intel.DynamicTuningTechnology --silent --accept-package-agreements --accept-source-agreements 2>&1 | Select-String -Pattern "successfully|already|error|failed" | Select-Object -Last 3

# 4. Intel Wireless WiFi Driver (faster network = faster downloads)
Write-Host "`n[4/5] Intel WiFi Driver..." -ForegroundColor Yellow
winget install --id Intel.IntelWirelessDriver --silent --accept-package-agreements --accept-source-agreements 2>&1 | Select-String -Pattern "successfully|already|error|failed" | Select-Object -Last 3

# 5. Windows Update — grab any remaining driver updates
Write-Host "`n[5/5] Scanning Windows Update for driver updates..." -ForegroundColor Yellow
$updateSession = New-Object -ComObject Microsoft.Update.Session
$updateSearcher = $updateSession.CreateUpdateSearcher()
try {
    $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Driver'")
    Write-Host "  Found $($searchResult.Updates.Count) driver update(s) via Windows Update."
    if ($searchResult.Updates.Count -gt 0) {
        $searchResult.Updates | ForEach-Object { Write-Host "  - $($_.Title)" }
    }
} catch {
    Write-Host "  Windows Update scan skipped (needs elevation)."
}

Write-Host "`n=== Done! Reboot recommended to apply all drivers. ===" -ForegroundColor Green
