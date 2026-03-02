mod app;
mod ui;
mod watcher;

use anyhow::Result;
use crossterm::{
    event::{self, Event as CEvent, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use std::{io, time::Duration};
use tokio::sync::mpsc;

use crate::app::{App, Event};

#[tokio::main]
async fn main() -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create app state
    let mut app = App::new();
    app.add_log("codelens started".to_string());
    
    // Setup channels
    let (tx, mut rx) = mpsc::channel(100);

    // Spawn watcher
    let watcher_tx = tx.clone();
    tokio::spawn(async move {
        if let Err(e) = watcher::run_watcher(watcher_tx.clone()).await {
            let _ = watcher_tx.send(Event::Error(format!("Watcher error: {}", e))).await;
        }
    });

    // Spawn keyboard event listener (blocking thread)
    let event_tx = tx.clone();
    std::thread::spawn(move || {
        loop {
            if let Ok(true) = crossterm::event::poll(Duration::from_millis(500)) {
                if let Ok(CEvent::Key(key)) = event::read() {
                    let mut should_quit = false;
                    
                    match key.code {
                        KeyCode::Char('q') | KeyCode::Esc => should_quit = true,
                        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => should_quit = true,
                        
                        KeyCode::Up | KeyCode::Char('k') => {
                            let _ = event_tx.blocking_send(Event::Log("select_previous".to_string()));
                        }
                        KeyCode::Down | KeyCode::Char('j') => {
                            let _ = event_tx.blocking_send(Event::Log("select_next".to_string()));
                        }
                        KeyCode::Char('i') => {
                            let _ = event_tx.blocking_send(Event::Log("ignore_selected".to_string()));
                        }
                        KeyCode::Char('c') => {
                            let _ = event_tx.blocking_send(Event::Log("clear_all".to_string()));
                        }
                        KeyCode::Char('?') => {
                            let _ = event_tx.blocking_send(Event::Log("toggle_help".to_string()));
                        }
                        _ => {}
                    }

                    if should_quit {
                        let _ = event_tx.blocking_send(Event::Log("quit".to_string()));
                        break;
                    }
                }
            }
        }
    });

    // Spawn tick generator for animation
    let tick_tx = tx.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(80));
        loop {
            interval.tick().await;
            if tick_tx.send(Event::Tick).await.is_err() {
                break;
            }
        }
    });

    // Main event loop
    loop {
        terminal.draw(|f| ui::draw(f, &mut app))?;

        if let Some(event) = rx.recv().await {
            match event {
                Event::Tick => {
                    app.anim_frame += 1;
                }
                Event::FileChanged(m) => {
                    app.handle_file_changed(m);
                }
                Event::Log(msg) => {
                    match msg.as_str() {
                        "select_previous" => app.select_previous(),
                        "select_next" => app.select_next(),
                        "ignore_selected" => app.ignore_selected(),
                        "clear_all" => app.clear_all(),
                        "toggle_help" => app.help_visible = !app.help_visible,
                        "quit" => {
                            app.should_quit = true;
                        },
                        _ => app.add_log(msg),
                    }
                }
                Event::Error(err) => {
                    app.add_log(err);
                }
            }
        }

        if app.should_quit {
            break;
        }
    }

    // Restore terminal
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    Ok(())
}
