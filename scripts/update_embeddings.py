"""增量更新 embedding

只为新增的插件生成 embedding，合并到现有 embeddings.json。
避免每次都为全部插件重新生成，节省 API 调用开销。
"""
import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# 路径常量
ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"
CAPABILITIES_FILE = DATA_DIR / "capabilities.json"
EMBEDDINGS_FILE = DATA_DIR / "embeddings.json"


def _load_existing_embeddings() -> dict:
    """读取现有 embeddings.json"""
    if not EMBEDDINGS_FILE.exists():
        return {}
    try:
        return json.loads(EMBEDDINGS_FILE.read_text())
    except (json.JSONDecodeError, TypeError):
        return {}


def _load_capabilities() -> list[dict]:
    """读取 capabilities.json"""
    if not CAPABILITIES_FILE.exists():
        print(f"错误：{CAPABILITIES_FILE} 不存在，请先运行 pipeline")
        return []
    return json.loads(CAPABILITIES_FILE.read_text())


def update_embeddings(
    force: bool = False,
    api_key: str | None = None,
    batch_size: int = 50,
):
    """增量更新 embedding

    Args:
        force: 强制为所有插件重新生成 embedding
        api_key: OpenAI API Key（默认从环境变量读取）
        batch_size: 每批处理的插件数量
    """
    api_key = api_key or os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        print("错误：未设置 OPENAI_API_KEY")
        return

    client = OpenAI(api_key=api_key)

    # 读取数据
    capabilities = _load_capabilities()
    if not capabilities:
        return

    existing_embeddings = {} if force else _load_existing_embeddings()
    existing_slugs = set(existing_embeddings.keys())

    # 找出需要生成 embedding 的插件
    new_items = [
        item for item in capabilities
        if item.get("slug") and item["slug"] not in existing_slugs
    ]

    if not new_items:
        print("没有新插件需要生成 embedding。")
        print(f"  当前 embedding 数量: {len(existing_embeddings)}")
        print(f"  当前插件数量: {len(capabilities)}")
        return

    print(f"需要生成 embedding: {len(new_items)} 个（已有 {len(existing_embeddings)} 个）")

    # 批量生成 embedding
    new_embeddings = {}
    for i in range(0, len(new_items), batch_size):
        batch = new_items[i:i + batch_size]
        texts = [
            f"{item['name']} {item.get('description', '')} {item.get('one_liner', '')}"
            for item in batch
        ]
        try:
            resp = client.embeddings.create(
                model="text-embedding-3-small",
                input=texts,
            )
            for item, emb in zip(batch, resp.data):
                new_embeddings[item["slug"]] = emb.embedding
            print(f"  [{min(i + batch_size, len(new_items))}/{len(new_items)}] 生成中...")
        except Exception as e:
            print(f"  批次 {i // batch_size + 1} 失败: {e}")
            # 记录失败的 slug
            for item in batch:
                print(f"    跳过: {item['slug']}")

    # 合并到现有 embedding
    merged = {**existing_embeddings, **new_embeddings}

    # 清理不再存在的 slug（capabilities 中已删除的插件）
    current_slugs = {item["slug"] for item in capabilities if "slug" in item}
    stale_slugs = set(merged.keys()) - current_slugs
    if stale_slugs:
        print(f"  清理 {len(stale_slugs)} 个已删除插件的 embedding")
        for slug in stale_slugs:
            del merged[slug]

    # 保存
    EMBEDDINGS_FILE.write_text(json.dumps(merged))
    print(f"完成！embedding 总数: {len(merged)}（新增 {len(new_embeddings)} 个）")


def main():
    parser = argparse.ArgumentParser(description="AgentStore 增量更新 embedding")
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制为所有插件重新生成 embedding",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="每批处理的插件数量（默认 50）",
    )
    args = parser.parse_args()

    update_embeddings(
        force=args.force,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
