import {
  aws_iam,
  aws_sns, aws_sns_subscriptions, aws_ssm, RemovalPolicy, Stack, StackProps, Tags,
} from 'aws-cdk-lib';
import { LoggingLevel, SlackChannelConfiguration } from 'aws-cdk-lib/aws-chatbot';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { SubscriptionProtocol } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

// variables
// const chatBotSubscriptionEndpoint = 'https://global.sns-api.chatbot.amazonaws.com';
// const slackWorkspaceId = 'TE92U6HDY';
// const slackChannelId = 'C06BSBEJM8A';

export class RenovateChatbotStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const chatBotSubscriptionEndpoint = aws_ssm.StringParameter.valueForStringParameter(this, '/chatbot/subscription/endpoint');
    const renovateChatBotSnsTopic = new aws_sns.Topic(this, 'RenovateChatbotTopic', {});
    renovateChatBotSnsTopic.applyRemovalPolicy(RemovalPolicy.DESTROY);
    renovateChatBotSnsTopic.addSubscription(new aws_sns_subscriptions.UrlSubscription(chatBotSubscriptionEndpoint, {
      protocol: SubscriptionProtocol.HTTPS,
    }));

    const slackChannelId = aws_ssm.StringParameter.valueForStringParameter(this, '/slackchannel/id');
    const slackWorkspaceId = aws_ssm.StringParameter.valueForStringParameter(this, '/slackworkspace/id');

    const chatBotReadOnlyCommandPermissions = new aws_iam.PolicyStatement({
      effect: aws_iam.Effect.DENY,
      actions: [
        'kms:*',
        'sts:*',
        'cognito-idp:GetSigningCertificate',
        'ec2:GetPasswordData',
        'ecr:GetAuthorizationToken',
        'gamelift:RequestUploadCredentials',
        'gamelift:GetInstanceAccess',
        'lightsail:DownloadDefaultKeyPair',
        'lightsail:GetInstanceAccessDetails',
        'lightsail:GetKeyPair',
        'lightsail:GetKeyPairs',
        'redshift:GetClusterCredentials',
        's3:GetBucketPolicy',
        'storagegateway:DescribeChapCredentials',
      ],
      resources: ['*'],
    });

    // First in the aws console authorize chatbot to send notifications to slack.
    const renovateSlackChannelConfig = new SlackChannelConfiguration(this, 'RenovateSlackChannelConfig', {
      slackChannelConfigurationName: 'RenovateSlackConfiguration',
      slackWorkspaceId,
      slackChannelId,
      logRetention: RetentionDays.ONE_DAY,
      loggingLevel: LoggingLevel.ERROR,
      notificationTopics: [renovateChatBotSnsTopic],
      guardrailPolicies: [
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'),
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodePipeline_ReadOnlyAccess'),
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'),
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName('IAMReadOnlyAccess'),
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess'),

      ],
    });
    renovateSlackChannelConfig.addToRolePolicy(chatBotReadOnlyCommandPermissions);
    renovateSlackChannelConfig.applyRemovalPolicy(RemovalPolicy.DESTROY);
    Tags.of(renovateSlackChannelConfig).add('Loggroup-Region', 'us-east-1');
    Tags.of(renovateSlackChannelConfig).add('Application', 'aws-chatbot');
    Tags.of(renovateSlackChannelConfig).add('Stage', 'prod');
  }
}
