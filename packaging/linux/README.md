# Deploying WorkPulse.Api to a Linux VM (Oracle Always Free)

This runs the app as a real always-on process — no cold starts, no scale-to-zero. Do this once,
after your Oracle Cloud "Always Free" compute instance exists and you can SSH into it.

## 1. Prep the server (Ubuntu, run once)

```sh
sudo apt update && sudo apt install -y nginx
sudo useradd -r -s /usr/sbin/nologin workpulse
sudo mkdir -p /opt/workpulse
sudo chown workpulse:workpulse /opt/workpulse
```

## 2. Copy the build over

From your Windows machine, after running:
```
dotnet publish WorkPulse.Api/WorkPulse.Api.csproj -c Release -r linux-x64 --self-contained true -o publish/linux-x64-api
```

Copy the whole `publish/linux-x64-api/` folder to the server (scp, or zip + upload):
```sh
scp -r publish/linux-x64-api/* ubuntu@YOUR_VM_IP:/tmp/workpulse-build/
ssh ubuntu@YOUR_VM_IP "sudo cp -r /tmp/workpulse-build/* /opt/workpulse/ && sudo chown -R workpulse:workpulse /opt/workpulse && sudo chmod +x /opt/workpulse/WorkPulse.Api"
```

## 3. Set the real secrets

On the server:
```sh
sudo cp workpulse.env.example /opt/workpulse/workpulse.env
sudo nano /opt/workpulse/workpulse.env   # fill in DATABASE_URL, Jwt__Secret (a freshly rotated one), etc.
sudo chmod 600 /opt/workpulse/workpulse.env
sudo chown workpulse:workpulse /opt/workpulse/workpulse.env
```

## 4. Install the systemd service

```sh
sudo cp workpulse-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now workpulse-api
sudo systemctl status workpulse-api   # should say "active (running)"
```

Logs: `sudo journalctl -u workpulse-api -f`

## 5. Put nginx in front (reverse proxy + TLS)

```sh
sudo cp nginx-workpulse.conf /etc/nginx/sites-available/workpulse
# edit server_name in that file to your domain or the VM's public IP first
sudo ln -s /etc/nginx/sites-available/workpulse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

If you have a domain pointed at the VM's IP, add HTTPS with Let's Encrypt (free):
```sh
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
Without a domain, it'll be plain HTTP over the VM's IP — fine for testing, not recommended long-term
(browsers increasingly distrust plain HTTP, and login/JWT auth should really be over HTTPS).

## 6. Open the firewall

Oracle Cloud blocks inbound traffic by default at the *cloud* network level, separate from the OS
firewall. In the Oracle Console: your VM's subnet → **Security Lists** → add ingress rules for TCP
80 and 443 from 0.0.0.0/0. Then also check the OS-level firewall if `ufw` is active:
```sh
sudo ufw allow 80,443/tcp
```

## Updating the app later

Repeat step 2 (copy new build over), then:
```sh
sudo systemctl restart workpulse-api
```
