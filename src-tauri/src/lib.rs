use std::fs::{create_dir_all, File};
use std::io::Write;
use tauri::{AppHandle, Emitter, Manager};
use futures_util::StreamExt;

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    surah_number: u32,
    progress: f64,
    status: String,
}

#[tauri::command]
async fn check_offline_status(app: AppHandle, surah_number: u32) -> Result<bool, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = app_dir.join("audio").join(format!("{}.mp3", surah_number));
    Ok(path.exists())
}

#[tauri::command]
async fn get_offline_audio_url(app: AppHandle, surah_number: u32) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = app_dir.join("audio").join(format!("{}.mp3", surah_number));
    if path.exists() {
        Ok(path.to_string_lossy().into_owned())
    } else {
        Err("File does not exist".to_string())
    }
}

#[tauri::command]
async fn download_surah(app: AppHandle, audio_url: String, surah_number: u32) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let audio_dir = app_dir.join("audio");
    create_dir_all(&audio_dir).map_err(|e| e.to_string())?;
    let path = audio_dir.join(format!("{}.mp3", surah_number));

    let response = reqwest::get(&audio_url).await.map_err(|e| e.to_string())?;
    let total_size = response.content_length().unwrap_or(0);

    let mut file = File::create(&path).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64) * 100.0;
            app.emit("download-progress", DownloadProgress {
                surah_number,
                progress,
                status: "downloading".to_string(),
            }).unwrap_or(());
        }
    }

    app.emit("download-progress", DownloadProgress {
        surah_number,
        progress: 100.0,
        status: "completed".to_string(),
    }).unwrap_or(());

    Ok(path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      check_offline_status,
      get_offline_audio_url,
      download_surah
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
