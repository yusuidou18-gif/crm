from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey,
    Text, Enum, JSON, func
)
from sqlalchemy.orm import relationship
from database import Base
import enum


class QuoteStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    won = "won"
    lost = "lost"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="顧客名（法人名/個人名）")
    contact_person = Column(String(100), comment="担当者名")
    phone = Column(String(50))
    email = Column(String(200))
    address = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    quotes = relationship("Quote", back_populates="customer")


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="担当者名")
    email = Column(String(200))
    phone = Column(String(50))
    department = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    quotes = relationship("Quote", back_populates="staff")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="カテゴリ名（キッチン・バス等）")
    sort_order = Column(Integer, default=0)

    products = relationship("Product", back_populates="category")
    quote_items = relationship("QuoteItem", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name = Column(String(200), nullable=False, comment="商品名")
    manufacturer = Column(String(100), comment="メーカー名")
    model_number = Column(String(100), comment="型番")
    sale_price = Column(Float, default=0, comment="販売単価")
    purchase_price = Column(Float, default=0, comment="仕入単価")
    construction_cost = Column(Float, default=0, comment="標準施工費")
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="products")
    options = relationship("ProductOption", back_populates="product", cascade="all, delete-orphan")
    quote_items = relationship("QuoteItem", back_populates="product")


class ProductOption(Base):
    __tablename__ = "product_options"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String(200), nullable=False, comment="オプション名")
    sale_price = Column(Float, default=0, comment="販売単価")
    purchase_price = Column(Float, default=0, comment="仕入単価")
    construction_cost = Column(Float, default=0, comment="施工費")

    product = relationship("Product", back_populates="options")


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    quote_number = Column(String(50), unique=True, comment="見積番号")
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    title = Column(String(300), nullable=False, comment="見積タイトル")
    status = Column(
        Enum(QuoteStatus),
        default=QuoteStatus.draft,
        nullable=False,
        comment="ステータス"
    )
    notes = Column(Text, comment="備考")
    valid_until = Column(DateTime(timezone=True), comment="見積有効期限")
    discount_amount = Column(Float, default=0, comment="値引き額")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="quotes")
    staff = relationship("Staff", back_populates="quotes")
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan", order_by="QuoteItem.sort_order")

    @property
    def subtotal(self):
        return sum(item.subtotal for item in self.items)

    @property
    def total_amount(self):
        return self.subtotal - (self.discount_amount or 0)

    @property
    def total_purchase(self):
        return sum(item.total_purchase for item in self.items)

    @property
    def gross_profit(self):
        return self.total_amount - self.total_purchase


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, comment="商品マスタ参照（任意）")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String(300), nullable=False, comment="品名・工事名")
    manufacturer = Column(String(100), comment="メーカー")
    model_number = Column(String(100), comment="型番")
    quantity = Column(Float, default=1, comment="数量")
    unit = Column(String(20), default="式", comment="単位")
    unit_price = Column(Float, default=0, comment="販売単価")
    purchase_price = Column(Float, default=0, comment="仕入単価")
    construction_cost = Column(Float, default=0, comment="施工費")
    selected_options = Column(JSON, default=list, comment="選択オプション [{name, unit_price, purchase_price, construction_cost}]")
    note = Column(Text, comment="備考")
    sort_order = Column(Integer, default=0)

    quote = relationship("Quote", back_populates="items")
    product = relationship("Product", back_populates="quote_items")
    category = relationship("Category", back_populates="quote_items")

    @property
    def options_sale_total(self):
        if not self.selected_options:
            return 0
        return sum(opt.get("unit_price", 0) * opt.get("quantity", 1) for opt in self.selected_options)

    @property
    def subtotal(self):
        return (self.unit_price + self.construction_cost + self.options_sale_total) * self.quantity

    @property
    def total_purchase(self):
        opts_purchase = sum(opt.get("purchase_price", 0) * opt.get("quantity", 1) for opt in (self.selected_options or []))
        return (self.purchase_price + opts_purchase) * self.quantity
