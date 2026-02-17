"""从 capabilities.json 导入数据到 SQLite"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from api.database import init_db, insert_capabilities


def seed():
    data_file = Path(__file__).parent.parent / "data" / "capabilities.json"
    if not data_file.exists():
        print("data/capabilities.json 不存在，请先运行 pipeline")
        return
    items = json.loads(data_file.read_text())
    init_db()
    insert_capabilities(items)
    print(f"已导入 {len(items)} 条能力数据")


if __name__ == "__main__":
    seed()
