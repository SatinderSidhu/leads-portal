#!/bin/bash
# ================================================================
# AWS S3 + IAM Setup for Leads Portal Documents
#
# Creates:
#   1. S3 bucket (versioned, encrypted, public access blocked, CORS for browser uploads)
#   2. IAM policy with read/write/delete on the bucket
#   3. IAM role for EC2 with the policy attached
#   4. Instance profile, attaches to the existing EC2 instance
#
# Idempotent — safe to re-run.
#
# Prerequisites: AWS CLI configured with admin access, EC2 instance already running.
# ================================================================

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
BUCKET_NAME="${BUCKET_NAME:-kitlabs-leads-portal-documents}"
PROJECT_NAME="leads-portal"
ROLE_NAME="${ROLE_NAME:-${PROJECT_NAME}-ec2-role}"
INSTANCE_PROFILE_NAME="$ROLE_NAME"
POLICY_NAME="${POLICY_NAME:-${PROJECT_NAME}-s3-documents-policy}"
EC2_NAME_TAG="${EC2_NAME_TAG:-${PROJECT_NAME}-server}"

# Allow CORS origin override (admin + customer portal domains)
ADMIN_ORIGIN="${ADMIN_ORIGIN:-https://leadsportaladmin.kitlabs.us}"
CUSTOMER_ORIGIN="${CUSTOMER_ORIGIN:-https://leadsportal.kitlabs.us}"

echo "============================================"
echo "  Leads Portal — S3 + IAM Setup"
echo "  Region:        $AWS_REGION"
echo "  Bucket:        $BUCKET_NAME"
echo "  Role:          $ROLE_NAME"
echo "  Policy:        $POLICY_NAME"
echo "  EC2 Name tag:  $EC2_NAME_TAG"
echo "============================================"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "AWS Account: $AWS_ACCOUNT_ID"

# ---- Step 1: Create S3 bucket ----
echo ""
echo "[1/5] Creating S3 bucket..."

if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "  Bucket '$BUCKET_NAME' already exists."
else
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION"
  else
    aws s3api create-bucket \
      --bucket "$BUCKET_NAME" \
      --region "$AWS_REGION" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION"
  fi
  echo "  Created bucket: $BUCKET_NAME"
fi

# Block all public access
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
echo "  Public access blocked."

# Server-side encryption (SSE-S3, AES256)
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]
  }'
echo "  Server-side encryption enabled (AES256)."

# Versioning
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled
echo "  Versioning enabled."

# CORS — allow presigned PUT from browser on admin + customer portals
CORS_CONFIG=$(cat <<JSON
{
  "CORSRules": [
    {
      "AllowedOrigins": ["$ADMIN_ORIGIN", "$CUSTOMER_ORIGIN", "http://localhost:3000", "http://localhost:3001"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
JSON
)
aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration "$CORS_CONFIG"
echo "  CORS configured (admin + customer + localhost)."

# ---- Step 2: IAM Policy ----
echo ""
echo "[2/5] Creating IAM policy..."

POLICY_DOC=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::$BUCKET_NAME"
    },
    {
      "Sid": "ObjectCRUD",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion",
        "s3:DeleteObjectVersion"
      ],
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
JSON
)

POLICY_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:policy/$POLICY_NAME"

if aws iam get-policy --policy-arn "$POLICY_ARN" 2>/dev/null > /dev/null; then
  echo "  Policy '$POLICY_NAME' already exists. Creating new version..."
  # Clean up old non-default versions first (max 5 versions allowed)
  for ver in $(aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query "Versions[?!IsDefaultVersion].VersionId" --output text); do
    aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$ver" || true
  done
  aws iam create-policy-version \
    --policy-arn "$POLICY_ARN" \
    --policy-document "$POLICY_DOC" \
    --set-as-default > /dev/null
  echo "  Policy updated."
else
  aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOC" > /dev/null
  echo "  Policy created: $POLICY_ARN"
fi

# ---- Step 3: IAM Role ----
echo ""
echo "[3/5] Creating IAM role for EC2..."

TRUST_POLICY=$(cat <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON
)

if aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null > /dev/null; then
  echo "  Role '$ROLE_NAME' already exists."
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" > /dev/null
  echo "  Created role: $ROLE_NAME"
fi

aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN" || true
echo "  Policy attached to role."

# ---- Step 4: Instance Profile ----
echo ""
echo "[4/5] Creating instance profile..."

if aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" 2>/dev/null > /dev/null; then
  echo "  Instance profile '$INSTANCE_PROFILE_NAME' already exists."
else
  aws iam create-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" > /dev/null
  echo "  Created instance profile: $INSTANCE_PROFILE_NAME"
fi

# Add role to instance profile (idempotent — if already added, AWS returns LimitExceeded)
aws iam add-role-to-instance-profile \
  --instance-profile-name "$INSTANCE_PROFILE_NAME" \
  --role-name "$ROLE_NAME" 2>/dev/null || echo "  Role already attached to instance profile."

# ---- Step 5: Attach to EC2 ----
echo ""
echo "[5/5] Attaching instance profile to EC2..."

INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$EC2_NAME_TAG" "Name=instance-state-name,Values=running,stopped" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text \
  --region "$AWS_REGION" 2>/dev/null || echo "None")

if [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
  echo "  WARNING: No EC2 instance found with Name tag '$EC2_NAME_TAG'."
  echo "  Attach the instance profile manually via AWS console:"
  echo "    EC2 → Instance → Actions → Security → Modify IAM role → $INSTANCE_PROFILE_NAME"
else
  echo "  Found instance: $INSTANCE_ID"

  # Check if already associated
  ASSOCIATION_ID=$(aws ec2 describe-iam-instance-profile-associations \
    --filters "Name=instance-id,Values=$INSTANCE_ID" \
    --query "IamInstanceProfileAssociations[?State=='associated'].AssociationId | [0]" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "None")

  if [ "$ASSOCIATION_ID" != "None" ] && [ -n "$ASSOCIATION_ID" ]; then
    CURRENT_PROFILE=$(aws ec2 describe-iam-instance-profile-associations \
      --association-ids "$ASSOCIATION_ID" \
      --query "IamInstanceProfileAssociations[0].IamInstanceProfile.Arn" \
      --output text \
      --region "$AWS_REGION")

    if [[ "$CURRENT_PROFILE" == *"$INSTANCE_PROFILE_NAME" ]]; then
      echo "  Instance profile already attached."
    else
      echo "  Replacing existing instance profile ($CURRENT_PROFILE)..."
      aws ec2 replace-iam-instance-profile-association \
        --association-id "$ASSOCIATION_ID" \
        --iam-instance-profile Name="$INSTANCE_PROFILE_NAME" \
        --region "$AWS_REGION" > /dev/null
      echo "  Replaced. New profile: $INSTANCE_PROFILE_NAME"
    fi
  else
    aws ec2 associate-iam-instance-profile \
      --instance-id "$INSTANCE_ID" \
      --iam-instance-profile Name="$INSTANCE_PROFILE_NAME" \
      --region "$AWS_REGION" > /dev/null
    echo "  Attached instance profile to $INSTANCE_ID"
  fi
fi

echo ""
echo "============================================"
echo "  Done!"
echo "============================================"
echo ""
echo "Add to GitHub Secrets / EC2 .env:"
echo "  AWS_S3_BUCKET=$BUCKET_NAME"
echo "  AWS_S3_REGION=$AWS_REGION"
echo ""
echo "No AWS credentials needed in env — the EC2 instance role"
echo "provides them automatically via IMDS."
echo ""
echo "For LOCAL development, add to apps/admin/.env.local + apps/customer/.env.local:"
echo "  AWS_S3_BUCKET=$BUCKET_NAME"
echo "  AWS_S3_REGION=$AWS_REGION"
echo "  AWS_ACCESS_KEY_ID=<your-iam-user-key>"
echo "  AWS_SECRET_ACCESS_KEY=<your-iam-user-secret>"
