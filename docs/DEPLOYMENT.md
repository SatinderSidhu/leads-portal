# Leads Portal — AWS Deployment Guide

## Architecture (Budget-Friendly)

Everything runs on a **single EC2 instance** via Docker Compose:

```
Internet → Nginx (SSL) → Admin Portal (:3000)
                       → Customer Portal (:3001)
                       → PostgreSQL (:5432, internal only)
```

**Estimated monthly cost: ~$10–18/mo**
- EC2 `t3.micro` (free tier) or `t3.small` (~$15/mo)
- ECR: free tier covers 500MB/mo
- EBS: 20GB gp3 included
- SSL: free (Let's Encrypt)

---

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- Docker installed locally
- A GitHub repository for the project
- Two domain names (e.g., `admin.yourdomain.com`, `portal.yourdomain.com`)

---

## Step 1: Provision AWS Resources

```bash
# Set your preferred region (optional, defaults to us-east-1)
export AWS_REGION=us-east-1

# Run the setup script
bash scripts/aws-setup.sh
```

This creates:
- 2 ECR repositories (image registry)
- 1 EC2 instance with Docker pre-installed
- Security group (ports 22, 80, 443)
- IAM role for ECR access

**Save the generated `.pem` key file securely!**

---

## Step 2: Configure DNS

Point your domains to the EC2 public IP (shown in setup output):

| Record | Type | Value |
|--------|------|-------|
| `admin.yourdomain.com` | A | `<EC2_IP>` |
| `portal.yourdomain.com` | A | `<EC2_IP>` |

Wait for DNS propagation (usually 5–15 minutes).

---

## Step 3: Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJal...` |
| `AWS_ACCOUNT_ID` | AWS account number | `123456789012` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `EC2_HOST` | EC2 public IP | `54.123.45.67` |
| `EC2_SSH_KEY` | Contents of `.pem` file | `-----BEGIN RSA...` |
| `DB_PASSWORD` | Strong database password | `MyStr0ng!Pass#2024` |
| `SESSION_SECRET` | Random 64-char string | (generate with `openssl rand -hex 32`) |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email username | `you@gmail.com` |
| `SMTP_PASS` | Email app password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | From email address | `you@gmail.com` |
| `API_TOKEN` | External API token | (generate with `openssl rand -hex 24`) |
| `DOMAIN_ADMIN` | Admin portal domain | `admin.yourdomain.com` |
| `DOMAIN_CUSTOMER` | Customer portal domain | `portal.yourdomain.com` |

---

## Step 4: First Deployment

Push to the `main` branch to trigger the CI/CD pipeline:

```bash
git push origin main
```

GitHub Actions will:
1. Build Docker images for admin and customer
2. Push images to ECR
3. SSH into EC2 and deploy via `docker compose`

---

## Step 5: Setup SSL (One-Time)

After the first deployment, SSH into the EC2 instance to obtain SSL certificates:

```bash
# SSH into EC2
ssh -i leads-portal-key.pem ubuntu@<EC2_IP>

# Run SSL setup
cd ~/leads-portal
DOMAIN_ADMIN=admin.yourdomain.com \
DOMAIN_CUSTOMER=portal.yourdomain.com \
bash scripts/init-ssl.sh
```

The certbot container auto-renews certificates every 12 hours.

---

## Ongoing Deployments

After initial setup, every push to `main` automatically:

1. Builds new Docker images (tagged with commit SHA)
2. Pushes to ECR
3. Deploys to EC2 with zero-downtime update
4. Runs health checks

**No manual steps needed for updates!**

---

## Manual Operations

### SSH into the server
```bash
ssh -i leads-portal-key.pem ubuntu@<EC2_IP>
cd ~/leads-portal
```

### View logs
```bash
docker compose logs -f admin      # Admin portal logs
docker compose logs -f customer   # Customer portal logs
docker compose logs -f db         # Database logs
docker compose logs -f nginx      # Nginx logs
```

### Restart a service
```bash
docker compose restart admin
```

### Database backup
```bash
docker compose exec db pg_dump -U postgres leads_portal > backup_$(date +%Y%m%d).sql
```

### Database restore
```bash
cat backup.sql | docker compose exec -T db psql -U postgres leads_portal
```

### Run seed manually
```bash
docker compose exec admin npx tsx packages/database/prisma/seed.ts
```

### View container status
```bash
docker compose ps
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | `docker compose logs <service>` to check errors |
| Database connection error | `docker compose ps db` — ensure healthy |
| SSL cert expired | `docker compose run --rm certbot renew && docker compose restart nginx` |
| Out of disk space | `docker system prune -a` to clean old images |
| Need to change env vars | Edit `~/leads-portal/.env` then `docker compose up -d` |

---

## Live Deployment

| | URL |
|---|---|
| Admin Portal | `https://leadsportaladmin.kitlabs.us` |
| Customer Portal | `https://leadsportal.kitlabs.us` |
| EC2 Elastic IP | `100.52.66.158` |

---

## File Structure (Production)

```
~/leads-portal/          (on EC2)
├── docker-compose.yml   (copied from docker-compose.prod.yml)
├── .env                 (generated by CI/CD)
└── nginx/
    └── conf.d/
        ├── default.conf          (generated with real domains)
        ├── default.conf.initial  (HTTP-only for SSL setup)
        └── default.conf.template (source template)
```
