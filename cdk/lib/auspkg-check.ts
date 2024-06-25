import {
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

const { exec } = require('child_process');
const chalk = require('chalk');
const notificationMarkup = require('./utilities/markup');
const versionCheckLog = require('./utilities/log');

export class AusPkgVersionCheckStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // Invoke functions
    ausVersionCheck();

    // Check current version in package.json
    function ausVersionCheck() {
      exec(
        'node -p "require(\'snyk/package.json\').version"',
        (error: { message: any; }, stdout: string, stderr: any) => {
          if (error) {
            console.error(`Error: ${stderr}`);
          }
          // eslint-disable-next-line no-unused-expressions
          const localVersion = (`[ ${stdout.trimEnd()} ]`);
          // console.log(`YOUR INSTALLED SNYK VERSION: ${localVersion}`);

          exec(
            'npm view snyk version'.trimEnd(),
            (error: { message: any; }, stdout: string, stderr: any) => {
              if (error) {
                console.error(`Error: ${stderr}`);
              }
              const latestRelease = (`[ ${stdout.trimEnd()} ]`);

              try {
                // Upgrade available message
                const upgradeNotification = notificationMarkup.notifyMarkup([chalk.red('A newer version of SNYK is available: '
                      + (`[ ${stdout.trimEnd()} ]`)),
                // eslint-disable-next-line no-useless-concat
                chalk.red('Your SNYK package will now be upgraded to -> ' + (`[ ${stdout.trimEnd()} ]`))]);

                // Install the package
                const upgradePackage = exec(
                  'npm i --save-dev --save-exact --no-fund snyk@latest ; npm i -g --save-dev --save-exact --no-fund snyk@latest',
                  (error: { message: any; }, stdout: string, stderr: any) => {
                    if (error) {
                      console.error(`Error: ${stderr}`);
                    }
                    (`${upgradePackage}`);

                    const upgradePackageLog = chalk.cyan(`${stdout.replace(
                      /(^[ \t]*\n)/gm,
                      '',
                    )}`);

                    const packageUpgradeDate = notificationMarkup.notifyMarkup([chalk.green(`SNYK package successful updated at: ${
                      new Date().toLocaleString(
                        'en-US',
                        { timeZone: 'Europe/Brussels' },
                      )}`),
                    // eslint-disable-next-line no-useless-concat
                    chalk.green('You now have the latest SNYK version installed.'),
                    chalk.green('Test your package for compatibility issues or breaking changes!'),
                    chalk.green('Revert the changes by running [ npm uninstall YOUR_PACKAGE_NAME ]'),
                    chalk.green('Release info: https://github.com/snyk/cli/releases')]);

                    // clear the terminal
                    const clearTerminal = exec(
                      'clear + printf \'\\e[3J\'',
                      (
                        // eslint-disable-next-line no-unused-vars
                        _error: { message: any; },
                        // eslint-disable-next-line no-unused-vars
                        _stdout: any,
                      ) => {
                        `${clearTerminal}`;

                        // No upgrade needed message
                        const skipUpgradeNotification = notificationMarkup.notifyMarkup([chalk.green('The latest version of the SNYK package is:  '
                                  + `${latestRelease}`),
                        // eslint-disable-next-line no-useless-concat
                        chalk.green('You have the latest SNYK version installed: ' + `${localVersion}`),
                        chalk.green('Release info: https://github.com/snyk/cli/releases')]);

                        // Logic
                        if (!(localVersion < latestRelease)) {
                          return skipUpgradeNotification.forEach((e: any) => versionCheckLog.print(e));
                        }
                        return [upgradeNotification.forEach((e: any) => versionCheckLog.print(e)),
                          upgradePackage,
                          packageUpgradeDate.forEach((e: any) => versionCheckLog.print(e)),
                          upgradePackageLog,
                          clearTerminal];
                      },
                    );
                  },
                );
              } catch (e) {
                throw new Error(chalk.red('Upgrade failed: check your AWS credentials!'));
              }
            },
          );
        },
      );
    }
  }
}
