from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'nirbani-dairy-secret-key-2026')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Nirbani Dairy Management System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# User Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    role: str = "staff"  # admin, staff, branch_manager

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: str
    role: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Farmer Models
class FarmerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    village: Optional[str] = ""
    bank_account: Optional[str] = ""
    ifsc_code: Optional[str] = ""
    aadhar_number: Optional[str] = ""

class FarmerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    address: str
    village: str
    bank_account: str
    ifsc_code: str
    aadhar_number: str
    total_milk: float
    total_due: float
    total_paid: float
    balance: float
    created_at: str
    is_active: bool

class FarmerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    aadhar_number: Optional[str] = None
    is_active: Optional[bool] = None

# Milk Collection Models
class MilkCollectionCreate(BaseModel):
    farmer_id: str
    shift: str  # morning, evening
    quantity: float  # in liters
    fat: float  # fat percentage
    snf: Optional[float] = None  # SNF percentage

class MilkCollectionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    farmer_id: str
    farmer_name: str
    shift: str
    quantity: float
    fat: float
    snf: float
    rate: float
    amount: float
    date: str
    created_at: str

# Rate Chart Models
class RateChartEntry(BaseModel):
    fat: float
    snf: float
    rate: float

class RateChartCreate(BaseModel):
    name: str
    entries: List[RateChartEntry]
    is_default: bool = False

class RateChartResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    entries: List[dict]
    is_default: bool
    created_at: str
    updated_at: str

# Payment Models
class PaymentCreate(BaseModel):
    farmer_id: str
    amount: float
    payment_mode: str  # cash, upi, bank
    notes: Optional[str] = ""

class PaymentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    farmer_id: str
    farmer_name: str
    amount: float
    payment_mode: str
    notes: str
    date: str
    created_at: str

# Dashboard Models
class DashboardStats(BaseModel):
    total_farmers: int
    active_farmers: int
    today_milk_quantity: float
    today_milk_amount: float
    today_morning_quantity: float
    today_evening_quantity: float
    avg_fat: float
    avg_snf: float
    total_pending_payments: float
    collections_count: int

# ==================== AUTH UTILITIES ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str, role: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== RATE CALCULATION ====================

async def get_milk_rate(fat: float, snf: float) -> float:
    """Calculate milk rate based on fat and SNF using default rate chart"""
    rate_chart = await db.rate_charts.find_one({"is_default": True}, {"_id": 0})
    
    if not rate_chart or not rate_chart.get("entries"):
        # Default formula: Rate = Fat * 6 + SNF * 2 (base formula for Indian dairy)
        return round(fat * 6 + snf * 2, 2)
    
    # Find closest matching rate from chart
    entries = rate_chart["entries"]
    closest_rate = None
    min_diff = float('inf')
    
    for entry in entries:
        diff = abs(entry["fat"] - fat) + abs(entry["snf"] - snf)
        if diff < min_diff:
            min_diff = diff
            closest_rate = entry["rate"]
    
    return closest_rate if closest_rate else round(fat * 6 + snf * 2, 2)

def calculate_snf(fat: float) -> float:
    """Calculate SNF from Fat using standard formula"""
    # Standard formula: SNF = 8.5 + (Fat / 4)
    return round(8.5 + (fat / 4), 2)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "password": hash_password(user.password),
        "role": user.role,
        "created_at": now,
        "is_active": True
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token(user_id, user.email, user.role)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user.name,
            email=user.email,
            phone=user.phone,
            role=user.role,
            created_at=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    token = create_access_token(user["id"], user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            phone=user["phone"],
            role=user["role"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        phone=current_user["phone"],
        role=current_user["role"],
        created_at=current_user["created_at"]
    )

# ==================== FARMER ROUTES ====================

@api_router.post("/farmers", response_model=FarmerResponse)
async def create_farmer(farmer: FarmerCreate, current_user: dict = Depends(get_current_user)):
    farmer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    farmer_doc = {
        "id": farmer_id,
        "name": farmer.name,
        "phone": farmer.phone,
        "address": farmer.address or "",
        "village": farmer.village or "",
        "bank_account": farmer.bank_account or "",
        "ifsc_code": farmer.ifsc_code or "",
        "aadhar_number": farmer.aadhar_number or "",
        "total_milk": 0.0,
        "total_due": 0.0,
        "total_paid": 0.0,
        "balance": 0.0,
        "created_at": now,
        "is_active": True
    }
    
    await db.farmers.insert_one(farmer_doc)
    
    return FarmerResponse(**farmer_doc)

@api_router.get("/farmers", response_model=List[FarmerResponse])
async def get_farmers(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"village": {"$regex": search, "$options": "i"}}
        ]
    if is_active is not None:
        query["is_active"] = is_active
    
    farmers = await db.farmers.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return [FarmerResponse(**f) for f in farmers]

@api_router.get("/farmers/{farmer_id}", response_model=FarmerResponse)
async def get_farmer(farmer_id: str, current_user: dict = Depends(get_current_user)):
    farmer = await db.farmers.find_one({"id": farmer_id}, {"_id": 0})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return FarmerResponse(**farmer)

@api_router.put("/farmers/{farmer_id}", response_model=FarmerResponse)
async def update_farmer(
    farmer_id: str,
    updates: FarmerUpdate,
    current_user: dict = Depends(get_current_user)
):
    farmer = await db.farmers.find_one({"id": farmer_id}, {"_id": 0})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.farmers.update_one({"id": farmer_id}, {"$set": update_data})
    
    updated_farmer = await db.farmers.find_one({"id": farmer_id}, {"_id": 0})
    return FarmerResponse(**updated_farmer)

@api_router.delete("/farmers/{farmer_id}")
async def delete_farmer(farmer_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.farmers.delete_one({"id": farmer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return {"message": "Farmer deleted successfully"}

@api_router.get("/farmers/{farmer_id}/ledger")
async def get_farmer_ledger(
    farmer_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    farmer = await db.farmers.find_one({"id": farmer_id}, {"_id": 0})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    # Get collections
    collection_query = {"farmer_id": farmer_id}
    if start_date:
        collection_query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in collection_query:
            collection_query["date"]["$lte"] = end_date
        else:
            collection_query["date"] = {"$lte": end_date}
    
    collections = await db.milk_collections.find(collection_query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Get payments
    payment_query = {"farmer_id": farmer_id}
    if start_date:
        payment_query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in payment_query:
            payment_query["date"]["$lte"] = end_date
        else:
            payment_query["date"] = {"$lte": end_date}
    
    payments = await db.payments.find(payment_query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    return {
        "farmer": FarmerResponse(**farmer),
        "collections": collections,
        "payments": payments,
        "summary": {
            "total_milk": farmer["total_milk"],
            "total_due": farmer["total_due"],
            "total_paid": farmer["total_paid"],
            "balance": farmer["balance"]
        }
    }

# ==================== MILK COLLECTION ROUTES ====================

@api_router.post("/collections", response_model=MilkCollectionResponse)
async def create_collection(
    collection: MilkCollectionCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get farmer
    farmer = await db.farmers.find_one({"id": collection.farmer_id}, {"_id": 0})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    # Calculate SNF if not provided
    snf = collection.snf if collection.snf else calculate_snf(collection.fat)
    
    # Get rate
    rate = await get_milk_rate(collection.fat, snf)
    
    # Calculate amount
    amount = round(collection.quantity * rate, 2)
    
    collection_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    
    collection_doc = {
        "id": collection_id,
        "farmer_id": collection.farmer_id,
        "farmer_name": farmer["name"],
        "shift": collection.shift,
        "quantity": collection.quantity,
        "fat": collection.fat,
        "snf": snf,
        "rate": rate,
        "amount": amount,
        "date": date_str,
        "created_at": now.isoformat()
    }
    
    await db.milk_collections.insert_one(collection_doc)
    
    # Update farmer totals
    await db.farmers.update_one(
        {"id": collection.farmer_id},
        {
            "$inc": {
                "total_milk": collection.quantity,
                "total_due": amount,
                "balance": amount
            }
        }
    )
    
    return MilkCollectionResponse(**collection_doc)

@api_router.get("/collections", response_model=List[MilkCollectionResponse])
async def get_collections(
    date: Optional[str] = None,
    farmer_id: Optional[str] = None,
    shift: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if date:
        query["date"] = date
    if farmer_id:
        query["farmer_id"] = farmer_id
    if shift:
        query["shift"] = shift
    
    collections = await db.milk_collections.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [MilkCollectionResponse(**c) for c in collections]

@api_router.get("/collections/today", response_model=List[MilkCollectionResponse])
async def get_today_collections(
    shift: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = {"date": today}
    if shift:
        query["shift"] = shift
    
    collections = await db.milk_collections.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [MilkCollectionResponse(**c) for c in collections]

@api_router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, current_user: dict = Depends(get_current_user)):
    collection = await db.milk_collections.find_one({"id": collection_id}, {"_id": 0})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Revert farmer totals
    await db.farmers.update_one(
        {"id": collection["farmer_id"]},
        {
            "$inc": {
                "total_milk": -collection["quantity"],
                "total_due": -collection["amount"],
                "balance": -collection["amount"]
            }
        }
    )
    
    await db.milk_collections.delete_one({"id": collection_id})
    return {"message": "Collection deleted successfully"}

# ==================== RATE CHART ROUTES ====================

@api_router.post("/rate-charts", response_model=RateChartResponse)
async def create_rate_chart(
    rate_chart: RateChartCreate,
    current_user: dict = Depends(get_current_user)
):
    chart_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # If this is default, unset other defaults
    if rate_chart.is_default:
        await db.rate_charts.update_many({}, {"$set": {"is_default": False}})
    
    entries = [e.model_dump() for e in rate_chart.entries]
    
    chart_doc = {
        "id": chart_id,
        "name": rate_chart.name,
        "entries": entries,
        "is_default": rate_chart.is_default,
        "created_at": now,
        "updated_at": now
    }
    
    await db.rate_charts.insert_one(chart_doc)
    return RateChartResponse(**chart_doc)

@api_router.get("/rate-charts", response_model=List[RateChartResponse])
async def get_rate_charts(current_user: dict = Depends(get_current_user)):
    charts = await db.rate_charts.find({}, {"_id": 0}).to_list(100)
    return [RateChartResponse(**c) for c in charts]

@api_router.get("/rate-charts/default", response_model=RateChartResponse)
async def get_default_rate_chart(current_user: dict = Depends(get_current_user)):
    chart = await db.rate_charts.find_one({"is_default": True}, {"_id": 0})
    if not chart:
        raise HTTPException(status_code=404, detail="No default rate chart found")
    return RateChartResponse(**chart)

@api_router.put("/rate-charts/{chart_id}", response_model=RateChartResponse)
async def update_rate_chart(
    chart_id: str,
    rate_chart: RateChartCreate,
    current_user: dict = Depends(get_current_user)
):
    existing = await db.rate_charts.find_one({"id": chart_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rate chart not found")
    
    if rate_chart.is_default:
        await db.rate_charts.update_many({}, {"$set": {"is_default": False}})
    
    entries = [e.model_dump() for e in rate_chart.entries]
    now = datetime.now(timezone.utc).isoformat()
    
    await db.rate_charts.update_one(
        {"id": chart_id},
        {
            "$set": {
                "name": rate_chart.name,
                "entries": entries,
                "is_default": rate_chart.is_default,
                "updated_at": now
            }
        }
    )
    
    updated = await db.rate_charts.find_one({"id": chart_id}, {"_id": 0})
    return RateChartResponse(**updated)

@api_router.delete("/rate-charts/{chart_id}")
async def delete_rate_chart(chart_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.rate_charts.delete_one({"id": chart_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rate chart not found")
    return {"message": "Rate chart deleted successfully"}

@api_router.post("/rate-charts/calculate-rate")
async def calculate_rate(
    fat: float,
    snf: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    if snf is None:
        snf = calculate_snf(fat)
    rate = await get_milk_rate(fat, snf)
    return {"fat": fat, "snf": snf, "rate": rate}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    farmer = await db.farmers.find_one({"id": payment.farmer_id}, {"_id": 0})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    
    payment_doc = {
        "id": payment_id,
        "farmer_id": payment.farmer_id,
        "farmer_name": farmer["name"],
        "amount": payment.amount,
        "payment_mode": payment.payment_mode,
        "notes": payment.notes or "",
        "date": date_str,
        "created_at": now.isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    
    # Update farmer totals
    await db.farmers.update_one(
        {"id": payment.farmer_id},
        {
            "$inc": {
                "total_paid": payment.amount,
                "balance": -payment.amount
            }
        }
    )
    
    return PaymentResponse(**payment_doc)

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(
    farmer_id: Optional[str] = None,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if farmer_id:
        query["farmer_id"] = farmer_id
    if date:
        query["date"] = date
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [PaymentResponse(**p) for p in payments]

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Revert farmer totals
    await db.farmers.update_one(
        {"id": payment["farmer_id"]},
        {
            "$inc": {
                "total_paid": -payment["amount"],
                "balance": payment["amount"]
            }
        }
    )
    
    await db.payments.delete_one({"id": payment_id})
    return {"message": "Payment deleted successfully"}

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Count farmers
    total_farmers = await db.farmers.count_documents({})
    active_farmers = await db.farmers.count_documents({"is_active": True})
    
    # Today's collections
    today_collections = await db.milk_collections.find({"date": today}, {"_id": 0}).to_list(1000)
    
    today_milk_quantity = sum(c["quantity"] for c in today_collections)
    today_milk_amount = sum(c["amount"] for c in today_collections)
    today_morning = sum(c["quantity"] for c in today_collections if c["shift"] == "morning")
    today_evening = sum(c["quantity"] for c in today_collections if c["shift"] == "evening")
    
    # Calculate averages
    if today_collections:
        avg_fat = sum(c["fat"] for c in today_collections) / len(today_collections)
        avg_snf = sum(c["snf"] for c in today_collections) / len(today_collections)
    else:
        avg_fat = 0
        avg_snf = 0
    
    # Pending payments (total balance across all farmers)
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$balance"}}}]
    balance_result = await db.farmers.aggregate(pipeline).to_list(1)
    total_pending = balance_result[0]["total"] if balance_result else 0
    
    return DashboardStats(
        total_farmers=total_farmers,
        active_farmers=active_farmers,
        today_milk_quantity=round(today_milk_quantity, 2),
        today_milk_amount=round(today_milk_amount, 2),
        today_morning_quantity=round(today_morning, 2),
        today_evening_quantity=round(today_evening, 2),
        avg_fat=round(avg_fat, 2),
        avg_snf=round(avg_snf, 2),
        total_pending_payments=round(total_pending, 2),
        collections_count=len(today_collections)
    )

@api_router.get("/dashboard/weekly-stats")
async def get_weekly_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    week_ago = today - timedelta(days=7)
    
    dates = []
    for i in range(7):
        d = week_ago + timedelta(days=i+1)
        dates.append(d.strftime("%Y-%m-%d"))
    
    stats = []
    for date in dates:
        collections = await db.milk_collections.find({"date": date}, {"_id": 0}).to_list(1000)
        quantity = sum(c["quantity"] for c in collections)
        amount = sum(c["amount"] for c in collections)
        stats.append({
            "date": date,
            "quantity": round(quantity, 2),
            "amount": round(amount, 2),
            "count": len(collections)
        })
    
    return stats

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports/daily")
async def get_daily_report(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    collections = await db.milk_collections.find({"date": date}, {"_id": 0}).to_list(1000)
    payments = await db.payments.find({"date": date}, {"_id": 0}).to_list(1000)
    
    total_quantity = sum(c["quantity"] for c in collections)
    total_amount = sum(c["amount"] for c in collections)
    morning_qty = sum(c["quantity"] for c in collections if c["shift"] == "morning")
    evening_qty = sum(c["quantity"] for c in collections if c["shift"] == "evening")
    total_paid = sum(p["amount"] for p in payments)
    
    return {
        "date": date,
        "collections": collections,
        "payments": payments,
        "summary": {
            "total_quantity": round(total_quantity, 2),
            "total_amount": round(total_amount, 2),
            "morning_quantity": round(morning_qty, 2),
            "evening_quantity": round(evening_qty, 2),
            "collection_count": len(collections),
            "total_paid": round(total_paid, 2),
            "payment_count": len(payments)
        }
    }

@api_router.get("/reports/farmer/{farmer_id}")
async def get_farmer_report(
    farmer_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    farmer = await db.farmers.find_one({"id": farmer_id}, {"_id": 0})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    query = {"farmer_id": farmer_id}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    collections = await db.milk_collections.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    payment_query = {"farmer_id": farmer_id}
    if start_date:
        payment_query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in payment_query:
            payment_query["date"]["$lte"] = end_date
        else:
            payment_query["date"] = {"$lte": end_date}
    
    payments = await db.payments.find(payment_query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    period_milk = sum(c["quantity"] for c in collections)
    period_amount = sum(c["amount"] for c in collections)
    period_paid = sum(p["amount"] for p in payments)
    
    return {
        "farmer": FarmerResponse(**farmer),
        "period": {"start": start_date, "end": end_date},
        "collections": collections,
        "payments": payments,
        "summary": {
            "total_milk": round(period_milk, 2),
            "total_amount": round(period_amount, 2),
            "total_paid": round(period_paid, 2),
            "balance": round(period_amount - period_paid, 2),
            "collection_count": len(collections),
            "payment_count": len(payments)
        }
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Nirbani Dairy Management System API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
