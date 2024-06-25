import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { exec } from 'child_process';
import { AusPkgVersionCheckStack } from '../lib/auspkg-check';

const app = new cdk.App();

test('Matches SnapShot', async () => {
  // Wrap the exec function in a Promise
  const runExec = () => new Promise<string>((resolve, reject) => {
    exec('npm view snyk version', (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trimEnd());
      }
    });
  }); const cdkStack = new cdk.Stack(app, 'CdkTestStack');
  new AusPkgVersionCheckStack(cdkStack, 'TestFunction', {
    terminationProtection: false,
    analyticsReporting: true,
  });

  // Use await to wait for the asynchronous operation to complete
  try {
    const localVersion = await runExec();
    console.log(`YOUR INSTALLED SNYK VERSION: ${localVersion}`);
  } catch (error) {
    console.error('Error fetching SNYK version:', error);
  }
  const cdkTestStackOutput = app.synth().getStackArtifact('CdkTestStack').template;
  expect(Template.fromJSON(cdkTestStackOutput)).toMatchSnapshot();
});
