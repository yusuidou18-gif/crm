"""
AI Quote Analysis Service using OpenAI GPT-4o.
Parses natural language / images to extract quote line items.
"""
import os
import json
import re
from typing import List, Optional
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

SYSTEM_PROMPT = """あなたは住宅リフォーム（水回り・内装）専門の見積アシスタントです。
ユーザーの入力（自然言語・画像・PDF内容）を解析し、見積明細を JSON 形式で返してください。

出力フォーマット（JSON配列）:
[
  {
    "name": "品名・工事名",
    "manufacturer": "メーカー名（不明な場合は空文字）",
    "model_number": "型番（不明な場合は空文字）",
    "category_name": "カテゴリ名（トイレ/洗面/バス/キッチン/給湯器/内装/その他）",
    "quantity": 数量（数値）,
    "unit": "単位（式/個/m/m2等）",
    "unit_price": 販売単価（数値、不明な場合は0）,
    "purchase_price": 仕入単価（不明な場合は0）,
    "construction_cost": 施工費（数値、不明な場合は0）,
    "note": "備考（オプション情報など）",
    "selected_options": [
      {
        "name": "オプション名",
        "unit_price": 単価,
        "purchase_price": 0,
        "construction_cost": 0,
        "quantity": 1
      }
    ]
  }
]

ルール:
- 必ずJSONのみを返す（説明文・コードブロック不要）
- 金額は税抜き円単位の数値
- 不明な金額は0
- カテゴリは必ずいずれか1つ
- 施工費は商品単価と別途計上する
- 壁紙・クロスは「内装」カテゴリ
- 食洗機・オーブン等は商品のselected_optionsに含める
"""


async def analyze_text(text: str, image_base64: Optional[str] = None) -> dict:
    """
    Analyze renovation request text (and optionally an image) using GPT-4o.
    Returns a dict with 'items' (list of QuoteItem-compatible dicts) and 'raw_response'.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if image_base64:
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": text or "この画像からリフォーム工事の見積明細を抽出してください。"},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}", "detail": "high"},
                },
            ],
        })
    else:
        messages.append({"role": "user", "content": text})

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.2,
        max_tokens=2000,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code blocks if present
    clean = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    clean = re.sub(r"\s*```$", "", clean, flags=re.MULTILINE)

    try:
        items_raw = json.loads(clean)
    except json.JSONDecodeError:
        # Attempt to extract JSON array from text
        match = re.search(r"\[.*\]", clean, re.DOTALL)
        if match:
            items_raw = json.loads(match.group())
        else:
            items_raw = []

    # Normalize items to QuoteItemCreate-compatible dicts
    items = []
    for item in items_raw:
        normalized = {
            "name": item.get("name", "工事項目"),
            "manufacturer": item.get("manufacturer", ""),
            "model_number": item.get("model_number", ""),
            "quantity": float(item.get("quantity", 1)),
            "unit": item.get("unit", "式"),
            "unit_price": float(item.get("unit_price", 0)),
            "purchase_price": float(item.get("purchase_price", 0)),
            "construction_cost": float(item.get("construction_cost", 0)),
            "note": item.get("note", ""),
            "selected_options": [
                {
                    "name": o.get("name", ""),
                    "unit_price": float(o.get("unit_price", 0)),
                    "purchase_price": float(o.get("purchase_price", 0)),
                    "construction_cost": float(o.get("construction_cost", 0)),
                    "quantity": float(o.get("quantity", 1)),
                }
                for o in item.get("selected_options", [])
            ],
            # category_name is informational; frontend maps to category_id
            "category_name": item.get("category_name", "その他"),
        }
        items.append(normalized)

    return {"items": items, "raw_response": raw}
