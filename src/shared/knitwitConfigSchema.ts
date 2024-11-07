import { object, string, array, number, lazy, ObjectSchema } from "yup";

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

const packageConfigSchema: ObjectSchema<PackageConfig> = object({
    witPath: string().required(),
    world: string().required(),
});

function mapValues<T extends Record<string, any>, U>(
    obj: T,
    fn: (value: T[keyof T], key: string, obj: T) => U
): Record<string, U> {
    return Object.keys(obj).reduce((result, key) => {
        result[key] = fn(obj[key], key, obj);
        return result;
    }, {} as Record<string, U>);
}

const knitWitConfigSchema: ObjectSchema<KnitWitConfig> = object({
    version: number().required(),
    project: object({
        wit_paths: array(string().required()),
        worlds: array(string().required()),
    }).required(),
    packages: lazy((obj) => {
        return object(
            mapValues(obj as Record<string, any>, () => packageConfigSchema)
        );
    })
});

export { knitWitConfigSchema };