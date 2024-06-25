#!/usr/bin/env node
import {
  App,
  Aspects,
} from 'aws-cdk-lib';
import 'source-map-support/register';
import {
  addTags,
  Environment,
  stackNameValidation,
} from '../lib/utilities/variables';
import { PathTagger } from '../lib/utilities/pathtag';
import { AusPkgPipelineStack } from '../lib/auspkg-pipeline-stack';
import { RenovateChatbotStack } from '../lib/chatbot';

const app = new App();

export const env = {
  account: process.env.CDK_SYNTH_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_SYNTH_REGION || process.env.CDK_DEFAULT_REGION,
};

export const ausPkgPipelineStack = new AusPkgPipelineStack(app, 'AusPkgPipelineStack', {
  terminationProtection: false,
  analyticsReporting: true,
  stackName: 'AusPkgPipelineStack',
  description: 'Pipeline stack for the auto upgrade core CDK construct',
  env,
});
addTags(ausPkgPipelineStack, Environment.dev);
stackNameValidation('AusPkgPipelineStack');

export const renovateChatbotStack = new RenovateChatbotStack(app, 'RenovateChatbotStack', {
  terminationProtection: false,
  analyticsReporting: true,
  stackName: 'RenovateChatbotStack',
  description: 'Stack for the renovate poc chatbot slackchannel',
  env,
});
addTags(renovateChatbotStack, Environment.dev);
stackNameValidation('RenovateChatbotStack');

// Show the actual AWS account id and region
console.log(`\x1B[1;34mAWS REGION: ${env.region}`);
console.log(`\x1B[1;34mAWS ACCOUNT-ID: ${env.account}`);

const { exec } = require('child_process');

exec(
  'aws iam list-account-aliases --query AccountAliases --output text || exit',
  (error: { message: any; }, stdout: string, stderr: any) => {
    if (error) {
      console.error(`Error: ${stderr}`);
    }
    const myAccountAlias = stdout.trimEnd();
    console.log(`\x1B[1;34mAWS ACCOUNT-ALIAS: ${myAccountAlias.toUpperCase()}`);

    exec(
      'aws codestar-connections list-connections --query "Connections[].ConnectionArn" --output text',
      (error: { message: any; }, stdout: string, stderr: any) => {
        if (error) {
          console.error(`Error: ${stderr}`);
        }
        const myCodeStarArn = stdout.trimEnd();
        console.log(`\x1B[1;34mAWS CODESTAR-ARN: ${myCodeStarArn}`);
      },
    );
  },
);
