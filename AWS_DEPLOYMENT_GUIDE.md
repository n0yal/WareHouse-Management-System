# AWS Free Tier Deployment Guide

For this repo, the simplest AWS deployment is:

1. `EC2` for the Node/React app
2. `RDS PostgreSQL` for the database
3. `Nginx` on EC2 as a reverse proxy
4. Optional: domain later

Important first: the frontend currently hardcodes `http://localhost:5000/api` in some components. Before deploy, change API URLs to relative `/api` or an env-based value like `import.meta.env.VITE_API_URL`. Otherwise browsers in production will call their own localhost.

## Cost Notes

1. AWS Free Tier changed on July 15, 2025. Accounts created before that use the legacy 12-month model; accounts created on or after July 15, 2025 use the newer credit/free-plan model. Check your exact eligibility first.
2. Route 53 is not free by default; public hosted zones are billed.
3. Public IPv4 can also cost money outside free-tier or credit coverage.
4. RDS PostgreSQL free-tier info currently lists `db.t3.micro` and `db.t4g.micro`, `20 GB` storage, Single-AZ.

## Recommended Architecture

1. `EC2` Amazon Linux 2023, free-tier-eligible instance
2. `RDS PostgreSQL` in the same region and VPC
3. `Nginx` on EC2 listening on port `80`
4. App running on `localhost:5000`
5. Browser hits `http://your-ec2-public-dns`, Nginx proxies to Express

## Step 1: Create AWS account and billing alerts

1. Sign in to AWS and confirm whether your account is legacy free tier or the newer post-July-15-2025 free plan.
2. In Billing, create a budget alarm immediately:
3. `$5` actual spend alert
4. `$10` forecast alert

## Step 2: Choose one AWS region

1. Use one region only, for example `us-east-1`.
2. Keep EC2 and RDS in the same region.

## Step 3: Create an EC2 key pair

1. Open `EC2 Console`
2. Go to `Key Pairs`
3. Click `Create key pair`
4. Choose `RSA` or `ED25519`
5. Download the `.pem`
6. On your machine:

```bash
chmod 400 your-key.pem
```

## Step 4: Create security groups

Create two security groups.

For `app-sg`:

1. Inbound `SSH 22` from `your current IP only`
2. Inbound `HTTP 80` from `0.0.0.0/0`
3. Inbound `HTTPS 443` from `0.0.0.0/0` if you will add TLS later
4. Do not open `5000` publicly

For `db-sg`:

1. Inbound `PostgreSQL 5432`
2. Source = `app-sg`
3. Do not allow `0.0.0.0/0`

## Step 5: Launch EC2

1. Open `EC2 Console`
2. Click `Launch instance`
3. Name it `warehouse-app`
4. AMI: `Amazon Linux 2023`
5. Instance type: choose a free-tier-eligible type for your account
6. Key pair: the one you created
7. Security group: `app-sg`
8. Storage: small root volume
9. Launch

## Step 6: Create RDS PostgreSQL

1. Open `RDS Console`
2. Click `Create database`
3. Engine: `PostgreSQL`
4. Template: `Free tier`
5. DB instance class: `db.t3.micro` or `db.t4g.micro`
6. Storage: `20 GB`
7. Single-AZ
8. Create and save the DB username and password
9. VPC: same VPC as EC2
10. Public access: `No`
11. Security group: `db-sg`
12. Initial DB name: `warehouse_db`
13. Create DB
14. Wait until status is `Available`
15. Copy the RDS endpoint

## Step 7: SSH into EC2

Use the public DNS or public IP:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_DNS
```

## Step 8: Install software on EC2

On Amazon Linux 2023:

```bash
sudo dnf update -y
sudo dnf install -y git nginx
sudo dnf install -y nodejs20 nodejs20-npm
node -v
npm -v
```

## Step 9: Copy your app to EC2

If your code is in Git:

```bash
git clone YOUR_REPO_URL warehouse_management
cd warehouse_management
```

If not, upload it with `scp` or GitHub first.

## Step 10: Create production env file

Inside the app directory:

```bash
nano .env
```

Use something like:

```env
DATABASE_URL="postgresql://DBUSER:DBPASSWORD@RDS-ENDPOINT:5432/warehouse_db?schema=public"
PORT=5000
FRONTEND_URL=http://YOUR_EC2_PUBLIC_DNS
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
ADMIN_EMAIL=...
EXPIRY_WARNING_DAYS=30
EXPIRY_EMAIL_HOUR=8
EXPIRY_EMAIL_MINUTE=0
```

## Step 11: Install dependencies and build

```bash
npm install
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js
npm run build
```

## Step 12: Run the app with systemd

Create a service:

```bash
sudo nano /etc/systemd/system/warehouse.service
```

Paste:

```ini
[Unit]
Description=Warehouse Management App
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/warehouse_management
EnvironmentFile=/home/ec2-user/warehouse_management/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now warehouse
sudo systemctl status warehouse
```

## Step 13: Configure Nginx

Create config:

```bash
sudo nano /etc/nginx/conf.d/warehouse.conf
```

Paste:

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable Nginx:

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

## Step 14: Test

1. Open:

```text
http://YOUR_EC2_PUBLIC_DNS
```

2. Test API:

```text
http://YOUR_EC2_PUBLIC_DNS/api/health
```

## Step 15: If it fails, check logs

```bash
sudo systemctl status warehouse
journalctl -u warehouse -n 200 --no-pager
sudo systemctl status nginx
sudo tail -n 200 /var/log/nginx/error.log
```

## Step 16: Optional domain

1. Buy a domain anywhere, or use Route 53
2. Point an `A` record to your EC2 public IP or Elastic IP
3. Note: Route 53 public hosted zones are billed monthly

## Step 17: Optional HTTPS

For the cheapest setup, do HTTPS directly on EC2 with Nginx and Let’s Encrypt.

If you want AWS-managed certs with ACM, that is cleaner with services like ALB or CloudFront, but that is usually not the lowest-cost free-tier path.

## Step 18: Keep costs down

1. Stop using multiple EC2 instances
2. Do not create a load balancer unless needed
3. Do not open RDS publicly
4. Do not leave extra public IPv4 or Elastic IP resources around
5. Watch Billing weekly

## Recommendation For This App

1. First patch all hardcoded frontend API URLs from `http://localhost:5000/api` to `/api`
2. Deploy on `1 EC2 + 1 RDS`
3. Add domain and HTTPS only after the app works over plain HTTP

## Official Sources

1. AWS Free Tier: https://aws.amazon.com/free/
2. EC2 Free Tier tracking and pre/post July 15, 2025 differences: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html
3. EC2 key pairs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html
4. Connect to Linux EC2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-linux-instance.html
5. EC2 security groups: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
6. Amazon Linux 2023 Node.js: https://docs.aws.amazon.com/linux/al2023/ug/nodejs.html
7. RDS free tier: https://aws.amazon.com/rds/free/
8. Elastic IP and public IPv4 notes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
9. Route 53 pricing: https://aws.amazon.com/route53/pricing/
