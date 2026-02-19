from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class QuoteStatusEnum(str, Enum):
    draft = "draft"
    submitted = "submitted"
    won = "won"
    lost = "lost"


# ── Customer ──────────────────────────────────────────────
class CustomerBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    name: Optional[str] = None

class CustomerOut(CustomerBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Staff ─────────────────────────────────────────────────
class StaffBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None

class StaffCreate(StaffBase):
    pass

class StaffUpdate(StaffBase):
    name: Optional[str] = None

class StaffOut(StaffBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Category ──────────────────────────────────────────────
class CategoryBase(BaseModel):
    name: str
    sort_order: int = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    model_config = {"from_attributes": True}


# ── ProductOption ─────────────────────────────────────────
class ProductOptionBase(BaseModel):
    name: str
    sale_price: float = 0
    purchase_price: float = 0
    construction_cost: float = 0

class ProductOptionCreate(ProductOptionBase):
    pass

class ProductOptionOut(ProductOptionBase):
    id: int
    product_id: int
    model_config = {"from_attributes": True}


# ── Product ───────────────────────────────────────────────
class ProductBase(BaseModel):
    category_id: int
    name: str
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    sale_price: float = 0
    purchase_price: float = 0
    construction_cost: float = 0
    description: Optional[str] = None

class ProductCreate(ProductBase):
    options: List[ProductOptionCreate] = []

class ProductUpdate(ProductBase):
    category_id: Optional[int] = None
    name: Optional[str] = None
    options: Optional[List[ProductOptionCreate]] = None

class ProductOut(ProductBase):
    id: int
    category: Optional[CategoryOut] = None
    options: List[ProductOptionOut] = []
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── QuoteItem ─────────────────────────────────────────────
class SelectedOption(BaseModel):
    name: str
    unit_price: float = 0
    purchase_price: float = 0
    construction_cost: float = 0
    quantity: float = 1

class QuoteItemBase(BaseModel):
    product_id: Optional[int] = None
    category_id: Optional[int] = None
    name: str
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    quantity: float = 1
    unit: str = "式"
    unit_price: float = 0
    purchase_price: float = 0
    construction_cost: float = 0
    selected_options: List[SelectedOption] = []
    note: Optional[str] = None
    sort_order: int = 0

class QuoteItemCreate(QuoteItemBase):
    pass

class QuoteItemUpdate(QuoteItemBase):
    name: Optional[str] = None

class QuoteItemOut(QuoteItemBase):
    id: int
    quote_id: int
    subtotal: float = 0
    total_purchase: float = 0
    model_config = {"from_attributes": True}


# ── Quote ─────────────────────────────────────────────────
class QuoteBase(BaseModel):
    customer_id: int
    staff_id: int
    title: str
    status: QuoteStatusEnum = QuoteStatusEnum.draft
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    discount_amount: float = 0

class QuoteCreate(QuoteBase):
    items: List[QuoteItemCreate] = []

class QuoteUpdate(BaseModel):
    customer_id: Optional[int] = None
    staff_id: Optional[int] = None
    title: Optional[str] = None
    status: Optional[QuoteStatusEnum] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    discount_amount: Optional[float] = None
    items: Optional[List[QuoteItemCreate]] = None

class QuoteOut(QuoteBase):
    id: int
    quote_number: Optional[str] = None
    customer: Optional[CustomerOut] = None
    staff: Optional[StaffOut] = None
    items: List[QuoteItemOut] = []
    subtotal: float = 0
    total_amount: float = 0
    total_purchase: float = 0
    gross_profit: float = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class QuoteListOut(BaseModel):
    id: int
    quote_number: Optional[str] = None
    title: str
    status: QuoteStatusEnum
    customer: Optional[CustomerOut] = None
    staff: Optional[StaffOut] = None
    total_amount: float = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── AI Analysis ───────────────────────────────────────────
class AIAnalysisRequest(BaseModel):
    text: str
    image_base64: Optional[str] = None

class AIAnalysisResult(BaseModel):
    items: List[QuoteItemCreate]
    raw_response: str


# ── Dashboard ─────────────────────────────────────────────
class StaffRanking(BaseModel):
    staff_id: int
    staff_name: str
    won_count: int
    won_amount: float
    submitted_count: int
    win_rate: float

class MonthlySales(BaseModel):
    month: str
    amount: float
    count: int

class CategorySales(BaseModel):
    category: str
    amount: float
    percentage: float

class DashboardData(BaseModel):
    total_quotes: int
    total_won: int
    total_won_amount: float
    win_rate: float
    staff_rankings: List[StaffRanking]
    monthly_sales: List[MonthlySales]
    category_sales: List[CategorySales]
    status_breakdown: dict
