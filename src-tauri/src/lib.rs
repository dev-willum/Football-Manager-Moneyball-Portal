use std::fs;
use std::path::PathBuf;

use rusqlite::{params, Connection};
use chrono::Utc;
use tauri::{AppHandle, Manager};

const DATASET_KEY: &str = "current";
const DB_FILE_NAME: &str = "fm_analytics.sqlite3";

#[derive(serde::Serialize, serde::Deserialize)]
struct DatasetPayload {
  rows: Vec<serde_json::Value>,
  columns: Vec<String>,
  saved_at: i64,
  row_index: Option<Vec<DatasetRowIndex>>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct DatasetRowIndex {
  name: Option<String>,
  club: Option<String>,
  pos: Option<String>,
  age: Option<f64>,
  minutes: Option<f64>,
  height_in: Option<f64>,
}

#[derive(serde::Serialize)]
struct DatasetStatus {
  has_dataset: bool,
  row_count: i64,
  column_count: i64,
  saved_at: Option<i64>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct DatasetQuery {
  pos: Option<Vec<String>>,
  min_minutes: Option<f64>,
  max_age: Option<f64>,
  min_height_in: Option<f64>,
  max_height_in: Option<f64>,
  search: Option<String>,
}

fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, String> {
  let path = app
    .path()
    .resolve(DB_FILE_NAME, tauri::path::BaseDirectory::AppData)
    .map_err(|err| err.to_string())?;
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|err| err.to_string())?;
  }
  Ok(path)
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
  let path = resolve_db_path(app)?;
  let conn = Connection::open(path).map_err(|err| err.to_string())?;
  conn
    .execute(
      "CREATE TABLE IF NOT EXISTS dataset_cache (\
        key TEXT PRIMARY KEY,\
        columns_json TEXT NOT NULL,\
        row_count INTEGER NOT NULL,\
        column_count INTEGER NOT NULL,\
        saved_at INTEGER NOT NULL\
      )",
      [],
    )
    .map_err(|err| err.to_string())?;
  // Drop the legacy rows_json column from databases created before this table was slimmed down.
  let has_legacy_rows_json: bool = conn
    .query_row(
      "SELECT COUNT(*) FROM pragma_table_info('dataset_cache') WHERE name = 'rows_json'",
      [],
      |row| row.get::<_, i64>(0),
    )
    .map_err(|err| err.to_string())?
    > 0;
  if has_legacy_rows_json {
    conn
      .execute("ALTER TABLE dataset_cache DROP COLUMN rows_json", [])
      .map_err(|err| err.to_string())?;
  }
  conn
    .execute(
      "CREATE TABLE IF NOT EXISTS dataset_rows (\
        id INTEGER PRIMARY KEY,\
        name TEXT,\
        club TEXT,\
        pos TEXT,\
        age REAL,\
        minutes REAL,\
        height_in REAL,\
        raw_json TEXT NOT NULL\
      )",
      [],
    )
    .map_err(|err| err.to_string())?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_rows_age ON dataset_rows(age)", [])
    .map_err(|err| err.to_string())?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_rows_minutes ON dataset_rows(minutes)", [])
    .map_err(|err| err.to_string())?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_rows_pos ON dataset_rows(pos)", [])
    .map_err(|err| err.to_string())?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_rows_name ON dataset_rows(name)", [])
    .map_err(|err| err.to_string())?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_rows_club ON dataset_rows(club)", [])
    .map_err(|err| err.to_string())?;
  conn
    .execute(
      "CREATE TABLE IF NOT EXISTS metric_cache (\
        key TEXT PRIMARY KEY,\
        value_json TEXT NOT NULL,\
        saved_at INTEGER NOT NULL\
      )",
      [],
    )
    .map_err(|err| err.to_string())?;
  Ok(conn)
}

fn load_rows_from_table(conn: &Connection) -> Result<Vec<serde_json::Value>, String> {
  let mut stmt = conn
    .prepare("SELECT raw_json FROM dataset_rows ORDER BY id")
    .map_err(|err| err.to_string())?;
  let rows = stmt
    .query_map([], |row| {
      let raw_json: String = row.get(0)?;
      Ok(raw_json)
    })
    .map_err(|err| err.to_string())?;

  let mut out = Vec::new();
  for item in rows {
    let raw = item.map_err(|err| err.to_string())?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|err| err.to_string())?;
    out.push(value);
  }
  Ok(out)
}

fn extract_string(value: &serde_json::Value, key: &str) -> Option<String> {
  match value.get(key) {
    Some(serde_json::Value::String(s)) => Some(s.clone()),
    Some(serde_json::Value::Number(n)) => Some(n.to_string()),
    Some(serde_json::Value::Bool(b)) => Some(b.to_string()),
    _ => None,
  }
}

fn extract_f64(value: &serde_json::Value, key: &str) -> Option<f64> {
  match value.get(key) {
    Some(serde_json::Value::Number(n)) => n.as_f64(),
    Some(serde_json::Value::String(s)) => s.parse::<f64>().ok(),
    _ => None,
  }
}

const ALLOWED_IMPORT_EXTENSIONS: [&str; 3] = ["csv", "html", "htm"];

#[tauri::command]
fn read_import_file(path: String) -> Result<String, String> {
  let path_buf = PathBuf::from(&path);
  let ext = path_buf
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| e.to_lowercase())
    .unwrap_or_default();
  if !ALLOWED_IMPORT_EXTENSIONS.contains(&ext.as_str()) {
    return Err(format!("Unsupported file type: .{}", ext));
  }
  fs::read_to_string(&path_buf).map_err(|err| err.to_string())
}

#[tauri::command]
fn save_dataset(app: AppHandle, payload: DatasetPayload) -> Result<(), String> {
  let mut conn = open_db(&app)?;
  let columns_json = serde_json::to_string(&payload.columns).map_err(|err| err.to_string())?;
  let row_count = payload.rows.len() as i64;
  let column_count = payload.columns.len() as i64;

  let tx = conn.transaction().map_err(|err| err.to_string())?;
  tx.execute("DELETE FROM dataset_rows", []).map_err(|err| err.to_string())?;
  {
    let mut stmt = tx
      .prepare(
        "INSERT INTO dataset_rows (id, name, club, pos, age, minutes, height_in, raw_json)\
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
      )
      .map_err(|err| err.to_string())?;

    for (idx, row) in payload.rows.iter().enumerate() {
      let raw_json = serde_json::to_string(row).map_err(|err| err.to_string())?;
      let index = payload.row_index.as_ref().and_then(|v| v.get(idx));
      let name = index.and_then(|i| i.name.clone()).or_else(|| extract_string(row, "Name"));
      let club = index.and_then(|i| i.club.clone()).or_else(|| extract_string(row, "Club"));
      let pos = index.and_then(|i| i.pos.clone()).or_else(|| extract_string(row, "Pos"));
      let age = index.and_then(|i| i.age).or_else(|| extract_f64(row, "Age"));
      let minutes = index.and_then(|i| i.minutes).or_else(|| extract_f64(row, "Minutes"));
      let height_in = index.and_then(|i| i.height_in);

      let row_id = (idx + 1) as i64;
      stmt
        .execute(params![row_id, name, club, pos, age, minutes, height_in, raw_json])
        .map_err(|err| err.to_string())?;
    }
  }

  tx.execute(
      "INSERT INTO dataset_cache (key, columns_json, row_count, column_count, saved_at)\
       VALUES (?1, ?2, ?3, ?4, ?5)\
       ON CONFLICT(key) DO UPDATE SET\
         columns_json = excluded.columns_json,\
         row_count = excluded.row_count,\
         column_count = excluded.column_count,\
         saved_at = excluded.saved_at",
      params![DATASET_KEY, columns_json, row_count, column_count, payload.saved_at],
    )
    .map_err(|err| err.to_string())?;
  tx.commit().map_err(|err| err.to_string())?;
  Ok(())
}

#[tauri::command]
fn load_dataset(app: AppHandle) -> Result<Option<DatasetPayload>, String> {
  let conn = open_db(&app)?;
  let mut stmt = conn
    .prepare("SELECT columns_json, saved_at FROM dataset_cache WHERE key = ?1")
    .map_err(|err| err.to_string())?;
  let result = stmt.query_row(params![DATASET_KEY], |row| {
    let columns_json: String = row.get(0)?;
    let saved_at: i64 = row.get(1)?;
    Ok((columns_json, saved_at))
  });

  match result {
    Ok((columns_json, saved_at)) => {
      let columns: Vec<String> = serde_json::from_str(&columns_json).map_err(|err| err.to_string())?;
      let rows = load_rows_from_table(&conn)?;
      Ok(Some(DatasetPayload { rows, columns, saved_at, row_index: None }))
    }
    Err(rusqlite::Error::QueryReturnedNoRows) => {
      let rows = load_rows_from_table(&conn)?;
      if rows.is_empty() {
        return Ok(None);
      }
      let mut columns: Vec<String> = Vec::new();
      if let Some(first) = rows.get(0) {
        if let Some(obj) = first.as_object() {
          columns = obj.keys().cloned().collect();
        }
      }
      Ok(Some(DatasetPayload { rows, columns, saved_at: 0, row_index: None }))
    }
    Err(err) => Err(err.to_string()),
  }
}

#[tauri::command]
fn clear_dataset(app: AppHandle) -> Result<(), String> {
  let conn = open_db(&app)?;
  conn
    .execute("DELETE FROM dataset_cache WHERE key = ?1", params![DATASET_KEY])
    .map_err(|err| err.to_string())?;
  Ok(())
}

#[tauri::command]
fn dataset_status(app: AppHandle) -> Result<DatasetStatus, String> {
  let conn = open_db(&app)?;
  let mut stmt = conn
    .prepare("SELECT column_count, saved_at FROM dataset_cache WHERE key = ?1")
    .map_err(|err| err.to_string())?;
  let result = stmt.query_row(params![DATASET_KEY], |row| {
    let column_count: i64 = row.get(0)?;
    let saved_at: i64 = row.get(1)?;
    Ok((column_count, saved_at))
  });

  match result {
    Ok((column_count, saved_at)) => {
      let row_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM dataset_rows", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;
      Ok(DatasetStatus {
      has_dataset: true,
      row_count,
      column_count,
      saved_at: Some(saved_at),
    })
    }
    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(DatasetStatus {
      has_dataset: false,
      row_count: 0,
      column_count: 0,
      saved_at: None,
    }),
    Err(err) => Err(err.to_string()),
  }
}

#[tauri::command]
fn query_dataset(app: AppHandle, query: DatasetQuery) -> Result<Vec<serde_json::Value>, String> {
  let conn = open_db(&app)?;
  let mut conditions: Vec<String> = Vec::new();
  let mut params_list: Vec<rusqlite::types::Value> = Vec::new();

  if let Some(min_minutes) = query.min_minutes {
    conditions.push("minutes >= ?".to_string());
    params_list.push(min_minutes.into());
  }
  if let Some(max_age) = query.max_age {
    conditions.push("age <= ?".to_string());
    params_list.push(max_age.into());
  }
  if let Some(min_height) = query.min_height_in {
    conditions.push("height_in >= ?".to_string());
    params_list.push(min_height.into());
  }
  if let Some(max_height) = query.max_height_in {
    conditions.push("height_in <= ?".to_string());
    params_list.push(max_height.into());
  }
  if let Some(tokens) = query.pos {
    let filtered: Vec<String> = tokens.into_iter().filter(|t| !t.trim().is_empty()).collect();
    if !filtered.is_empty() {
      let like_bits: Vec<String> = filtered.iter().map(|_| "pos LIKE ?".to_string()).collect();
      conditions.push(format!("({})", like_bits.join(" OR ")));
      for token in filtered {
        params_list.push(format!("%{}%", token).into());
      }
    }
  }
  if let Some(search) = query.search {
    let trimmed = search.trim().to_lowercase();
    if !trimmed.is_empty() {
      conditions.push("(lower(name) LIKE ? OR lower(club) LIKE ? OR lower(pos) LIKE ?)".to_string());
      let pattern = format!("%{}%", trimmed);
      params_list.push(pattern.clone().into());
      params_list.push(pattern.clone().into());
      params_list.push(pattern.into());
    }
  }

  let where_clause = if conditions.is_empty() {
    "".to_string()
  } else {
    format!(" WHERE {}", conditions.join(" AND "))
  };
  let sql = format!("SELECT raw_json FROM dataset_rows{}", where_clause);
  let mut stmt = conn.prepare(&sql).map_err(|err| err.to_string())?;

  let rows = stmt
    .query_map(rusqlite::params_from_iter(params_list), |row| {
      let raw_json: String = row.get(0)?;
      Ok(raw_json)
    })
    .map_err(|err| err.to_string())?;

  let mut out = Vec::new();
  for item in rows {
    let raw = item.map_err(|err| err.to_string())?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|err| err.to_string())?;
    out.push(value);
  }
  Ok(out)
}

#[tauri::command]
fn get_metric_cache(app: AppHandle, key: String) -> Result<Option<serde_json::Value>, String> {
  let conn = open_db(&app)?;
  let mut stmt = conn
    .prepare("SELECT value_json FROM metric_cache WHERE key = ?1")
    .map_err(|err| err.to_string())?;
  let result = stmt.query_row(params![key], |row| {
    let value_json: String = row.get(0)?;
    Ok(value_json)
  });

  match result {
    Ok(value_json) => {
      let value: serde_json::Value = serde_json::from_str(&value_json).map_err(|err| err.to_string())?;
      Ok(Some(value))
    }
    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
    Err(err) => Err(err.to_string()),
  }
}

#[tauri::command]
fn set_metric_cache(app: AppHandle, key: String, value: serde_json::Value) -> Result<(), String> {
  let conn = open_db(&app)?;
  let value_json = serde_json::to_string(&value).map_err(|err| err.to_string())?;
  let saved_at = Utc::now().timestamp();
  conn
    .execute(
      "INSERT INTO metric_cache (key, value_json, saved_at)\
       VALUES (?1, ?2, ?3)\
       ON CONFLICT(key) DO UPDATE SET\
         value_json = excluded.value_json,\
         saved_at = excluded.saved_at",
      params![key, value_json, saved_at],
    )
    .map_err(|err| err.to_string())?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_window_state::Builder::default().build(),
    )
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
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
    .invoke_handler(tauri::generate_handler![
      read_import_file,
      save_dataset,
      load_dataset,
      clear_dataset,
      dataset_status,
      query_dataset,
      get_metric_cache,
      set_metric_cache
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
