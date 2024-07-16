interface knitWitOptions {
    witPaths?: string[];
    worlds?: string[];
    outputWorld?: string;
    outputPackage?: string;
    outDir?: string;
}
export declare function knitWit(opts?: knitWitOptions, ignoreConfigFile?: boolean): Promise<void>;
export {};
