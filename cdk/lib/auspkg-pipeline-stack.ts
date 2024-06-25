import {
  aws_codebuild,
  aws_codepipeline,
  aws_iam,
  aws_logs,
  aws_s3,
  aws_ssm,
  Duration,
  pipelines,
  RemovalPolicy,
  Stack,
  StackProps,
  Tags,
} from 'aws-cdk-lib';
import {
  // BuildEnvironmentVariableType,
  BuildSpec,
  ReportGroupType,
} from 'aws-cdk-lib/aws-codebuild';
import {
  ILogGroup,
  RetentionDays,
} from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  BlockPublicAccess,
  BucketEncryption,
  IBucket,
} from 'aws-cdk-lib/aws-s3';
import { Effect } from 'aws-cdk-lib/aws-iam';
import { Rule } from 'aws-cdk-lib/aws-events';
import { CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import {
  construct,
} from './utilities/variables';
import { AusPkgStage } from './auspkg-stage';

export class AusPkgPipelineStack extends Stack {
  private readonly logGroup: ILogGroup;
  private readonly artifactBucket: IBucket;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // Check loggroups for retention
    // make sure codebuild cloudwatch logs get retention periods
    // this.node.findAll().forEach((node, index) => {
    //     if (node instanceof aws_logs.LogGroup) {
    //         const logGroup = new LogGroup(this, `log-group${index}`, {
    //             logGroupName: `/aws/codepipeline/${node.logGroupPhysicalName().slice(0, 5)}`,
    //             removalPolicy: RemovalPolicy.DESTROY,
    //             retention: RetentionDays.FIVE_DAYS
    //         });
    //     }
    // });

    // X-Ray for Lambda
    // this.node.findAll().forEach((node, index) => {
    //     if (node instanceof aws_lambda.CfnFunction) {
    //         const tracingConfigProperty: aws_lambda.CfnFunction.TracingConfigProperty = {
    //             mode: 'active',
    //         };
    //     }
    // })

    const resourcesBucket = new aws_s3.Bucket(this, 'ResourcesBucket', {
      bucketName: `${construct}-resources-bucket`,
      lifecycleRules: [{
        expiration: Duration.days(1),
        enabled: true,
      }],
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      encryption: BucketEncryption.S3_MANAGED,
    });

    this.artifactBucket = new aws_s3.Bucket(this, 'ArtifactBucket', {
      bucketName: `${construct}-artifact-bucket`,
      lifecycleRules: [{
        expiration: Duration.days(1),
        enabled: true,
      }],
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      serverAccessLogsBucket: resourcesBucket,
      encryption: BucketEncryption.S3_MANAGED,
    });

    // ToDo use EFS for caching, needs a vpc
    const cacheBucket = new aws_s3.Bucket(this, 'CodeBuildCache', {
      bucketName: `${construct}-cache-bucket`,
      lifecycleRules: [{
        expiration: Duration.days(1),
        enabled: true,
      }],
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      serverAccessLogsBucket: resourcesBucket,
      encryption: BucketEncryption.S3_MANAGED,
    });

    this.logGroup = new aws_logs.LogGroup(this, 'AusPkgCdkLogGroup', {
      logGroupName: `/aws/codepipeline/${construct}`,
      retention: RetentionDays.FIVE_DAYS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // const bucketPipeline = new aws_codepipeline.Pipeline(this, 'bucket-pipeline', {
    //     crossRegionReplicationBuckets: {
    //         ['eu-west-1']: artifactBucket,
    //         // ['us-east-1']: artifactBucket,
    //     }
    // });

    const codePipelineRole = new aws_iam.Role(this, 'AusPkgCdkCodePipelineRole', {
      roleName: `${construct}-codepipeline-role`,
      assumedBy: new aws_iam.ServicePrincipal('codepipeline.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess',
        },
      ],
    });

    codePipelineRole.addToPolicy(new aws_iam.PolicyStatement({
      sid: 'AllowAccessToS3Buckets',
      effect: Effect.ALLOW,
      actions: [
        's3:GetObject*',
        's3:Put*',
        's3:ListBucket',
        's3:ListAllMyBuckets',
        's3:ListObjectsV2',
        's3:HeadObject',
      ],
      resources: [
        `${resourcesBucket.bucketArn}/*`,
        `${resourcesBucket.bucketArn}`,
        `${cacheBucket.bucketArn}/*`,
        `${cacheBucket.bucketArn}`,
        `${this.artifactBucket.bucketArn}/*`,
        `${this.artifactBucket.bucketArn}`,
      ],
    }));

    const codestarConnectionArn = StringParameter.valueForTypedStringParameterV2(this, '/codestar/connection/arn', aws_ssm.ParameterValueType.STRING, 1);

    const sourceCode = CodePipelineSource.connection('persgroep/snyk-ecr-permissions', 'main', {
      triggerOnPush: true,
      connectionArn: codestarConnectionArn,
      actionName: 'AusPkgCdk',
    });

    const artifactPipeline = new aws_codepipeline.Pipeline(this, 'ArtifactPipeline', {
      pipelineName: `${construct}-codepipeline`,
      artifactBucket: this.artifactBucket,
      role: codePipelineRole,
      restartExecutionOnUpdate: false,
      enableKeyRotation: false,
      crossAccountKeys: false,
      reuseCrossRegionSupportStacks: false,
    });

    const AusPkgCdkPipeline = new CodePipeline(this, 'AusPkgCdkPipeline', {
      codePipeline: artifactPipeline,
      publishAssetsInParallel: true,
      selfMutation: true,
      useChangeSets: false,
      codeBuildDefaults: {
        // vpc: vpc,
        logging: ({
          cloudWatch: ({
            logGroup: this.logGroup,
            enabled: true,
            prefix: 'au-',
          }),
        }),
        cache: aws_codebuild.Cache.bucket(cacheBucket),
        timeout: Duration.minutes(60),
        buildEnvironment: {
          computeType: aws_codebuild.ComputeType.LARGE,
          buildImage: aws_codebuild.LinuxArmBuildImage.fromCodeBuildImageId('aws/codebuild/amazonlinux2-aarch64-standard:3.0'),
          privileged: true,
          // environmentVariables: {
          //   SNYK_TOKEN: {
          //     type: BuildEnvironmentVariableType.SECRETS_MANAGER,
          //     value: 'prod/snyk/cest:api-key',
          //   },
          // },
        },
      },
      selfMutationCodeBuildDefaults: {
        // vpc: vpc,
        logging: ({
          cloudWatch: ({
            logGroup: this.logGroup,
            enabled: true,
          }),
        }),
        buildEnvironment: {
          computeType: aws_codebuild.ComputeType.SMALL,
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_6_0,
          privileged: true,
        },
        // partialBuildSpec: BuildSpec.fromObject({
        //     buildSpec: aws_codebuild.BuildSpec.fromObject({
        //         version: '0.2',
        //     }),
        //     environment: {
        //         privileged: true,
        //     },
        //     vpc: '',
        //     securityGroups: [securityGroup],
        //     fileSystemLocations: [aws_codebuild.FileSystemLocation.efs({
        //         identifier: 'auc',
        //         location: `fs-c8d04839.efs.eu-west-1.amazonaws.com:/mnt`,
        //         mountOptions: 'nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2',
        //         mountPoint: '/cache',
        //     })],
        // }),
        cache: aws_codebuild.Cache.bucket(cacheBucket),
        timeout: Duration.minutes(60),
      },

      synthCodeBuildDefaults: {
        // vpc: vpc,
        logging: ({
          cloudWatch: ({
            logGroup: this.logGroup,
            enabled: true,
            prefix: 'au',
          }),
        }),
        partialBuildSpec: BuildSpec.fromObject({
          phases: {
            install: {
              commands: [
                'n stable',
                'npm i -D esbuild',
              ],
            },
          },
        }),
        buildEnvironment: {
          computeType: aws_codebuild.ComputeType.SMALL,
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_6_0,
          privileged: false,
        },
        cache: aws_codebuild.Cache.bucket(cacheBucket),
        timeout: Duration.minutes(60),
      },
      assetPublishingCodeBuildDefaults: {
        logging: ({
          cloudWatch: ({
            logGroup: this.logGroup,
            enabled: true,
            prefix: 'au',
          }),
        }),
        buildEnvironment: {
          computeType: aws_codebuild.ComputeType.LARGE,
          buildImage: aws_codebuild.LinuxArmBuildImage.fromCodeBuildImageId('aws/codebuild/amazonlinux2-aarch64-standard:3.0'),
          privileged: true,
        },
        cache: aws_codebuild.Cache.bucket(cacheBucket),
        timeout: Duration.minutes(60),
      },
      synth: new pipelines.ShellStep('Synthesize', {
        input: sourceCode,
        primaryOutputDirectory: 'deployment/cdk/cdk.out',
        commands: [
          'cd deployment/cdk',
          'npm cache clean -f',
          'rm package-lock.json',
          'rm -rvf node_modules',
          'n stable',
          'npm i',
          'npm -d ping',
          'npm i -D esbuild',
          'npm run build',
          'npx cdk synth -q',
        ],
      }),
    });

    const codeBuildStatusRule = new Rule(this, 'DetectCodeBuildStatusChangeRule', {
      description: 'notification on code build status change',
      enabled: true,
      ruleName: `${construct}DetectCodeBuildStatusChange`,
      eventPattern: {
        detailType: ['CodeBuild Build State Change'],
        source: ['aws.securityhub'],
        detail: {
          buildStatus: ['FAILED', 'STOPPED'],
        },
      },
    });
    codeBuildStatusRule.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // codeBuildStatusRule.addTarget(new SnsTopic(renovateChatbotSnsTopic));
    Tags.of(codeBuildStatusRule).add('stage', 'prod');
    Tags.of(codeBuildStatusRule).add('cnca', 'event-bridge-rule');

    const coverageReportGroup = new aws_codebuild.ReportGroup(this, 'PipelineCoverageReportGroup', {
      type: ReportGroupType.CODE_COVERAGE,
      reportGroupName: 'pipeline-coverage-report-group',
      removalPolicy: RemovalPolicy.DESTROY,
      exportBucket: resourcesBucket,
    });

    const jestReportGroup = new aws_codebuild.ReportGroup(this, 'PipelineJestReportGroup', {
      type: ReportGroupType.TEST,
      reportGroupName: 'pipeline-jest-report-group',
      removalPolicy: RemovalPolicy.DESTROY,
      exportBucket: resourcesBucket,
    });

    const reportStep = new pipelines.CodeBuildStep('PipelineReportsStep', {
      input: sourceCode,
      installCommands: ['npm ci'],
      commands: ['npm run build', 'npm test', 'npx cdk synth'],
      partialBuildSpec: BuildSpec.fromObject({
        version: '0.2',
        reports: {
          [jestReportGroup.reportGroupArn]: {
            files: ['CodeCoverageReport.xml'],
            'file-format': 'JUNITXML',
            'base-directory': 'reports',
          },
          [coverageReportGroup.reportGroupArn]: {
            files: ['coverage/jest/clover.xml'],
            'file-format': 'CLOVERXML',
            'base-directory': 'reports',
          },
        },
      }),
      primaryOutputDirectory: 'cdk.out',
    });

    // const snykScanStep = new pipelines.ShellStep('SnykScanStep', {
    //   commands: [
    //     'cd deployment/cdk',
    //     'npm cache clean -f',
    //     'rm package-lock.json',
    //     'rm -rvf node_modules',
    //     'n stable',
    //     'npm i',
    //     'npm i -D esbuild',
    //     'npm run build',
    //     'npx cdk synth -q',
    //     'npm i -g snyk@latest',
    //     'snyk test --all-projects --severity-threshold=critical --org=cest || true',
    //     'cp -Rf .snyk cdk.out/.snyk',
    //     'snyk iac test --severity-threshold=high cdk.out || true',
    //     // 'snyk iac test --severity-threshold=high cdk.out --json | snyk-to-html > snyk-iac.html || true',
    //     'snyk code test',
    //   ],
    // });

    const ausPkgStage = new AusPkgStage(this, 'AutoUpgradeCore', {
      stageName: 'AutoUpgradeCore',
    });
    AusPkgCdkPipeline.addStage(ausPkgStage, {
      pre: [
        new pipelines.ConfirmPermissionsBroadening('Check', {
          stage: ausPkgStage,
        }),
        // snykScanStep,
      ],
      post: [
        reportStep,
      ],
    });

    AusPkgCdkPipeline.buildPipeline();

    jestReportGroup.grantWrite(reportStep.grantPrincipal);
    coverageReportGroup.grantWrite(reportStep.grantPrincipal);

    aws_iam.Grant.addToPrincipal({
      grantee: reportStep.grantPrincipal,
      actions: ['codebuild:BatchPutCodeCoverages'],
      resourceArns: [coverageReportGroup.reportGroupArn],
    });

    /*    const pipelineRule = AusPkgCdkPipeline.pipeline.notifyOn('PipelineEvents', renovateSlackChannelConfig, {
          notificationRuleName: `${construct}DetectFailedPipelineExecutions`,
          enabled: true,
          events: [
            PipelineNotificationEvents.ACTION_EXECUTION_FAILED,
            PipelineNotificationEvents.ACTION_EXECUTION_CANCELED,
            PipelineNotificationEvents.MANUAL_APPROVAL_FAILED,
            PipelineNotificationEvents.MANUAL_APPROVAL_NEEDED,
            PipelineNotificationEvents.PIPELINE_EXECUTION_FAILED,
            PipelineNotificationEvents.PIPELINE_EXECUTION_CANCELED,
            PipelineNotificationEvents.STAGE_EXECUTION_CANCELED,
            PipelineNotificationEvents.STAGE_EXECUTION_FAILED,
          ],
          detailType: aws_codestarnotifications.DetailType.FULL,
        });
        pipelineRule.applyRemovalPolicy(RemovalPolicy.DESTROY);
      } */
  }
}
