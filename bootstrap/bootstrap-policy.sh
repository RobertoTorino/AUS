#!/bin/sh
# Set the terminal you use here: bash or zsh or another..
set -e
export TERM=xterm-256color
# Use AWS CDK to deploy only the resources that you use
# CDK bootstrap creates a "CloudFormationExecutionRole" that CloudFormation assumes to deploy your stack.
# CloudFormation uses this role to deploy locally with the "cdk deploy" command or through pipelines for CI/CD.
# To allow resources to be created with CDK, the CloudFormationExecutionRole has the
# "arn:aws:iam:aws:policy/AdministratorAccess" policy that grants full access to perform all actions.
# This policy goes against the least privilege principle.
# To restrict this policy, you must create a new policy and bootstrap with a new custom policy.

BRIGHT_BLUE='\033[1;94m'
echo "${BRIGHT_BLUE}"
alias assume="source assume"
PROFILE="SANDBOX-ADMIN"

if ! assume "$PROFILE"; then { echo "❌ ! Operation error SSO: GetRoleCredentials, StatusCode: 403.
❌ ! Api error ForbiddenException: No access.
❌ ! Check your profiles in .config! You are not authorized or not logged in to this account!  " ; exit 1; }
fi

# Create a custom policy in IAM:
aws iam create-policy \
  --policy-name cdkCFExecutionPolicy \
  --policy-document file://cdk-cf-execution-policy.json \
  --description "Special bootstrap policy for the AWS CDK toolkit." \
  --tags '{"Key": "Application", "Value": "cdk-toolkit"}' '{"Key": "Stage", "Value": "prod"}'
