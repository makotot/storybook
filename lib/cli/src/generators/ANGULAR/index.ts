import path from 'path';
import semver from '@storybook/semver';
import { CoreBuilder, writeFileAsJson, copyTemplate } from '@storybook/package-tools';
import {
  isDefaultProjectSet,
  editStorybookTsConfig,
  getAngularAppTsConfigJson,
  getAngularAppTsConfigPath,
  getBaseTsConfigName,
} from './angular-helpers';
import { baseGenerator, Generator } from '../baseGenerator';

function editAngularAppTsConfig() {
  const tsConfigJson = getAngularAppTsConfigJson();
  const glob = '**/*.stories.*';
  if (!tsConfigJson) {
    return;
  }

  const { exclude = [] } = tsConfigJson;
  if (exclude.includes(glob)) {
    return;
  }

  tsConfigJson.exclude = [...exclude, glob];
  writeFileAsJson(getAngularAppTsConfigPath(), tsConfigJson);
}

const generator: Generator = async (packageManager, npmOptions, options) => {
  if (!isDefaultProjectSet()) {
    throw new Error(
      'Could not find a default project in your Angular workspace.\nSet a defaultProject in your angular.json and re-run the installation.'
    );
  }
  const angularVersion = semver.coerce(
    packageManager.retrievePackageJson().dependencies['@angular/core']
  )?.version;
  const isWebpack5 = semver.gte(angularVersion, '12.0.0');
  const updatedOptions = isWebpack5 ? { ...options, builder: CoreBuilder.Webpack5 } : options;

  baseGenerator(packageManager, npmOptions, updatedOptions, 'angular', {
    extraPackages: ['@compodoc/compodoc'],
    addScripts: false,
  });
  copyTemplate(__dirname);

  editAngularAppTsConfig();
  editStorybookTsConfig(path.resolve('./.storybook/tsconfig.json'));

  // edit scripts to generate docs
  const tsConfigFile = await getBaseTsConfigName();
  packageManager.addScripts({
    'docs:json': `compodoc -p ./${tsConfigFile} -e json -d .`,
  });
  packageManager.addStorybookCommandInScripts({
    port: 6006,
    preCommand: 'docs:json',
  });
};

export default generator;
