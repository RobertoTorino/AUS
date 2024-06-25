import { App } from 'aws-cdk-lib';
import { AusPkgVersionCheckStack } from '../lib/auspkg-check';

describe('Synthesize tests', () => {
  const app = new App();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
  let aucCdkStack: AusPkgVersionCheckStack;

  test('Creates the stack without exceptions', () => {
    expect(() => {
      aucCdkStack = new AusPkgVersionCheckStack(app, 'TestCdkStack', {
        terminationProtection: false,
      });
    }).not.toThrow();
  });

  test('This app can synthesize completely', () => {
    expect(() => {
      app.synth();
    }).not.toThrow();
  });

  describe('Synthesize tests', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    let aucCdkLibStack: AusPkgVersionCheckStack;

    test('Creates the stack without exceptions', () => {
      expect(() => {
        aucCdkLibStack = new AusPkgVersionCheckStack(app, 'constructs', {
          terminationProtection: false,
        });
      }).not.toThrow();
    });

    test('This app can synthesize completely', () => {
      expect(() => {
        app.synth();
      }).not.toThrow();
    });
  });
});
