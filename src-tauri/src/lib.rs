// Toute la logique est dans l'interface web (dossier src/) : ici on ne fait
// qu'activer les modules Tauri nécessaires (fichiers, boîtes de dialogue, mises à jour).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erreur au lancement de l'application");
}
