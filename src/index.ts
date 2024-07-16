import { knitWit as _knitWit } from "../lib/knit-wit.js";
import fs from "fs";
import path from "path";
import { InferType, object, string, array, number } from "yup";
import { createRequire } from "module";

// Create a require function based on the current working directory
const require = createRequire(path.resolve(process.cwd(), "package.json"));

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

type KnitWitConfig = InferType<typeof knitWitConfigSchema>;

type combinedWitOuput = [string, string][];

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

export async function knitWit(opts: knitWitOptions = {}) {
  validateArguments(opts);

  if (!opts.witPaths) {
    console.log(
      `Attempting to read ${KNIT_WIT_CONFIG_FILE} as worlds and witPaths are empty`,
    );
    // attempt to read knit-wit.json to get witPaths and world details
    let { packages, witPaths, worlds } = await attemptParsingConfigFile();
    opts.witPaths = witPaths;
    opts.worlds = opts.worlds ? opts.worlds.concat(worlds) : worlds;

    console.log("loaded configuration for:", packages);
  }
  // witPaths and worlds will be non empty as they will be populated from
  // knit-wit.json if they were empty
  let combinedWitOuput = _knitWit(
    opts.witPaths!,
    opts.worlds!,
    opts.outputWorld,
    opts.outputPackage,
    opts.outDir,
  );
  writeFilesSync(combinedWitOuput);
}

async function attemptParsingConfigFile(): Promise<ParsedConfigFileOutput> {
  try {
    let contents = fs.readFileSync(KNIT_WIT_CONFIG_FILE, "utf-8");
    let data = await knitWitConfigSchema.validate(JSON.parse(contents));
    let packages: string[] = [];
    let witPaths: string[] = [];
    let worlds: string[] = [];
    data?.packages?.map(async (k) => {
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
  } catch (e: any) {
    throw new Error(e.toString());
  }
}

function validateArguments(opts: knitWitOptions) {
  if (opts.witPaths != undefined && opts.witPaths.length === 0) {
    throw new Error("witPaths should either be undefined or non empty list");
  }
}

function writeFilesSync(fileTuples: combinedWitOuput) {
  try {
    fileTuples.forEach(([filePath, content]) => {
      let directory = path.dirname(filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      fs.writeFileSync(filePath, content);
    });
    return true;
  } catch (err) {
    console.error("Error writing files:", err);
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
