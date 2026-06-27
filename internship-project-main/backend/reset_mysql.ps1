$initPath = "C:\mysql-init.txt"
"ALTER USER 'root'@'localhost' IDENTIFIED BY 'avinash@2912';" | Out-File -FilePath $initPath -Encoding ascii

Write-Host "1. Stopping MySQL97 Service..." -ForegroundColor Yellow
Stop-Service -Name "MySQL97" -Force

Write-Host "2. Starting temporary MySQL instance to apply password..." -ForegroundColor Yellow
$mysqldPath = "C:\Program Files\MySQL\MySQL Server 9.7\bin\mysqld.exe"
$defaultsPath = "C:\ProgramData\MySQL\MySQL Server 9.7\my.ini"

$process = Start-Process -FilePath $mysqldPath -ArgumentList "--defaults-file=`"$defaultsPath`"", "--init-file=`"$initPath`"", "--console" -PassThru -WindowStyle Hidden

Write-Host "3. Waiting for password reset to execute (10 seconds)..." -ForegroundColor Yellow
for ($i = 10; $i -gt 0; $i--) {
    Write-Host "$i..." -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host ""

Write-Host "4. Stopping temporary MySQL instance..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue

Write-Host "5. Restarting normal MySQL97 Service..." -ForegroundColor Yellow
Start-Service -Name "MySQL97"

Write-Host "6. Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item -Path $initPath -Force -ErrorAction SilentlyContinue

Write-Host "`nSUCCESS: Your MySQL root password has been reset to: avinash@2912" -ForegroundColor Green
