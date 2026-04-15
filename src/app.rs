use std::collections::{HashSet, VecDeque};
use std::time::SystemTime;

pub struct FileModification {
    pub path: String,
    pub timestamp: SystemTime,
    pub size: u64,
    pub added: usize,
    pub deleted: usize,
    pub diff: String,
    pub is_binary: bool,
}

pub struct AppStats {
    pub modified: usize,
    pub lines_added: usize,
    pub lines_deleted: usize,
}

pub enum Event {
    Tick,
    FileChanged(FileModification),
    Error(String),
    Log(String),
}

pub struct App {
    pub modifications: VecDeque<FileModification>,
    pub selected_index: usize,
    pub diff_scroll: u16,
    pub ignore_list: HashSet<String>,
    pub logs: VecDeque<String>,
    pub help_visible: bool,
    pub should_quit: bool,
    pub anim_frame: usize,
}

impl App {
    pub fn new() -> App {
        App {
            modifications: VecDeque::new(),
            selected_index: 0,
            diff_scroll: 0,
            ignore_list: HashSet::new(),
            logs: VecDeque::new(),
            help_visible: false,
            should_quit: false,
            anim_frame: 0,
        }
    }

    pub fn stats(&self) -> AppStats {
        let mut modified = 0;
        let mut lines_added = 0;
        let mut lines_deleted = 0;

        for m in &self.modifications {
            if !self.ignore_list.contains(&m.path) {
                modified += 1;
                lines_added += m.added;
                lines_deleted += m.deleted;
            }
        }

        AppStats {
            modified,
            lines_added,
            lines_deleted,
        }
    }

    pub fn add_log(&mut self, log: String) {
        let timestamp = chrono::Local::now().format("[%H:%M:%S]").to_string();
        self.logs.push_back(format!("{} {}", timestamp, log));
        if self.logs.len() > 100 {
            self.logs.pop_front();
        }
    }

    pub fn handle_file_changed(&mut self, mut modif: FileModification) {
        if self.ignore_list.contains(&modif.path) {
            return;
        }

        let added = modif.added;
        let deleted = modif.deleted;
        let is_binary = modif.is_binary;

        // Add or update modification
        if let Some(existing) = self.modifications.iter_mut().find(|m| m.path == modif.path) {
            existing.timestamp = modif.timestamp;
            existing.size = modif.size;
            existing.added = added;
            existing.deleted = deleted;
            existing.diff = std::mem::take(&mut modif.diff);
            existing.is_binary = is_binary;
            
            // Move to front
            let path_clone = modif.path.clone();
            if let Some(idx) = self.modifications.iter().position(|m| m.path == path_clone) {
                let m = self.modifications.remove(idx).unwrap();
                self.modifications.push_front(m);
            }
        } else {
            self.modifications.push_front(modif);
        }

        if self.modifications.len() > 50 {
            self.modifications.pop_back();
        }
    }

    pub fn select_next(&mut self) {
        let visible_count = self.modifications.iter().filter(|m| !self.ignore_list.contains(&m.path)).count();
        if visible_count > 0 && self.selected_index < visible_count - 1 {
            self.selected_index += 1;
            self.diff_scroll = 0;
        }
    }

    pub fn select_previous(&mut self) {
        if self.selected_index > 0 {
            self.selected_index -= 1;
            self.diff_scroll = 0;
        }
    }

    pub fn ignore_selected(&mut self) {
        let path_to_ignore = {
            let visible: Vec<_> = self.modifications.iter().filter(|m| !self.ignore_list.contains(&m.path)).collect();
            visible.get(self.selected_index).map(|m| m.path.clone())
        };

        if let Some(path) = path_to_ignore {
            self.ignore_list.insert(path.clone());
            self.add_log(format!("Ignored: {}", path));
            let visible_len = self.modifications.iter().filter(|m| !self.ignore_list.contains(&m.path)).count();
            if self.selected_index > 0 && self.selected_index >= visible_len {
                self.selected_index = visible_len.saturating_sub(1);
            }
        }
    }

    pub fn clear_all(&mut self) {
        self.modifications.clear();
        self.ignore_list.clear();
        self.selected_index = 0;
        self.diff_scroll = 0;
        self.add_log("Cleared all changes".to_string());
    }

    pub fn scroll_up(&mut self) {
        self.diff_scroll = self.diff_scroll.saturating_sub(1);
    }

    pub fn scroll_down(&mut self) {
        self.diff_scroll = self.diff_scroll.saturating_add(1);
    }
}
