use anyhow::anyhow;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};
use wit_component::{DecodedWasm, WitPrinter};
use wit_parser::{PackageId, Resolve};

wit_bindgen::generate!({
    world: "knitwit",
});

struct KnitWit;

impl Guest for KnitWit {
    fn knitwit(
        wit_paths: Vec<String>,
        worlds: Vec<String>,
        output_world: Option<String>,
        output_package: Option<String>,
        output_dir: Option<String>,
    ) -> Result<Vec<(String, String)>, String> {
        if wit_paths.is_empty() {
            return Err("No wit-paths provided".to_owned());
        }
        if worlds.is_empty() {
            return Err("No worlds provided to be knit".to_owned());
        }

        let output_package = output_package.unwrap_or_else(|| "local:combined-wit".to_owned());
        let output_world = output_world.unwrap_or_else(|| "combined".to_owned());
        let output_dir = output_dir.unwrap_or_else(|| "combined-wit".to_owned());

        let mut resolve = Resolve::default();
        let id = resolve
            .push_str(
                "component.wit",
                &target_wit_source(&output_package, &output_world),
            )
            .map_err(|e| e.to_string())?;

        merge_wits(&mut resolve, wit_paths).map_err(|e| e.to_string())?;

        let (base_world, _) = resolve
            .worlds
            .iter()
            .find(|(world, _)| resolve.worlds[*world].name == output_world)
            .expect("could not find base world");

        merge_worlds(&mut resolve, base_world, worlds).map_err(|e| e.to_string())?;

        resolve_to_readable_wit(resolve, id, output_dir).map_err(|e| e.to_string())
    }
}

fn merge_wits(resolve: &mut Resolve, wit_paths: Vec<String>) -> anyhow::Result<()> {
    for path in wit_paths {
        let (temp, _) = parse_wit(&PathBuf::from(path)).map_err(|e| anyhow!("{:?}", e))?;
        resolve.merge(temp).expect("could not merge wits");
    }

    Ok(())
}

fn merge_worlds(
    resolve: &mut Resolve,
    base_world: id_arena::Id<wit_parser::World>,
    worlds: Vec<String>,
) -> anyhow::Result<()> {
    for world_name in worlds {
        let (world_to_merge, _) = resolve
            .worlds
            .iter()
            .find(|(world, _)| resolve.worlds[*world].name == world_name)
            .ok_or_else(|| anyhow!("could not find world named '{world_name}'"))?;
        resolve
            .merge_worlds(world_to_merge, base_world)
            .map_err(|e| {
                anyhow!(
                    "unable to merge with world '{}': {}",
                    resolve.worlds[world_to_merge].name,
                    e
                )
            })?;
    }

    Ok(())
}

fn resolve_to_readable_wit(
    resolve: Resolve,
    id: Vec<PackageId>,
    output_dir: String,
) -> anyhow::Result<Vec<(String, String)>> {
    let mut out: Vec<(String, String)> = Vec::new();

    let decoded = DecodedWasm::WitPackages(resolve, id);

    let resolve = decoded.resolve();
    let main = decoded.packages();

    let mut printer = WitPrinter::default();
    printer.emit_docs(false);

    let mut names = HashMap::new();
    for (_id, pkg) in resolve.packages.iter() {
        let cnt = names
            .entry(&pkg.name.name)
            .or_insert(HashMap::new())
            .entry(&pkg.name.namespace)
            .or_insert(0);
        *cnt += 1;
    }

    let dir = PathBuf::from(output_dir);

    for (id, pkg) in resolve.packages.iter() {
        let is_main = main.contains(&id);
        let output = printer.print(resolve, &[id], is_main)?;
        let out_dir = if is_main {
            dir.clone()
        } else {
            dir.join("deps")
        };
        let packages_with_same_name = &names[&pkg.name.name];
        let packages_with_same_namespace = packages_with_same_name[&pkg.name.namespace];
        let stem = if packages_with_same_name.len() == 1 {
            if packages_with_same_namespace == 1 {
                pkg.name.name.clone()
            } else {
                pkg.name
                    .version
                    .as_ref()
                    .map(|ver| format!("{}@{}", pkg.name.name, ver))
                    .unwrap_or_else(|| pkg.name.name.clone())
            }
        } else {
            if packages_with_same_namespace == 1 {
                format!("{}:{}", pkg.name.namespace, pkg.name.name)
            } else {
                pkg.name.to_string()
            }
        };
        let filename = format!("{stem}.wit");
        let path = out_dir.join(&filename);
        out.push((path.to_str().unwrap_or_default().to_owned(), output));
    }

    Ok(out)
}

fn parse_wit(path: &Path) -> anyhow::Result<(Resolve, Vec<PackageId>)> {
    let mut resolve = Resolve::default();
    let id = if path.is_dir() {
        resolve.push_dir(&path)?.0
    } else {
        resolve.push_file(&path)?
    };
    Ok((resolve, id))
}

fn target_wit_source(package_name: &str, world_name: &str) -> String {
    return format!(
        "package {package_name};

        world {world_name} {{
        }}",
    );
}

export!(KnitWit);
