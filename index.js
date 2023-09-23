const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs');

const HELM = 'helm';
const REPO_ALIAS = 'repo';
const RELEASE_DIR = '.release/';

// Returns argument required to register the S3 repository.
function repo() {
  const repo = core.getInput('repo', {
    required: true,
  });

  return [
    'repo',
    'add',
    REPO_ALIAS,
    repo,
  ];
}

// Returns argument required to generate the chart package.
function package() {
  const args = [
    'package',
    core.getInput('chart'),
    `--destination=${RELEASE_DIR}`,
  ];
  
  const version = core.getInput('version');
  if (version) {
    args.push(`--version=${version}`);
  }

  const appVersion = core.getInput('appVersion');
  if (appVersion) {
    args.push(`--app-version=${appVersion}`);
  }

  return args;
}

// Returns argument required to push the chart release to S3 repository.
function push() {
  const releaseFile = path.join(RELEASE_DIR, fs.readdirSync(RELEASE_DIR)[0]);
  const args = [
    's3',
    'push',
    '--relative',
    releaseFile,
    REPO_ALIAS,
  ];

  return args;
}

// Returns argument required to install helm-s3 and helm-pack plugins.
function installPlugins() {
  const plugins = [
    'https://github.com/hypnoglow/helm-s3.git',
  ];

  return Promise.all(plugins.map(plugin => exec.exec(HELM, ['plugin', 'install', plugin])));
}

async function main() {
  try {
    await installPlugins();
    await exec.exec(HELM, repo()),
    await exec.exec(HELM, package()),
    await exec.exec(HELM, push())
  } catch (err) {
    core.error(err);
    core.setFailed(err.message);
  }
}

main();