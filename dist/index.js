import { knitwit as _knitWit } from "../lib/knitwit.js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { knitWitConfigSchema } from "./shared/knitwitConfigSchema.js";
import { KNIT_WIT_CONFIG_FILE } from "./shared/constants.js";
import { platform } from "process";
// Create a require function based on the current working directory
const require = createRequire(path.resolve(process.cwd(), "package.json"));
export async function knitWit(opts = {}, ignoreConfigFile = false) {
    console.log(`Attempting to read ${KNIT_WIT_CONFIG_FILE}`);
    // attempt to read knitwit.json to get witPaths and world details
    let { packages, witPaths, worlds } = !ignoreConfigFile
        ? await attemptParsingConfigFile()
        : { packages: [], witPaths: [], worlds: [] };
    opts.witPaths = opts.witPaths ? opts.witPaths.concat(witPaths) : witPaths;
    opts.worlds = opts.worlds ? opts.worlds.concat(worlds) : worlds;
    //sanitize paths in case of windows
    opts.witPaths = opts.witPaths.map(maybeWindowsPath);
    console.log("loaded configuration for:", packages);
    validateArguments(opts);
    // witPaths and worlds will be non empty as they will be populated from
    // knitwit.json if they were empty
    let combinedWitOuput = _knitWit(opts.witPaths, opts.worlds, opts.outputWorld, opts.outputPackage, opts.outDir);
    writeFilesSync(combinedWitOuput);
}
async function attemptParsingConfigFile() {
    // If the file does not exist just return an empty response
    if (!fs.existsSync(KNIT_WIT_CONFIG_FILE)) {
        return {
            packages: [], witPaths: [], worlds: []
        };
    }
    try {
        let contents = fs.readFileSync(KNIT_WIT_CONFIG_FILE, "utf-8");
        let data = await knitWitConfigSchema.validate(JSON.parse(contents));
        let packages = [];
        let witPaths = [];
        let worlds = [];
        // If there is any project specifc configuration, use that as the base
        if (data.project) {
            witPaths = data.project.wit_paths ? data.project.wit_paths : [];
            worlds = data.project.worlds ? data.project.worlds : [];
        }
        for (let dep in data === null || data === void 0 ? void 0 : data.packages) {
            // for (package in data?.packages.map(async (k) => {
            packages.push(dep);
            worlds.push(data.packages[dep].world);
            let entrypoint = resolvePackagePath(dep);
            if (entrypoint) {
                let resolvedPath = path.resolve(entrypoint, data.packages[dep].witPath);
                witPaths.push(resolvedPath);
            }
        }
        ;
        return {
            packages: packages,
            witPaths: witPaths,
            worlds: worlds,
        };
    }
    catch (e) {
        throw new Error(e.toString());
    }
}
function validateArguments(opts) {
    var _a, _b;
    if (!(opts.witPaths && ((_a = opts.witPaths) === null || _a === void 0 ? void 0 : _a.length) > 0)) {
        throw new Error("withPaths is empty");
    }
    if (!(opts.worlds && ((_b = opts.worlds) === null || _b === void 0 ? void 0 : _b.length) > 0)) {
        throw new Error("Worlds is empty");
    }
}
function writeFilesSync(fileTuples) {
    try {
        fileTuples.forEach(([filePath, content]) => {
            let directory = path.dirname(filePath);
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            fs.writeFileSync(filePath, content);
        });
        return true;
    }
    catch (err) {
        console.error("Error writing files:", err);
        return false;
    }
}
const resolvePackagePath = (packageName, options = {}) => {
    try {
        // Use require.resolve to get the path to the package
        const resolvedPath = require.resolve(packageName, options);
        return resolvedPath;
    }
    catch (error) {
        // Handle the error if the package is not found
        throw new Error(`Error resolving package: ${packageName}: ${error}`);
    }
};
const isWindows = platform === 'win32';
function maybeWindowsPath(witPath) {
    if (!path)
        return path;
    if (!isWindows)
        return path.resolve(witPath);
    return '//?/' + path.resolve(witPath).replace(/\\/g, '/');
}
