use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Wrap},
    Frame,
};
use std::path::Path;

use crate::app::App;

pub fn draw(f: &mut Frame, app: &mut App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Title
            Constraint::Length(3), // Stats
            Constraint::Min(10),   // Main content
            Constraint::Length(5), // Logs
            Constraint::Length(1), // Footer
        ])
        .split(f.area());

    draw_title(f, app, chunks[0]);
    draw_stats(f, app, chunks[1]);
    
    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(chunks[2]);
        
    draw_file_list(f, app, main_chunks[0]);
    draw_diff_view(f, app, main_chunks[1]);
    
    draw_logs(f, app, chunks[3]);
    draw_footer(f, chunks[4]);

    if app.help_visible {
        draw_help(f);
    }
}

struct FileType {
    label: &'static str,
    color: Color,
}

fn get_file_type(path_str: &str) -> FileType {
    let ext = Path::new(path_str)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    match ext {
        "js" | "jsx" => FileType { label: "JS", color: Color::Yellow },
        "ts" | "tsx" => FileType { label: "TS", color: Color::Blue },
        "php" => FileType { label: "PHP", color: Color::Magenta },
        "twig" => FileType { label: "TWIG", color: Color::Green },
        "css" | "scss" => FileType { label: "CSS", color: Color::Blue },
        "html" => FileType { label: "HTML", color: Color::Red },
        "json" | "yaml" | "yml" => FileType { label: "CONF", color: Color::Red },
        "md" => FileType { label: "MD", color: Color::White },
        "rs" => FileType { label: "RUST", color: Color::Red },
        "toml" => FileType { label: "TOML", color: Color::Green },
        _ => FileType { label: "FILE", color: Color::White },
    }
}

fn draw_title(f: &mut Frame, app: &App, area: Rect) {
    let anim_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinner = anim_chars[app.anim_frame % anim_chars.len()];
    
    let status_text = if app.modifications.is_empty() {
        format!("{} Waiting", spinner)
    } else {
        format!("{} Monitoring", spinner)
    };

    let title = Paragraph::new(Line::from(vec![
        Span::styled("codelens", Style::default().add_modifier(Modifier::BOLD).fg(Color::Cyan)),
        Span::raw(" - Real-time File Monitoring "),
        Span::styled(status_text, Style::default().fg(if app.modifications.is_empty() { Color::Yellow } else { Color::Green })),
    ]))
    .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(Color::Cyan)))
    .alignment(ratatui::layout::Alignment::Center);

    f.render_widget(title, area);
}

fn draw_stats(f: &mut Frame, app: &App, area: Rect) {
    let stats = app.stats();
    
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(25),
            Constraint::Percentage(25),
            Constraint::Percentage(25),
            Constraint::Percentage(25),
        ])
        .split(area);

    let boxes = vec![
        (" Modified Files ", format!("{}", stats.modified), Color::Green),
        (" Lines Added ", format!("+{}", stats.lines_added), Color::Blue),
        (" Lines Deleted ", format!("-{}", stats.lines_deleted), Color::Red),
        (" Status ", "● WATCHING".to_string(), Color::Yellow),
    ];

    for (i, (title, content, color)) in boxes.iter().enumerate() {
        let p = Paragraph::new(content.as_str())
            .block(Block::default().title(*title).borders(Borders::ALL).border_style(Style::default().fg(*color)))
            .style(Style::default().fg(*color).add_modifier(Modifier::BOLD))
            .alignment(ratatui::layout::Alignment::Center);
        f.render_widget(p, chunks[i]);
    }
}

fn draw_file_list(f: &mut Frame, app: &mut App, area: Rect) {
    let items: Vec<ListItem> = app.modifications.iter().filter(|m| !app.ignore_list.contains(&m.path)).map(|m| {
        let time = chrono::DateTime::<chrono::Local>::from(m.timestamp).format("%H:%M:%S").to_string();
        let ft = get_file_type(&m.path);
        
        let content = Line::from(vec![
            Span::styled("● ", Style::default().fg(Color::Green)),
            Span::styled(format!("[{}] ", ft.label), Style::default().fg(ft.color)),
            Span::raw(format!("{} ", time)),
            Span::styled(format!("+{} ", m.added), Style::default().fg(Color::Blue)),
            Span::styled(format!("-{} ", m.deleted), Style::default().fg(Color::Red)),
            Span::raw(&m.path),
        ]);
        ListItem::new(content)
    }).collect();

    let list = List::new(items)
        .block(Block::default().title(" Recent Changes (↑↓ Navigate, I: Ignore, C: Clear) ").borders(Borders::ALL).border_style(Style::default().fg(Color::Cyan)))
        .highlight_style(Style::default().bg(Color::Blue).fg(Color::White).add_modifier(Modifier::BOLD))
        .highlight_symbol(">> ");

    let mut state = ListState::default();
    state.select(Some(app.selected_index));

    f.render_stateful_widget(list, area, &mut state);
}

fn draw_diff_view(f: &mut Frame, app: &App, area: Rect) {
    let visible_mods: Vec<_> = app.modifications.iter().filter(|m| !app.ignore_list.contains(&m.path)).collect();
    
    let mut text = Text::default();
    
    if visible_mods.is_empty() {
        text.lines.push(Line::from("No changes to display"));
    } else if let Some(m) = visible_mods.get(app.selected_index) {
        let ft = get_file_type(&m.path);
        text.lines.push(Line::from(vec![
            Span::styled(format!("[{}] ", ft.label), Style::default().fg(ft.color)),
            Span::styled(&m.path, Style::default().add_modifier(Modifier::BOLD).fg(Color::Cyan))
        ]));
        
        let size_str = if m.size < 1024 { format!("{} B", m.size) } else { format!("{:.2} KB", m.size as f64 / 1024.0) };
        text.lines.push(Line::from(vec![Span::styled(format!("Size: {}", size_str), Style::default().fg(Color::DarkGray))]));
        text.lines.push(Line::from(""));
        
        for line in m.diff.lines() {
            if line.starts_with('+') {
                text.lines.push(Line::from(Span::styled(line, Style::default().fg(Color::Green))));
            } else if line.starts_with('-') {
                text.lines.push(Line::from(Span::styled(line, Style::default().fg(Color::Red))));
            } else if line.starts_with("@@") {
                text.lines.push(Line::from(Span::styled(line, Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))));
            } else {
                text.lines.push(Line::from(Span::styled(line, Style::default().fg(Color::DarkGray))));
            }
        }
    }

    let p = Paragraph::new(text)
        .block(Block::default().title(" Diff Preview ").borders(Borders::ALL).border_style(Style::default().fg(Color::Magenta)))
        .wrap(Wrap { trim: false });
    
    f.render_widget(p, area);
}

fn draw_logs(f: &mut Frame, app: &App, area: Rect) {
    let text: Vec<Line> = app.logs.iter().map(|l| Line::from(l.as_str())).collect();
    let p = Paragraph::new(text)
        .block(Block::default().title(" Activity Log ").borders(Borders::ALL).border_style(Style::default().fg(Color::Yellow)))
        .wrap(Wrap { trim: false });
    f.render_widget(p, area);
}

fn draw_footer(f: &mut Frame, area: Rect) {
    let p = Paragraph::new(Line::from(vec![
        Span::raw("© 2026 "),
        Span::styled("CodeLens", Style::default().add_modifier(Modifier::BOLD).fg(Color::Cyan)),
        Span::raw(" | Écrit en "),
        Span::styled("Rust", Style::default().add_modifier(Modifier::BOLD).fg(Color::Red)),
        Span::raw(" par "),
        Span::styled("Antonin Nivoche", Style::default().add_modifier(Modifier::BOLD).fg(Color::Cyan)),
        Span::raw(" | "),
        Span::styled("antonin.niv@gmail.com", Style::default().fg(Color::Blue)),
        Span::raw(" | "),
        Span::styled("github.com/socket7/codelens", Style::default().fg(Color::Blue)),
        Span::raw(" | "),
        Span::styled("https://olive.click", Style::default().fg(Color::Blue)),
    ]))
    .alignment(ratatui::layout::Alignment::Center);
    f.render_widget(p, area);
}

fn draw_help(f: &mut Frame) {
    let area = centered_rect(60, 60, f.area());
    let help_text = "
Keyboard Shortcuts:

  ↑/k         - Move up in file list
  ↓/j         - Move down in file list
  i           - Ignore selected file
  c           - Clear all changes
  ?           - Toggle this help
  q/Ctrl+C    - Quit

Features:

  • Real-time file monitoring
  • Colorful diff visualization
  • Smart filtering
  • Interactive accept/ignore controls
";
    let p = Paragraph::new(help_text)
        .block(Block::default().title(" Help (Press ? again to close) ").borders(Borders::ALL).border_style(Style::default().fg(Color::Green)))
        .style(Style::default().fg(Color::White).bg(Color::Black));
    
    f.render_widget(ratatui::widgets::Clear, area); // clear background
    f.render_widget(p, area);
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}
