#!/bin/sh
# Set the terminal you use here: bash or zsh or another..
# CDK bootstrap creates a "CloudFormationExecutionRole" that CloudFormation assumes to deploy your stack.
set -e
export TERM=xterm-256color

BRIGHT_BLUE='\033[1;94m'
echo ${BRIGHT_BLUE}
alias assume="source assume"
PROFILE="SANDBOX-ADMIN"
ID=$(aws sts get-caller-identity --query Account --output text)

if ! assume "$PROFILE"; then { echo "❌ ! Operation error SSO: GetRoleCredentials, StatusCode: 403.
❌ ! Api error ForbiddenException: No access.
❌ ! Check your profiles in .config! You are not authorized or not logged in to this account!  " ; exit 1; }
fi

# Use the new IAM policy to bootstrap the AWS CDK and set the tags:
cdk bootstrap aws://$ID/eu-west-1 \
  --cloudformation-execution-policies "arn:aws:iam::$ID:policy/cdkCFExecutionPolicy" \
  --tags Application=cdk-toolkit \
  --tags Stage=prod

# Check bootstrap version.
printf "AWS CDK Bootstrap version = " && aws ssm get-parameters --name '/cdk-bootstrap/hnb659fds/version' --query 'Parameters[0].Value'
