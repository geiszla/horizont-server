const childProcess = require('child_process');

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const ignoredDependencies = ['babel-core', 'mobx', 'graphql'];
upgradeAsync();

async function upgradeAsync() {
  const oldDependencies = await getDependenciesAsync();
  const upgradedDependencies = await upgrade(oldDependencies);
  await compareDependencies(upgradedDependencies);
}

async function getDependenciesAsync() {
  const packageData = await fs.readFileAsync('./package.json');
  const packageJSON = JSON.parse(packageData);

  return Object.entries(packageJSON.dependencies)
    .concat(Object.entries(packageJSON.devDependencies))
    .filter(entry => !ignoredDependencies.includes(entry[0]));
}

function upgrade(dependencies) {
  return new Promise((resolve) => {
    console.log();

    const dependencyNames = dependencies.map(value => `${value[0]}@latest`);
    console.log(`Upgrading dependencies:\n${dependencyNames.join(' ')}\n`);

    const upgradeProcess = childProcess.spawn(
      /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn',
      ['upgrade'].concat(dependencyNames),
    ).on('exit', () => {
      resolve(dependencies);
    });
    upgradeProcess.stdout.pipe(process.stdout);
  });
}

async function compareDependencies(oldDependencies) {
  const newDependencies = await getDependenciesAsync();
  console.log();
  console.log('Upgraded dependencies:');

  const newObject = {};
  for (let i = 0; i < newDependencies.length; i++) {
    [, newObject[newDependencies[i][0]]] = newDependencies[i];
  }

  let didUpgrade = false;
  oldDependencies.forEach((entry) => {
    if (entry[1] !== newObject[entry[0]]) {
      console.log(`  ${entry[0]}: ${entry[1]} -> ${newObject[entry[0]]}`);
      didUpgrade = true;
    }
  });

  if (!didUpgrade) console.log('<none>');
}
