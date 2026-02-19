from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
import models
import schemas
from database import get_db
from services.pdf_service import generate_quote_pdf

router = APIRouter(prefix="/quotes", tags=["quotes"])


def _generate_quote_number(db: Session) -> str:
    today = datetime.now()
    prefix = f"Q{today.strftime('%Y%m')}"
    count = (
        db.query(models.Quote)
        .filter(models.Quote.quote_number.like(f"{prefix}%"))
        .count()
    )
    return f"{prefix}-{count + 1:04d}"


def _load_quote(db: Session, quote_id: int) -> models.Quote:
    quote = (
        db.query(models.Quote)
        .options(
            joinedload(models.Quote.customer),
            joinedload(models.Quote.staff),
            joinedload(models.Quote.items).joinedload(models.QuoteItem.category),
        )
        .filter(models.Quote.id == quote_id)
        .first()
    )
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.get("/", response_model=List[schemas.QuoteListOut])
def list_quotes(
    status: str = None,
    staff_id: int = None,
    customer_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(models.Quote).options(
        joinedload(models.Quote.customer),
        joinedload(models.Quote.staff),
        joinedload(models.Quote.items),
    )
    if status:
        q = q.filter(models.Quote.status == status)
    if staff_id:
        q = q.filter(models.Quote.staff_id == staff_id)
    if customer_id:
        q = q.filter(models.Quote.customer_id == customer_id)
    quotes = q.order_by(models.Quote.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for quote in quotes:
        result.append(
            schemas.QuoteListOut(
                id=quote.id,
                quote_number=quote.quote_number,
                title=quote.title,
                status=quote.status,
                customer=quote.customer,
                staff=quote.staff,
                total_amount=quote.total_amount,
                created_at=quote.created_at,
                updated_at=quote.updated_at,
            )
        )
    return result


@router.post("/", response_model=schemas.QuoteOut)
def create_quote(data: schemas.QuoteCreate, db: Session = Depends(get_db)):
    items_data = data.items
    quote_data = data.model_dump(exclude={"items"})
    quote = models.Quote(**quote_data, quote_number=_generate_quote_number(db))
    db.add(quote)
    db.flush()

    for i, item_data in enumerate(items_data):
        item_dict = item_data.model_dump()
        # Serialize selected_options to plain dicts
        item_dict["selected_options"] = [opt.model_dump() for opt in item_data.selected_options]
        item_dict["sort_order"] = item_dict.get("sort_order", i)
        item = models.QuoteItem(**item_dict, quote_id=quote.id)
        db.add(item)

    db.commit()
    return _load_quote(db, quote.id)


@router.get("/{quote_id}", response_model=schemas.QuoteOut)
def get_quote(quote_id: int, db: Session = Depends(get_db)):
    quote = _load_quote(db, quote_id)
    return _build_quote_out(quote)


@router.put("/{quote_id}", response_model=schemas.QuoteOut)
def update_quote(quote_id: int, data: schemas.QuoteUpdate, db: Session = Depends(get_db)):
    quote = db.query(models.Quote).filter(models.Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    update_data = data.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    for key, value in update_data.items():
        setattr(quote, key, value)

    if items_data is not None:
        # Replace all items
        db.query(models.QuoteItem).filter(models.QuoteItem.quote_id == quote_id).delete()
        for i, item_data in enumerate(items_data):
            item_dict = item_data if isinstance(item_data, dict) else item_data.model_dump()
            if "selected_options" in item_dict and item_dict["selected_options"]:
                item_dict["selected_options"] = [
                    opt.model_dump() if hasattr(opt, "model_dump") else opt
                    for opt in item_dict["selected_options"]
                ]
            item_dict.setdefault("sort_order", i)
            item = models.QuoteItem(**item_dict, quote_id=quote_id)
            db.add(item)

    db.commit()
    return _build_quote_out(_load_quote(db, quote_id))


@router.delete("/{quote_id}")
def delete_quote(quote_id: int, db: Session = Depends(get_db)):
    quote = db.query(models.Quote).filter(models.Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(quote)
    db.commit()
    return {"ok": True}


@router.get("/{quote_id}/pdf")
def download_quote_pdf(quote_id: int, db: Session = Depends(get_db)):
    quote = _load_quote(db, quote_id)
    pdf_bytes = generate_quote_pdf(quote)
    filename = f"見積書_{quote.quote_number or quote_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_quote_out(quote: models.Quote) -> schemas.QuoteOut:
    items_out = []
    for item in quote.items:
        opts = item.selected_options or []
        items_out.append(
            schemas.QuoteItemOut(
                id=item.id,
                quote_id=item.quote_id,
                product_id=item.product_id,
                category_id=item.category_id,
                name=item.name,
                manufacturer=item.manufacturer,
                model_number=item.model_number,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=item.unit_price,
                purchase_price=item.purchase_price,
                construction_cost=item.construction_cost,
                selected_options=[schemas.SelectedOption(**o) for o in opts],
                note=item.note,
                sort_order=item.sort_order,
                subtotal=item.subtotal,
                total_purchase=item.total_purchase,
            )
        )
    return schemas.QuoteOut(
        id=quote.id,
        quote_number=quote.quote_number,
        customer_id=quote.customer_id,
        staff_id=quote.staff_id,
        title=quote.title,
        status=quote.status,
        notes=quote.notes,
        valid_until=quote.valid_until,
        discount_amount=quote.discount_amount or 0,
        customer=quote.customer,
        staff=quote.staff,
        items=items_out,
        subtotal=quote.subtotal,
        total_amount=quote.total_amount,
        total_purchase=quote.total_purchase,
        gross_profit=quote.gross_profit,
        created_at=quote.created_at,
        updated_at=quote.updated_at,
    )
