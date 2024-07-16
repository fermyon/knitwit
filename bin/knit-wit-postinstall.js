#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { object, string, array, number } from "yup";

const KNIT_WIT_CONFIG_FILE = "knit-wit.json";

let knitWitConfigSchema = object({
    version: number().required(),
    packages: array(
        object({
            name: string().required(),
            witPath: string().required(),
            world: string().required(),
        }),
    ),
});


const getFilePath = () => path.join(process.env.INIT_CWD, KNIT_WIT_CONFIG_FILE);
const getPackageName = () => process.env.npm_package_name;
const getPackagePath = () => process.env.npm_package_config_knitwit_witPath;
const getDefaultWorld = () => process.env.npm_package_config_knitwit_world;

function createFileIfNotExists(filePath, packageName, packagePath, packageWorld) {
    if (!fs.existsSync(filePath)) {
        const initialContent = JSON.stringify({ version: 1, packages: [{ name: packageName, witPath: packagePath, world: packageWorld }] }, null, 2);
        fs.writeFileSync(filePath, initialContent, 'utf8');
        return true
    }
    return false
}

async function appendEntryIfNotExists(filePath, packageName, packagePath, packageWorld) {
    let fileContent = fs.readFileSync(filePath, 'utf8');
    let data = await knitWitConfigSchema.validate(JSON.parse(fileContent));

    let entryExists = data.packages?.some(entry => entry.name === packageName && entry.witPath === packagePath && entry.world == packageWorld);

    if (!entryExists) {
        if (!data.packages) {
            data.packages = []
        }
        data.packages.push({ name: packageName, witPath: packagePath, world: packageWorld });
        console.log(data)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
}

function runPostInstallSetup() {
    let filePath = getFilePath();
    let packageName = getPackageName();
    let packagePath = getPackagePath();
    let defaultWorld = getDefaultWorld();

    if (!createFileIfNotExists(filePath, packageName, packagePath, defaultWorld)) {
        appendEntryIfNotExists(filePath, packageName, packagePath, defaultWorld);
    }
}

// if (process.env.INIT_CWD === process.cwd()) {
//     process.exit()
// }

runPostInstallSetup()