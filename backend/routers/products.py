from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import models
import schemas
from database import get_db

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[schemas.ProductOut])
def list_products(
    category_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(models.Product).options(
        joinedload(models.Product.category),
        joinedload(models.Product.options),
    )
    if category_id:
        q = q.filter(models.Product.category_id == category_id)
    return q.order_by(models.Product.name).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.ProductOut)
def create_product(data: schemas.ProductCreate, db: Session = Depends(get_db)):
    options_data = data.options
    product_data = data.model_dump(exclude={"options"})
    product = models.Product(**product_data)
    db.add(product)
    db.flush()
    for opt in options_data:
        option = models.ProductOption(**opt.model_dump(), product_id=product.id)
        db.add(option)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .options(joinedload(models.Product.category), joinedload(models.Product.options))
        .filter(models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, data: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    options_data = update_data.pop("options", None)

    for key, value in update_data.items():
        setattr(product, key, value)

    if options_data is not None:
        # Replace options
        db.query(models.ProductOption).filter(
            models.ProductOption.product_id == product_id
        ).delete()
        for opt in options_data:
            option = models.ProductOption(**opt, product_id=product_id)
            db.add(option)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"ok": True}
