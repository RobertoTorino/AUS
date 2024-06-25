import {
  Aspects,
  DefaultStackSynthesizer,
  Stage,
  StageProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PathTagger } from './utilities/pathtag';
import {
  addTags,
  Environment,
} from './utilities/variables';
import { AusPkgVersionCheckStack } from './auspkg-check';
import { env } from '../bin';

export class AusPkgStage extends Stage {
  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props);

    // Package Check Stack
    const ausPkgVersionCheckStack = new AusPkgVersionCheckStack(
      this,
      'AusPkgCdkVersionCheckStack',
      {
        synthesizer: new DefaultStackSynthesizer({
          generateBootstrapVersionRule: false,
          // Name of the S3 bucket for file assets
          bucketPrefix: 'auc-aws',
        }),
        stackName: 'AusPkgCdkVersionCheckStack',
        description: 'Stack for AWS-CDK version check app.',
        env,
      },
    );
    Aspects.of(ausPkgVersionCheckStack).add(new PathTagger());
    addTags(ausPkgVersionCheckStack, Environment.dev);
  }
}
