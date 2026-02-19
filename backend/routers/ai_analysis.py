from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import base64
from typing import Optional
import models
import schemas
from database import get_db
from services.ai_service import analyze_text

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze", response_model=schemas.AIAnalysisResult)
async def analyze_quote_request(
    text: str = Form(""),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    if not text and not image:
        raise HTTPException(status_code=400, detail="text または image が必要です")

    image_base64 = None
    if image:
        contents = await image.read()
        image_base64 = base64.b64encode(contents).decode("utf-8")

    try:
        result = await analyze_text(text, image_base64)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI解析エラー: {str(e)}")

    # Map category_name to category_id
    categories = db.query(models.Category).all()
    cat_map = {c.name: c.id for c in categories}

    items_out = []
    for item in result["items"]:
        cat_name = item.pop("category_name", "その他")
        cat_id = cat_map.get(cat_name)
        item["category_id"] = cat_id
        item["product_id"] = None
        item["sort_order"] = len(items_out)
        items_out.append(schemas.QuoteItemCreate(**item))

    return schemas.AIAnalysisResult(items=items_out, raw_response=result["raw_response"])


@router.post("/analyze-json")
async def analyze_quote_json(data: schemas.AIAnalysisRequest, db: Session = Depends(get_db)):
    """JSON body variant (no file upload) for text-only requests."""
    try:
        result = await analyze_text(data.text, data.image_base64)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI解析エラー: {str(e)}")

    categories = db.query(models.Category).all()
    cat_map = {c.name: c.id for c in categories}

    items_out = []
    for item in result["items"]:
        cat_name = item.pop("category_name", "その他")
        cat_id = cat_map.get(cat_name)
        item["category_id"] = cat_id
        item["product_id"] = None
        item["sort_order"] = len(items_out)
        items_out.append(schemas.QuoteItemCreate(**item))

    return schemas.AIAnalysisResult(items=items_out, raw_response=result["raw_response"])
