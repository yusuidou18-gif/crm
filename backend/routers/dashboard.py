from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from datetime import datetime, timedelta
import models
import schemas
from database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=schemas.DashboardData)
def get_dashboard(db: Session = Depends(get_db)):
    total_quotes = db.query(models.Quote).count()
    won_quotes = db.query(models.Quote).filter(models.Quote.status == "won").all()
    submitted_count = db.query(models.Quote).filter(
        models.Quote.status.in_(["submitted", "won", "lost"])
    ).count()

    total_won = len(won_quotes)
    total_won_amount = sum(q.total_amount for q in won_quotes)
    win_rate = (total_won / submitted_count * 100) if submitted_count > 0 else 0

    # Status breakdown
    status_counts = (
        db.query(models.Quote.status, func.count(models.Quote.id))
        .group_by(models.Quote.status)
        .all()
    )
    status_breakdown = {status: count for status, count in status_counts}

    # Staff rankings
    all_staff = db.query(models.Staff).all()
    staff_rankings = []
    for staff in all_staff:
        staff_quotes = db.query(models.Quote).filter(models.Quote.staff_id == staff.id).all()
        won = [q for q in staff_quotes if q.status == "won"]
        submitted = [q for q in staff_quotes if q.status in ("submitted", "won", "lost")]
        won_amount = sum(q.total_amount for q in won)
        rate = (len(won) / len(submitted) * 100) if submitted else 0
        staff_rankings.append(
            schemas.StaffRanking(
                staff_id=staff.id,
                staff_name=staff.name,
                won_count=len(won),
                won_amount=won_amount,
                submitted_count=len(submitted),
                win_rate=round(rate, 1),
            )
        )
    staff_rankings.sort(key=lambda x: x.won_amount, reverse=True)

    # Monthly sales (last 12 months)
    monthly_sales = []
    now = datetime.now()
    for i in range(11, -1, -1):
        month_date = now - timedelta(days=30 * i)
        year = month_date.year
        month = month_date.month
        won_in_month = [
            q for q in won_quotes
            if q.created_at and q.created_at.year == year and q.created_at.month == month
        ]
        monthly_sales.append(
            schemas.MonthlySales(
                month=f"{year}/{month:02d}",
                amount=sum(q.total_amount for q in won_in_month),
                count=len(won_in_month),
            )
        )

    # Category sales breakdown
    all_categories = db.query(models.Category).all()
    category_totals = {}
    for q in won_quotes:
        for item in q.items:
            if item.category_id:
                cat_name = next(
                    (c.name for c in all_categories if c.id == item.category_id), "その他"
                )
            else:
                cat_name = "その他"
            category_totals[cat_name] = category_totals.get(cat_name, 0) + item.subtotal

    total_cat_amount = sum(category_totals.values()) or 1
    category_sales = [
        schemas.CategorySales(
            category=cat,
            amount=amount,
            percentage=round(amount / total_cat_amount * 100, 1),
        )
        for cat, amount in sorted(category_totals.items(), key=lambda x: -x[1])
    ]

    return schemas.DashboardData(
        total_quotes=total_quotes,
        total_won=total_won,
        total_won_amount=total_won_amount,
        win_rate=round(win_rate, 1),
        staff_rankings=staff_rankings,
        monthly_sales=monthly_sales,
        category_sales=category_sales,
        status_breakdown=status_breakdown,
    )
