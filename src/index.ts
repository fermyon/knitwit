import { knitwit as _knitWit } from "../lib/knitwit.js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { knitWitConfigSchema } from "./shared/knitwitConfigSchema.js";
import { KNIT_WIT_CONFIG_FILE } from "./shared/constants.js";
import { platform } from "process";
// Create a require function based on the current working directory

const require = createRequire(path.resolve(process.cwd(), "package.json"));
const getKnitWitConfigPath = () => path.join(process.env.INIT_CWD!, process.env.npm_config_knitwit_source || KNIT_WIT_CONFIG_FILE);

interface knitWitOptions {
  witPaths?: string[];
  worlds?: string[];
  outputWorld?: string;
  outputPackage?: string;
  outDir?: string;
}

interface ParsedConfigFileOutput {
  packages: string[];
  witPaths: string[];
  worlds: string[];
}

export async function knitWit(
  opts: knitWitOptions = {},
  ignoreConfigFile: boolean = false,
) {
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
  let combinedWitOuput = _knitWit(
    opts.witPaths!,
    opts.worlds!,
    opts.outputWorld,
    opts.outputPackage,
  );
  writeFilesSync(combinedWitOuput, opts.outDir || "combined-wit");
}

async function attemptParsingConfigFile(): Promise<ParsedConfigFileOutput> {
  let kniwitConfigPath = getKnitWitConfigPath();
  // If the file does not exist just return an empty response
  if (!fs.existsSync(kniwitConfigPath)) {
    return {
      packages: [], witPaths: [], worlds: []
    }
  }
  try {
    let contents = fs.readFileSync(kniwitConfigPath, "utf-8");
    let data = await knitWitConfigSchema.validate(JSON.parse(contents));
    let packages: string[] = [];
    let witPaths: string[] = [];
    let worlds: string[] = [];
    for (let dep in data?.packages) {
      // for (package in data?.packages.map(async (k) => {
      packages.push(dep);
      worlds.push(data.packages[dep].world);
      let entrypoint = resolvePackagePath(dep);
      if (entrypoint) {
        let resolvedPath = path.resolve(entrypoint, data.packages[dep].witPath);
        witPaths.push(resolvedPath);
      }
    };
    // If there is any project specifc configuration concat to existing list
    if (data.project) {
      witPaths = witPaths.concat(data.project.witPaths ? data.project.witPaths : []);
      worlds = worlds.concat(data.project.worlds ? data.project.worlds : []);
    }
    return {
      packages: packages,
      witPaths: witPaths,
      worlds: worlds,
    };
  } catch (e: any) {
    throw new Error(e.toString());
  }
}

function validateArguments(opts: knitWitOptions) {
  if (!(opts.witPaths && opts.witPaths?.length > 0)) {
    throw new Error("withPaths is empty");
  }
  if (!(opts.worlds && opts.worlds?.length > 0)) {
    throw new Error("Worlds is empty");
  }
}

function writeFilesSync(content: string, filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    fs.writeFileSync(path.join(filePath, "world.wit"), content);
  } catch (err) {
    console.error("Error writing output:", err);
    return false;
  }
}

const resolvePackagePath = (packageName: string, options = {}) => {
  try {
    // Use require.resolve to get the path to the package
    const resolvedPath = require.resolve(packageName, options);
    return resolvedPath;
  } catch (error) {
    // Handle the error if the package is not found
    throw new Error(`Error resolving package: ${packageName}: ${error}`);
  }
};

const isWindows = platform === 'win32';

function maybeWindowsPath(witPath: string) {
  if (!path) return path;
  if (!isWindows) return path.resolve(witPath);
  return '//?/' + path.resolve(witPath).replace(/\\/g, '/');
}