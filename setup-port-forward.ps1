# PowerShell script to set up port forwarding for WSL2 Docker container
# Run this script as Administrator

# Get WSL2 IP address
$wslIP = (wsl ip addr show eth0 | Select-String "inet " | ForEach-Object { $_.ToString().Trim().Split()[1].Split('/')[0] })
Write-Host "WSL2 IP detected: $wslIP"

# Remove any existing port forwarding rule
Write-Host "Removing existing port forwarding rules..."
netsh interface portproxy delete v4tov4 listenport=8008 listenaddress=0.0.0.0 2>$null

# Add new port forwarding rule
Write-Host "Adding port forwarding rule: localhost:8008 -> $wslIP:8008"
netsh interface portproxy add v4tov4 listenport=8008 listenaddress=0.0.0.0 connectport=8008 connectaddress=$wslIP

# Show current port forwarding rules
Write-Host "Current port forwarding rules:"
netsh interface portproxy show v4tov4

# Add Windows Firewall rule if needed
Write-Host "Adding Windows Firewall rule for port 8008..."
netsh advfirewall firewall delete rule name="WSL2 Port 8008" 2>$null
netsh advfirewall firewall add rule name="WSL2 Port 8008" dir=in action=allow protocol=TCP localport=8008

Write-Host "Port forwarding setup complete!"
Write-Host "You can now access the application at: http://localhost:8008"
