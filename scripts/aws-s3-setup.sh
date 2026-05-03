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
# Idempotent and re-run-safe:
#   - If the EC2 already has an instance profile attached, the script reuses it
#     (only attaches the new S3 policy to the existing role) instead of creating
#     a duplicate profile and swapping the EC2's binding.
#   - Standalone runs (no EC2 yet, or EC2 without a profile) fall back to the
#     default names: leads-portal-ec2-role and leads-portal-ec2-profile.
#
# Prerequisites: AWS CLI configured with admin access. EC2 doesn't have to exist yet.
# ================================================================

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
BUCKET_NAME="${BUCKET_NAME:-kitlabs-leads-portal-documents}"
PROJECT_NAME="leads-portal"
DEFAULT_ROLE_NAME="${PROJECT_NAME}-ec2-role"
DEFAULT_PROFILE_NAME="${PROJECT_NAME}-ec2-profile"
POLICY_NAME="${POLICY_NAME:-${PROJECT_NAME}-s3-documents-policy}"
EC2_NAME_TAG="${EC2_NAME_TAG:-${PROJECT_NAME}-server}"

# Allow CORS origin override (admin + customer portal domains)
ADMIN_ORIGIN="${ADMIN_ORIGIN:-https://leadsportaladmin.kitlabs.us}"
CUSTOMER_ORIGIN="${CUSTOMER_ORIGIN:-https://leadsportal.kitlabs.us}"

echo "============================================"
echo "  Leads Portal — S3 + IAM Setup"
echo "  Region:        $AWS_REGION"
echo "  Bucket:        $BUCKET_NAME"
echo "  Policy:        $POLICY_NAME"
echo "  EC2 Name tag:  $EC2_NAME_TAG"
echo "============================================"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "AWS Account: $AWS_ACCOUNT_ID"

# ---- Step 0: Discover existing EC2 + instance profile ----
# If the EC2 already has an instance profile attached, adopt those names so
# we don't create a duplicate profile/role and accidentally swap the EC2's binding.
echo ""
echo "[0/5] Discovering existing EC2 setup..."

INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$EC2_NAME_TAG" "Name=instance-state-name,Values=running,stopped" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text \
  --region "$AWS_REGION" 2>/dev/null || echo "None")

EXISTING_PROFILE_ARN="None"
if [ "$INSTANCE_ID" != "None" ] && [ -n "$INSTANCE_ID" ]; then
  EXISTING_PROFILE_ARN=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "Reservations[0].Instances[0].IamInstanceProfile.Arn" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "None")
fi

if [ "$EXISTING_PROFILE_ARN" != "None" ] && [ -n "$EXISTING_PROFILE_ARN" ]; then
  INSTANCE_PROFILE_NAME=$(basename "$EXISTING_PROFILE_ARN")
  ROLE_NAME=$(aws iam get-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE_NAME" \
    --query "InstanceProfile.Roles[0].RoleName" \
    --output text 2>/dev/null || echo "None")
  if [ "$ROLE_NAME" = "None" ] || [ -z "$ROLE_NAME" ]; then
    ROLE_NAME="$DEFAULT_ROLE_NAME"
    echo "  EC2 has profile '$INSTANCE_PROFILE_NAME' but no role inside — will use default role name."
  else
    echo "  EC2 instance: $INSTANCE_ID"
    echo "  Reusing existing instance profile: $INSTANCE_PROFILE_NAME"
    echo "  Reusing existing role: $ROLE_NAME"
    REUSE_EXISTING=true
  fi
else
  ROLE_NAME="${ROLE_NAME:-$DEFAULT_ROLE_NAME}"
  INSTANCE_PROFILE_NAME="${INSTANCE_PROFILE_NAME:-$DEFAULT_PROFILE_NAME}"
  if [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
    echo "  No EC2 instance found with Name tag '$EC2_NAME_TAG'. Will create role + profile and skip EC2 attach."
  else
    echo "  EC2 instance $INSTANCE_ID has no instance profile. Will create '$INSTANCE_PROFILE_NAME' and attach."
  fi
fi
REUSE_EXISTING="${REUSE_EXISTING:-false}"

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
echo "[3/5] Ensuring IAM role exists..."

if [ "$REUSE_EXISTING" = "true" ]; then
  echo "  Reusing existing role '$ROLE_NAME' (already attached to EC2 via '$INSTANCE_PROFILE_NAME')."
else
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
fi

# Always (re)attach the policy — idempotent and safe whether the role is reused or new
aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN" 2>/dev/null || true
echo "  Policy attached to role '$ROLE_NAME'."

# ---- Step 4: Instance Profile ----
echo ""
echo "[4/5] Ensuring instance profile exists..."

if [ "$REUSE_EXISTING" = "true" ]; then
  echo "  Reusing existing instance profile '$INSTANCE_PROFILE_NAME'."
else
  if aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" 2>/dev/null > /dev/null; then
    echo "  Instance profile '$INSTANCE_PROFILE_NAME' already exists."
  else
    aws iam create-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" > /dev/null
    echo "  Created instance profile: $INSTANCE_PROFILE_NAME"
  fi

  aws iam add-role-to-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE_NAME" \
    --role-name "$ROLE_NAME" 2>/dev/null || echo "  Role already attached to instance profile."
fi

# ---- Step 5: Attach instance profile to EC2 ----
echo ""
echo "[5/5] Ensuring EC2 has the instance profile attached..."

if [ "$REUSE_EXISTING" = "true" ]; then
  echo "  EC2 already has '$INSTANCE_PROFILE_NAME' attached — no change needed."
elif [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
  echo "  WARNING: No EC2 instance found with Name tag '$EC2_NAME_TAG'."
  echo "  Attach manually: EC2 → Instance → Actions → Security → Modify IAM role → $INSTANCE_PROFILE_NAME"
else
  # Instance found but had no profile (covered by Step 0). Attach it.
  aws ec2 associate-iam-instance-profile \
    --instance-id "$INSTANCE_ID" \
    --iam-instance-profile Name="$INSTANCE_PROFILE_NAME" \
    --region "$AWS_REGION" > /dev/null
  echo "  Attached '$INSTANCE_PROFILE_NAME' to $INSTANCE_ID"
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
