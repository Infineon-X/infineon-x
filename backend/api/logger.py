import sqlite3
import json
import os
import shutil
from datetime import datetime
import time
from pathlib import Path

# Configuration
DB_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'face_recognition_logs.db')
BACKUP_DIR = os.path.expanduser('~/.backup_infineon-x')

def init_db():
    """Initialize the SQLite database and create table if not exists"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            endpoint TEXT,
            event_type TEXT,
            success INTEGER,
            message TEXT,
            details_json TEXT
        )
        ''')
        
        conn.commit()
        conn.close()
        print(f"✅ Database initialized at {DB_FILE}")
        
        # Run backup check on init
        backup_db()
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")

def backup_db():
    """Perform a daily backup of the database"""
    try:
        if not os.path.exists(DB_FILE):
            return

        os.makedirs(BACKUP_DIR, exist_ok=True)
        
        # Check existing backups
        today_str = datetime.now().strftime('%Y-%m-%d')
        backup_path = os.path.join(BACKUP_DIR, f"face_recognition_logs_{today_str}.db")
        
        if not os.path.exists(backup_path):
            print(f"📦 Creating backup at {backup_path}...")
            shutil.copy2(DB_FILE, backup_path)
            print("✅ Backup complete")
            
            # Optional: Cleanup old backups (keep last 7 days)
            cleanup_old_backups()
        else:
            # Backup for today already exists
            pass
            
    except Exception as e:
        print(f"⚠️ Database backup failed: {e}")

def cleanup_old_backups():
    """Keep only the last 7 days of backups"""
    try:
        files = sorted(Path(BACKUP_DIR).glob('face_recognition_logs_*.db'))
        if len(files) > 7:
            for f in files[:-7]:
                os.remove(f)
                print(f"🗑️ Removed old backup: {f.name}")
    except Exception as e:
        print(f"⚠️ Cleanup failed: {e}")

def log_event(endpoint, event_type, success, message, details=None):
    """Log an event to the database"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        timestamp = datetime.now().isoformat()
        details_json = json.dumps(details) if details else '{}'
        success_int = 1 if success else 0
        
        cursor.execute('''
        INSERT INTO logs (timestamp, endpoint, event_type, success, message, details_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (timestamp, endpoint, event_type, success_int, message, details_json))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        # Don't crash the app if logging fails, just print error
        print(f"❌ Logging failed: {e}")

def get_logs(limit=50, offset=0, endpoint=None, event_type=None, success=None):
    """Retrieve logs with filtering"""
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row  # Allow accessing columns by name
        cursor = conn.cursor()
        
        query = "SELECT * FROM logs WHERE 1=1"
        params = []
        
        if endpoint:
            query += " AND endpoint = ?"
            params.append(endpoint)
            
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)
            
        if success is not None:
            query += " AND success = ?"
            params.append(1 if success else 0)
            
        # Get total count for pagination
        count_query = query.replace("SELECT *", "SELECT COUNT(*)", 1)
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # Get data
        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        logs = []
        for row in rows:
            log = dict(row)
            # Parse JSON back to object
            try:
                log['details'] = json.loads(log['details_json'])
            except:
                log['details'] = {}
            del log['details_json'] # Remove string version
            logs.append(log)
            
        conn.close()
        
        return {
            'logs': logs,
            'total': total,
            'limit': limit,
            'offset': offset
        }
        
    except Exception as e:
        print(f"❌ Error retrieving logs: {e}")
        return {'logs': [], 'total': 0, 'error': str(e)}
