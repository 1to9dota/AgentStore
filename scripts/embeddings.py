"""生成和管理 capability embedding，用于语义搜索"""
import json
import numpy as np
from pathlib import Path
from openai import OpenAI


def generate_embeddings(api_key: str):
    """为所有 capability 生成 embedding 并保存"""
    client = OpenAI(api_key=api_key)
    data_file = Path(__file__).parent.parent / "data" / "capabilities.json"
    items = json.loads(data_file.read_text())

    embeddings = {}
    # 批量处理，每批 50 个
    batch_size = 50
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        texts = [
            f"{item['name']} {item.get('description', '')} {item.get('one_liner', '')}"
            for item in batch
        ]
        resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=texts
        )
        for item, emb in zip(batch, resp.data):
            embeddings[item['slug']] = emb.embedding
        print(f"  [{i + len(batch)}/{len(items)}] embedding 生成中...")

    # 保存为 JSON 文件
    out_file = Path(__file__).parent.parent / "data" / "embeddings.json"
    out_file.write_text(json.dumps(embeddings))
    print(f"完成！{len(embeddings)} 个 embedding 已保存到 {out_file}")
    return embeddings


def search_similar(query: str, api_key: str, top_k: int = 10) -> list[tuple[str, float]]:
    """语义搜索：返回 [(slug, similarity_score), ...]"""
    client = OpenAI(api_key=api_key)

    # 生成 query embedding
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=[query]
    )
    query_emb = np.array(resp.data[0].embedding)

    # 加载已有 embedding
    emb_file = Path(__file__).parent.parent / "data" / "embeddings.json"
    if not emb_file.exists():
        return []
    all_embs = json.loads(emb_file.read_text())

    # 计算余弦相似度
    results = []
    for slug, emb in all_embs.items():
        emb_arr = np.array(emb)
        sim = np.dot(query_emb, emb_arr) / (np.linalg.norm(query_emb) * np.linalg.norm(emb_arr))
        results.append((slug, float(sim)))

    results.sort(key=lambda x: x[1], reverse=True)
    return results[:top_k]
