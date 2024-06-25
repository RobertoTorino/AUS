import {
  aws_cloudformation, Stack, Tags,
} from 'aws-cdk-lib';
import 'source-map-support/register';

export enum Environment {
  prod = 'prod',
  dev = 'dev'
}

export const construct = 'aus-pkg-cdk';
export const renovateChatBotSnsTopic = 'test';
export const renovateSlackChannelConfig = 'test';

export const addTags = (stack: Stack, environment: Environment) => {
  Tags.of(stack).add('Application', construct, {
    applyToLaunchedInstances: true,
    priority: 100,
    includeResourceTypes: [],
  });
  Tags.of(stack).add('Stage', environment, {
    applyToLaunchedInstances: true,
    priority: 100,
    includeResourceTypes: [],
  });
  Tags.of(stack).add('Stackname', stack.stackName, {
    applyToLaunchedInstances: true,
    priority: 100,
    includeResourceTypes: [],
  });
};

export const stackNameValidation = (thisStackName: typeof aws_cloudformation.CfnStack.name) => {
  if (thisStackName.length > 20) {
    throw new Error(`Validate: stackname must be <= 16 characters. Stack name: '${thisStackName}'`);
  }
  const nameSyntaxValidation = /^.*$/;
  if (!nameSyntaxValidation.test((thisStackName))) {
    throw new Error(`Validate: stackname must match the regular expression: ${nameSyntaxValidation.toString()}, got '${thisStackName}'`);
  }
};

