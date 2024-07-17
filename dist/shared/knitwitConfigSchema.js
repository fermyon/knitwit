import { object, string, array, number, lazy } from "yup";
const packageConfigSchema = object({
    witPath: string().required(),
    world: string().required(),
});
function mapValues(obj, fn) {
    return Object.keys(obj).reduce((result, key) => {
        result[key] = fn(obj[key], key, obj);
        return result;
    }, {});
}
const knitWitConfigSchema = object({
    version: number().required(),
    project: object({
        wit_paths: array(string().required()),
        worlds: array(string().required()),
    }).required(),
    packages: lazy((obj) => {
        return object(mapValues(obj, () => packageConfigSchema));
    })
});
export { knitWitConfigSchema };
