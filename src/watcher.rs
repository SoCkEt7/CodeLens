use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tokio::sync::mpsc;
use notify::{Watcher, RecursiveMode, EventKind};
use similar::{ChangeTag, TextDiff};

use crate::app::{Event, FileModification};

const ALLOWED_EXTENSIONS: &[&str] = &[
    "js", "jsx", "ts", "tsx", "php", "twig", "css", "scss", 
    "html", "json", "yaml", "yml", "md", "rs", "toml"
];

pub async fn run_watcher(tx: mpsc::Sender<Event>) -> anyhow::Result<()> {
    let (notify_tx, mut notify_rx) = mpsc::unbounded_channel();

    let mut watcher = notify::RecommendedWatcher::new(
        move |res| {
            if let Ok(event) = res {
                let _ = notify_tx.send(event);
            }
        },
        notify::Config::default()
    )?;

    watcher.watch(Path::new("."), RecursiveMode::Recursive)?;
    let _ = tx.send(Event::Log("Watcher ready - monitoring files...".to_string())).await;

    let mut file_cache: HashMap<PathBuf, String> = HashMap::new();

    while let Some(event) = notify_rx.recv().await {
        if matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
            for path in event.paths {
                // Ignore dot directories and common build dirs
                let path_str = path.to_string_lossy();
                if path_str.contains("/.git/") 
                    || path_str.contains("/node_modules/")
                    || path_str.contains("/target/")
                    || path_str.contains("/build/")
                {
                    continue;
                }

                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if !ALLOWED_EXTENSIONS.contains(&ext) {
                        continue;
                    }
                } else {
                    continue;
                }

                let new_content = match tokio::fs::read_to_string(&path).await {
                    Ok(c) => c,
                    Err(_) => continue, // Might be deleted or unreadable
                };

                let old_content = file_cache.get(&path).cloned().unwrap_or_default();
                
                if new_content == old_content {
                    continue;
                }

                let diff = TextDiff::from_lines(&old_content, &new_content);
                let mut added = 0;
                let mut deleted = 0;
                let mut colored_diff = String::new();

                for change in diff.iter_all_changes() {
                    match change.tag() {
                        ChangeTag::Delete => {
                            deleted += 1;
                            colored_diff.push_str(&format!("- {}", change.value()));
                        }
                        ChangeTag::Insert => {
                            added += 1;
                            colored_diff.push_str(&format!("+ {}", change.value()));
                        }
                        ChangeTag::Equal => {
                            colored_diff.push_str(&format!("  {}", change.value()));
                        }
                    }
                }

                file_cache.insert(path.clone(), new_content);

                let meta = tokio::fs::metadata(&path).await;
                let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                let timestamp = meta.and_then(|m| m.modified()).unwrap_or_else(|_| SystemTime::now());

                let display_path = path.strip_prefix(".").unwrap_or(&path).to_string_lossy().to_string();

                let _ = tx.send(Event::FileChanged(FileModification {
                    path: display_path,
                    timestamp,
                    size,
                    added,
                    deleted,
                    diff: colored_diff,
                })).await;
            }
        }
    }

    Ok(())
}
