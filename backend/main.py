from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import models
from database import engine, SessionLocal
from routers import customers, staff, categories, products, quotes, dashboard, ai_analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    models.Base.metadata.create_all(bind=engine)
    _seed_initial_data()
    yield


def _seed_initial_data():
    """Insert default categories and sample data if DB is empty."""
    db = SessionLocal()
    try:
        if db.query(models.Category).count() > 0:
            return

        categories = [
            models.Category(name="トイレ", sort_order=1),
            models.Category(name="洗面", sort_order=2),
            models.Category(name="バス", sort_order=3),
            models.Category(name="キッチン", sort_order=4),
            models.Category(name="給湯器", sort_order=5),
            models.Category(name="内装", sort_order=6),
            models.Category(name="その他", sort_order=7),
        ]
        db.add_all(categories)
        db.flush()

        cat_map = {c.name: c.id for c in categories}

        # Sample staff
        staff_list = [
            models.Staff(name="田中 一郎", email="tanaka@example.com", department="営業部"),
            models.Staff(name="鈴木 花子", email="suzuki@example.com", department="営業部"),
            models.Staff(name="佐藤 次郎", email="sato@example.com", department="営業部"),
        ]
        db.add_all(staff_list)
        db.flush()

        # Sample customers
        customers = [
            models.Customer(name="山田 太郎", contact_person="山田 太郎", phone="090-1234-5678", email="yamada@example.com", address="東京都渋谷区〇〇1-1-1"),
            models.Customer(name="株式会社スミス", contact_person="スミス 健", phone="03-1234-5678", email="smith@example.com", address="東京都新宿区〇〇2-2-2"),
        ]
        db.add_all(customers)
        db.flush()

        # Sample products
        products = [
            models.Product(
                category_id=cat_map["キッチン"], name="システムキッチン シエラS", manufacturer="LIXIL",
                model_number="SIERRA-S-2400", sale_price=650000, purchase_price=390000, construction_cost=120000,
                options=[
                    models.ProductOption(name="食洗機（深型）", sale_price=65000, purchase_price=38000, construction_cost=15000),
                    models.ProductOption(name="ガラストップコンロ", sale_price=45000, purchase_price=27000, construction_cost=8000),
                    models.ProductOption(name="浄水器付きシャワー水栓", sale_price=35000, purchase_price=20000, construction_cost=5000),
                ]
            ),
            models.Product(
                category_id=cat_map["バス"], name="ユニットバス アライズ", manufacturer="LIXIL",
                model_number="ARISE-1616", sale_price=480000, purchase_price=290000, construction_cost=180000,
                options=[
                    models.ProductOption(name="浴室暖房乾燥機", sale_price=55000, purchase_price=33000, construction_cost=12000),
                    models.ProductOption(name="サーモバスS（保温浴槽）", sale_price=28000, purchase_price=17000, construction_cost=0),
                ]
            ),
            models.Product(
                category_id=cat_map["トイレ"], name="サティスSタイプ", manufacturer="LIXIL",
                model_number="YBC-S10H+DT-S354H", sale_price=145000, purchase_price=87000, construction_cost=35000,
                options=[
                    models.ProductOption(name="手洗いカウンター", sale_price=25000, purchase_price=15000, construction_cost=8000),
                ]
            ),
            models.Product(
                category_id=cat_map["給湯器"], name="エコジョーズ GTH-C2461SAW3H", manufacturer="ノーリツ",
                model_number="GTH-C2461SAW3H", sale_price=185000, purchase_price=111000, construction_cost=35000,
            ),
            models.Product(
                category_id=cat_map["内装"], name="壁紙張替え（量産品）", manufacturer="",
                model_number="", sale_price=0, purchase_price=0, construction_cost=1200,
                description="1m²あたりの施工費",
            ),
        ]
        db.add_all(products)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
    finally:
        db.close()


app = FastAPI(
    title="湧水堂リフォーム CRM API",
    description="住宅リフォーム営業支援・見積管理システム",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router, prefix="/api")
app.include_router(staff.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(quotes.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ai_analysis.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "湧水堂リフォーム CRM API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
