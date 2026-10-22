// Pas de fenêtre de console en plus de l'application sous Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    archive_familiale_lib::run()
}
