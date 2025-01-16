#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { lock } from 'proper-lockfile';
import { knitWitConfigSchema } from '../dist/shared/knitwitConfigSchema.js';
import { KNIT_WIT_CONFIG_FILE } from '../dist/shared/constants.js';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const getDirectoryPath = () => process.env.INIT_CWD;
const getPackageName = () => process.env.npm_package_name;
const getKnitWitConfigPath = () => path.join(process.env.INIT_CWD, process.env.npm_config_knitwit_source || KNIT_WIT_CONFIG_FILE);
const getPackagePath = () => process.env.npm_package_config_knitwit_witPath;
const getDefaultWorld = () => process.env.npm_package_config_knitwit_world;

function createFileIfNotExists(filePath, packageName, packagePath, packageWorld) {
    if (!fs.existsSync(filePath)) {
        let initialContent = { version: 1, packages: {} };
        initialContent.packages[packageName] = { witPath: packagePath, world: packageWorld }
        fs.writeFileSync(filePath, JSON.stringify(initialContent, null, 2), 'utf8');
        return true
    }
    return false
}

async function appendEntryIfNotExists(filePath, packageName, packagePath, packageWorld) {
    let fileContent = fs.readFileSync(filePath, 'utf8');
    let data = await knitWitConfigSchema.validate(JSON.parse(fileContent));

    if (!data.packages) {
        data.packages = {}
    }

    data.packages[packageName] = { witPath: packagePath, world: packageWorld };
    // Validate data before writing to file
    await knitWitConfigSchema.validate(data);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function runPostInstallSetup(withPath, world) {
    let filePath = getKnitWitConfigPath();
    let packageName = getPackageName();
    let directoryPath = getDirectoryPath();
    let packagePath = withPath || getPackagePath();
    let defaultWorld = world || getDefaultWorld();

    if (!packagePath || !defaultWorld) {
        throw new error("No pacakge path or world provided and could not be parsed from package.json");
    }

    try {
        // locking is necessary as npm may install parallely and run postinstall scripts in parallel
        // Need to lock directory as the file may not exist
        let release = await lock(directoryPath, { retries: { retries: 10, minTimeout: 10, maxTimeout: 100 } });

        if (!createFileIfNotExists(filePath, packageName, packagePath, defaultWorld)) {
            appendEntryIfNotExists(filePath, packageName, packagePath, defaultWorld);
        }

        // release the lock on the directory
        release();
    } catch (err) {
        throw new Error(`Error while processing ${filePath}: ${err}`);
    }
}

if (process.env.INIT_CWD === process.cwd()) {
    process.exit()
}

// Parse command line arguments using yargs
const argv = yargs(hideBin(process.argv))
    .option('wit-path', {
        type: 'string',
        describe: 'Path to the wit file',
    })
    .option('world', {
        type: 'string',
        describe: 'World for the knitwit configuration',
    })
    .argv;

runPostInstallSetup(argv.witPath, argv.world);