#!/bin/bash
# ================================================================
# AWS Infrastructure Setup for Leads Portal (Budget-Friendly)
#
# Architecture: Single EC2 instance running everything via Docker
#   - PostgreSQL (container with EBS-backed volume)
#   - Admin Portal (Next.js)
#   - Customer Portal (Next.js)
#   - Nginx reverse proxy with SSL
#
# Estimated cost: ~$10-15/mo (t3.micro free tier or t3.small)
#
# Prerequisites: AWS CLI configured with admin access
# ================================================================

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="leads-portal"
EC2_INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.small}"
EC2_KEY_NAME="${EC2_KEY_NAME:-leads-portal-key}"

echo "============================================"
echo "  Leads Portal — AWS Setup (Budget)"
echo "  Region: $AWS_REGION"
echo "  Instance: $EC2_INSTANCE_TYPE"
echo "============================================"

# ---- Step 1: Create ECR Repositories ----
echo ""
echo "[1/3] Creating ECR repositories..."

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "  AWS Account: $AWS_ACCOUNT_ID"

for repo in "${PROJECT_NAME}-admin" "${PROJECT_NAME}-customer"; do
  if aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" 2>/dev/null; then
    echo "  ECR repo '$repo' already exists."
  else
    aws ecr create-repository \
      --repository-name "$repo" \
      --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true
    echo "  Created ECR repo: $repo"
  fi
done

# Set lifecycle policy to keep only last 5 images (save storage costs)
LIFECYCLE_POLICY='{"rules":[{"rulePriority":1,"description":"Keep last 5 images","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":5},"action":{"type":"expire"}}]}'

for repo in "${PROJECT_NAME}-admin" "${PROJECT_NAME}-customer"; do
  aws ecr put-lifecycle-policy \
    --repository-name "$repo" \
    --lifecycle-policy-text "$LIFECYCLE_POLICY" \
    --region "$AWS_REGION" > /dev/null
done
echo "  Set lifecycle policy: keep last 5 images per repo."

# ---- Step 2: Security Group ----
echo ""
echo "[2/3] Setting up security group..."

VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region "$AWS_REGION")

SG_NAME="${PROJECT_NAME}-sg"
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "Leads Portal - HTTP, HTTPS, SSH" \
    --vpc-id "$VPC_ID" \
    --region "$AWS_REGION" \
    --query "GroupId" --output text)

  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$AWS_REGION"
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$AWS_REGION"
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$AWS_REGION"
  echo "  Created security group: $SG_ID (SSH + HTTP + HTTPS)"
else
  echo "  Security group already exists: $SG_ID"
fi

# ---- Step 3: EC2 Instance ----
echo ""
echo "[3/3] Creating EC2 instance..."

EC2_TAG="${PROJECT_NAME}-server"
EXISTING_EC2=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$EC2_TAG" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

if [ "$EXISTING_EC2" = "None" ] || [ -z "$EXISTING_EC2" ]; then
  # Create key pair if needed
  if ! aws ec2 describe-key-pairs --key-names "$EC2_KEY_NAME" --region "$AWS_REGION" 2>/dev/null; then
    aws ec2 create-key-pair \
      --key-name "$EC2_KEY_NAME" \
      --query "KeyMaterial" \
      --output text --region "$AWS_REGION" > "${EC2_KEY_NAME}.pem"
    chmod 400 "${EC2_KEY_NAME}.pem"
    echo "  Created key pair: ${EC2_KEY_NAME}.pem — SAVE THIS FILE SECURELY!"
  fi

  # Create IAM role for ECR access
  aws iam create-role \
    --role-name "${PROJECT_NAME}-ec2-role" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' 2>/dev/null || true

  aws iam attach-role-policy \
    --role-name "${PROJECT_NAME}-ec2-role" \
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly 2>/dev/null || true

  aws iam create-instance-profile \
    --instance-profile-name "${PROJECT_NAME}-ec2-profile" 2>/dev/null || true

  aws iam add-role-to-instance-profile \
    --instance-profile-name "${PROJECT_NAME}-ec2-profile" \
    --role-name "${PROJECT_NAME}-ec2-role" 2>/dev/null || true

  sleep 10  # Wait for IAM propagation

  # Get latest Ubuntu 22.04 AMI
  AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" \
    --query "sort_by(Images, &CreationDate)[-1].ImageId" \
    --output text --region "$AWS_REGION")

  # Bootstrap script
  USER_DATA=$(base64 <<'USERDATA'
#!/bin/bash
apt-get update -y
apt-get install -y docker.io docker-compose-v2 awscli
systemctl enable docker && systemctl start docker
usermod -aG docker ubuntu
mkdir -p /home/ubuntu/leads-portal/nginx/conf.d
chown -R ubuntu:ubuntu /home/ubuntu/leads-portal
USERDATA
  )

  INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$EC2_INSTANCE_TYPE" \
    --key-name "$EC2_KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --user-data "$USER_DATA" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$EC2_TAG}]" \
    --iam-instance-profile Name="${PROJECT_NAME}-ec2-profile" \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
    --query "Instances[0].InstanceId" \
    --output text --region "$AWS_REGION")

  echo "  Waiting for instance to start..."
  aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

  EC2_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text --region "$AWS_REGION")

  echo "  EC2 instance ready! ID: $INSTANCE_ID"
else
  EC2_IP=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=$EC2_TAG" "Name=instance-state-name,Values=running" \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text --region "$AWS_REGION")
  echo "  EC2 instance already exists."
fi

# ---- Summary ----
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "  EC2 Public IP: $EC2_IP"
echo "  ECR Registry:  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
echo ""
echo "  NEXT STEPS:"
echo ""
echo "  1. Point your DNS records:"
echo "     admin.yourdomain.com  -> A record -> $EC2_IP"
echo "     portal.yourdomain.com -> A record -> $EC2_IP"
echo ""
echo "  2. Add these GitHub Secrets (Settings > Secrets > Actions):"
echo ""
echo "     AWS_ACCESS_KEY_ID       - Your AWS access key"
echo "     AWS_SECRET_ACCESS_KEY   - Your AWS secret key"
echo "     AWS_ACCOUNT_ID          - $AWS_ACCOUNT_ID"
echo "     AWS_REGION              - $AWS_REGION"
echo "     EC2_HOST                - $EC2_IP"
echo "     EC2_SSH_KEY             - Contents of ${EC2_KEY_NAME}.pem"
echo "     DB_PASSWORD             - Strong database password"
echo "     SESSION_SECRET          - Random 64-char string"
echo "     SMTP_HOST               - smtp.gmail.com"
echo "     SMTP_PORT               - 587"
echo "     SMTP_USER               - your-email@gmail.com"
echo "     SMTP_PASS               - your-app-password"
echo "     SMTP_FROM               - your-email@gmail.com"
echo "     API_TOKEN               - Random API token"
echo "     DOMAIN_ADMIN            - admin.yourdomain.com"
echo "     DOMAIN_CUSTOMER         - portal.yourdomain.com"
echo ""
echo "  3. Push to main branch to trigger deployment!"
echo "============================================"
