import { ObjectSchema } from "yup";
interface PackageConfig {
    witPath: string;
    world: string;
}
interface ProjectConfig {
    witPaths?: string[];
    worlds?: string[];
}
interface KnitWitConfig {
    version: number;
    project: ProjectConfig;
    packages: Record<string, PackageConfig>;
}
declare const knitWitConfigSchema: ObjectSchema<KnitWitConfig>;
export { knitWitConfigSchema };
