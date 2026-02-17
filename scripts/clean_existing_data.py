"""一次性脚本：清洗已有 capabilities.json 中的分类数据"""
import json
import sys
from pathlib import Path

# 把项目根目录加入 path，以便导入 scripts 模块
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.category_cleaner import clean_category, STANDARD_CATEGORIES

data_file = project_root / "data" / "capabilities.json"
items = json.loads(data_file.read_text())

fixed = 0
for item in items:
    old = item["category"]
    new = clean_category(old)
    if old != new:
        print(f"  {old!r} -> {new!r}")
        item["category"] = new
        fixed += 1

data_file.write_text(json.dumps(items, ensure_ascii=False, indent=2))
print(f"\n清洗完成，修复 {fixed} 个分类")

# 验证：确保没有非标准分类
from collections import Counter
cats = Counter(item["category"] for item in items)
non_standard = [c for c in cats if c not in STANDARD_CATEGORIES]
if non_standard:
    print(f"\n警告：仍有非标准分类: {non_standard}")
else:
    print(f"\n验证通过！所有 {len(items)} 个插件的分类都是标准分类")
    print("分类分布:")
    for cat, count in cats.most_common():
        print(f"  {cat}: {count}")
