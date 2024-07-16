import { knitWit as _knitWit } from "../lib/knit-wit.js";
import fs from "fs";
import path from "path";
import { object, string, array, number } from "yup";
import { createRequire } from "module";
// Create a require function based on the current working directory
const require = createRequire(path.resolve(process.cwd(), "package.json"));
const KNIT_WIT_CONFIG_FILE = "knit-wit.json";
let knitWitConfigSchema = object({
    version: number().required(),
    packages: array(object({
        name: string().required(),
        witPath: string().required(),
        world: string().required(),
    })),
});
export async function knitWit(opts = {}, ignoreConfigFile = false) {
    console.log(`Attempting to read ${KNIT_WIT_CONFIG_FILE}`);
    // attempt to read knit-wit.json to get witPaths and world details
    let { packages, witPaths, worlds } = !ignoreConfigFile
        ? await attemptParsingConfigFile()
        : { packages: [], witPaths: [], worlds: [] };
    opts.witPaths = opts.witPaths ? opts.witPaths.concat(witPaths) : witPaths;
    opts.worlds = opts.worlds ? opts.worlds.concat(worlds) : worlds;
    console.log("loaded configuration for:", packages);
    validateArguments(opts);
    // witPaths and worlds will be non empty as they will be populated from
    // knit-wit.json if they were empty
    let combinedWitOuput = _knitWit(opts.witPaths, opts.worlds, opts.outputWorld, opts.outputPackage, opts.outDir);
    writeFilesSync(combinedWitOuput);
}
async function attemptParsingConfigFile() {
    var _a;
    try {
        let contents = fs.readFileSync(KNIT_WIT_CONFIG_FILE, "utf-8");
        let data = await knitWitConfigSchema.validate(JSON.parse(contents));
        let packages = [];
        let witPaths = [];
        let worlds = [];
        (_a = data === null || data === void 0 ? void 0 : data.packages) === null || _a === void 0 ? void 0 : _a.map(async (k) => {
            packages.push(k.name);
            worlds.push(k.world);
            let entrypoint = resolvePackagePath(k.name);
            if (entrypoint) {
                let resolvedPath = path.resolve(entrypoint, k.witPath);
                witPaths.push(resolvedPath);
            }
        });
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
