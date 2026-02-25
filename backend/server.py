from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import HTMLResponse
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

# Import services
from sms_service import send_collection_sms, send_payment_sms
from bill_service import generate_farmer_bill_html, generate_daily_report_html

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
    payment_type: str = "payment"  # payment, advance, deduction
    notes: Optional[str] = ""

class PaymentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    farmer_id: str
    farmer_name: str
    amount: float
    payment_mode: str
    payment_type: str
    notes: str
    date: str
    created_at: str

# Customer Models
class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    customer_type: str = "retail"  # retail, wholesale
    gst_number: Optional[str] = ""

class CustomerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    address: str
    customer_type: str
    gst_number: str
    total_purchase: float
    total_paid: float
    balance: float
    created_at: str
    is_active: bool

# Sale Models
class SaleCreate(BaseModel):
    customer_id: str
    product: str  # milk, paneer, dahi, ghee, lassi
    quantity: float
    rate: float
    notes: Optional[str] = ""

class SaleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_id: str
    customer_name: str
    product: str
    quantity: float
    rate: float
    amount: float
    date: str
    created_at: str

# Product/Inventory Models
class ProductCreate(BaseModel):
    name: str
    unit: str  # kg, liter, piece
    stock: float = 0
    min_stock: float = 0
    rate: float = 0

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    unit: str
    stock: float
    min_stock: float
    rate: float
    updated_at: str

class StockUpdate(BaseModel):
    product_id: str
    quantity: float
    type: str  # in, out
    notes: Optional[str] = ""

# Expense Models
class ExpenseCreate(BaseModel):
    category: str  # salary, transport, electricity, maintenance, other
    amount: float
    description: Optional[str] = ""
    payment_mode: str = "cash"

class ExpenseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category: str
    amount: float
    description: str
    payment_mode: str
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
    
    # Duplicate entry protection - check if entry already exists for this farmer, date, and shift
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.milk_collections.find_one({
        "farmer_id": collection.farmer_id,
        "date": today,
        "shift": collection.shift
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Entry already exists for this farmer in {collection.shift} shift today. Delete existing entry first."
        )
    
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
    
    # Send SMS notification (async, don't block on failure)
    try:
        send_collection_sms(
            farmer_name=farmer["name"],
            farmer_phone=farmer["phone"],
            quantity=collection.quantity,
            fat=collection.fat,
            rate=rate,
            amount=amount,
            shift=collection.shift
        )
    except Exception as e:
        logger.warning(f"Failed to send collection SMS: {e}")
    
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
        "payment_type": payment.payment_type,
        "notes": payment.notes or "",
        "date": date_str,
        "created_at": now.isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    
    # Update farmer totals based on payment type
    if payment.payment_type == "advance":
        # Advance increases balance (farmer owes us)
        await db.farmers.update_one(
            {"id": payment.farmer_id},
            {"$inc": {"total_paid": payment.amount, "balance": payment.amount}}
        )
    elif payment.payment_type == "deduction":
        # Deduction reduces from due amount
        await db.farmers.update_one(
            {"id": payment.farmer_id},
            {"$inc": {"total_due": -payment.amount, "balance": -payment.amount}}
        )
    else:
        # Normal payment
        await db.farmers.update_one(
            {"id": payment.farmer_id},
            {"$inc": {"total_paid": payment.amount, "balance": -payment.amount}}
        )
    
    # Calculate new balance and send SMS
    new_balance = farmer["balance"] - payment.amount
    try:
        send_payment_sms(
            farmer_name=farmer["name"],
            farmer_phone=farmer["phone"],
            amount=payment.amount,
            payment_mode=payment.payment_mode,
            new_balance=new_balance
        )
    except Exception as e:
        logger.warning(f"Failed to send payment SMS: {e}")
    
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

# ==================== CUSTOMER ROUTES ====================

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    customer_doc = {
        "id": customer_id,
        "name": customer.name,
        "phone": customer.phone,
        "address": customer.address or "",
        "customer_type": customer.customer_type,
        "gst_number": customer.gst_number or "",
        "total_purchase": 0.0,
        "total_paid": 0.0,
        "balance": 0.0,
        "created_at": now,
        "is_active": True
    }
    
    await db.customers.insert_one(customer_doc)
    return CustomerResponse(**customer_doc)

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    if customer_type:
        query["customer_type"] = customer_type
    
    customers = await db.customers.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return [CustomerResponse(**c) for c in customers]

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(**customer)

# ==================== SALES ROUTES ====================

@api_router.post("/sales", response_model=SaleResponse)
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": sale.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    sale_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    amount = round(sale.quantity * sale.rate, 2)
    
    sale_doc = {
        "id": sale_id,
        "customer_id": sale.customer_id,
        "customer_name": customer["name"],
        "product": sale.product,
        "quantity": sale.quantity,
        "rate": sale.rate,
        "amount": amount,
        "notes": sale.notes or "",
        "date": date_str,
        "created_at": now.isoformat()
    }
    
    await db.sales.insert_one(sale_doc)
    
    # Update customer totals
    await db.customers.update_one(
        {"id": sale.customer_id},
        {"$inc": {"total_purchase": amount, "balance": amount}}
    )
    
    # Update product stock if exists
    await db.products.update_one(
        {"name": sale.product},
        {"$inc": {"stock": -sale.quantity}}
    )
    
    return SaleResponse(**sale_doc)

@api_router.get("/sales", response_model=List[SaleResponse])
async def get_sales(
    date: Optional[str] = None,
    customer_id: Optional[str] = None,
    product: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if date:
        query["date"] = date
    if customer_id:
        query["customer_id"] = customer_id
    if product:
        query["product"] = product
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [SaleResponse(**s) for s in sales]

@api_router.get("/sales/today")
async def get_today_sales(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sales = await db.sales.find({"date": today}, {"_id": 0}).to_list(1000)
    
    total_amount = sum(s["amount"] for s in sales)
    by_product = {}
    for s in sales:
        if s["product"] not in by_product:
            by_product[s["product"]] = {"quantity": 0, "amount": 0}
        by_product[s["product"]]["quantity"] += s["quantity"]
        by_product[s["product"]]["amount"] += s["amount"]
    
    return {
        "date": today,
        "total_sales": len(sales),
        "total_amount": round(total_amount, 2),
        "by_product": by_product,
        "sales": sales
    }

# ==================== INVENTORY/PRODUCT ROUTES ====================

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    product_doc = {
        "id": product_id,
        "name": product.name,
        "unit": product.unit,
        "stock": product.stock,
        "min_stock": product.min_stock,
        "rate": product.rate,
        "updated_at": now
    }
    
    await db.products.insert_one(product_doc)
    return ProductResponse(**product_doc)

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(100)
    return [ProductResponse(**p) for p in products]

@api_router.get("/products/low-stock")
async def get_low_stock_products(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(100)
    low_stock = [p for p in products if p["stock"] <= p["min_stock"]]
    return low_stock

@api_router.post("/products/stock-update")
async def update_stock(update: StockUpdate, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": update.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    quantity_change = update.quantity if update.type == "in" else -update.quantity
    now = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one(
        {"id": update.product_id},
        {"$inc": {"stock": quantity_change}, "$set": {"updated_at": now}}
    )
    
    # Log stock movement
    await db.stock_movements.insert_one({
        "id": str(uuid.uuid4()),
        "product_id": update.product_id,
        "product_name": product["name"],
        "quantity": update.quantity,
        "type": update.type,
        "notes": update.notes or "",
        "created_at": now
    })
    
    return {"message": "Stock updated successfully"}

# ==================== EXPENSE ROUTES ====================

@api_router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    
    expense_doc = {
        "id": expense_id,
        "category": expense.category,
        "amount": expense.amount,
        "description": expense.description or "",
        "payment_mode": expense.payment_mode,
        "date": date_str,
        "created_at": now.isoformat()
    }
    
    await db.expenses.insert_one(expense_doc)
    return ExpenseResponse(**expense_doc)

@api_router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    date: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if date:
        query["date"] = date
    if category:
        query["category"] = category
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [ExpenseResponse(**e) for e in expenses]

@api_router.get("/expenses/summary")
async def get_expense_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not start_date:
        today = datetime.now(timezone.utc)
        start_date = today.replace(day=1).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    expenses = await db.expenses.find(
        {"date": {"$gte": start_date, "$lte": end_date}}, {"_id": 0}
    ).to_list(1000)
    
    by_category = {}
    total = 0
    for e in expenses:
        cat = e["category"]
        if cat not in by_category:
            by_category[cat] = 0
        by_category[cat] += e["amount"]
        total += e["amount"]
    
    return {
        "period": {"start": start_date, "end": end_date},
        "total": round(total, 2),
        "by_category": by_category,
        "count": len(expenses)
    }

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

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

# ==================== ADVANCED REPORTS ====================

@api_router.get("/reports/fat-average")
async def get_fat_average_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get fat average report by farmer"""
    if not start_date:
        today = datetime.now(timezone.utc)
        start_date = today.replace(day=1).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    collections = await db.milk_collections.find(
        {"date": {"$gte": start_date, "$lte": end_date}}, {"_id": 0}
    ).to_list(10000)
    
    # Group by farmer
    farmer_data = {}
    for c in collections:
        fid = c["farmer_id"]
        if fid not in farmer_data:
            farmer_data[fid] = {
                "farmer_name": c["farmer_name"],
                "total_quantity": 0,
                "total_fat": 0,
                "total_snf": 0,
                "count": 0
            }
        farmer_data[fid]["total_quantity"] += c["quantity"]
        farmer_data[fid]["total_fat"] += c["fat"] * c["quantity"]
        farmer_data[fid]["total_snf"] += c["snf"] * c["quantity"]
        farmer_data[fid]["count"] += 1
    
    # Calculate weighted averages
    report = []
    for fid, data in farmer_data.items():
        if data["total_quantity"] > 0:
            avg_fat = data["total_fat"] / data["total_quantity"]
            avg_snf = data["total_snf"] / data["total_quantity"]
        else:
            avg_fat = 0
            avg_snf = 0
        
        report.append({
            "farmer_id": fid,
            "farmer_name": data["farmer_name"],
            "total_quantity": round(data["total_quantity"], 2),
            "avg_fat": round(avg_fat, 2),
            "avg_snf": round(avg_snf, 2),
            "entries": data["count"]
        })
    
    # Sort by average fat descending
    report.sort(key=lambda x: x["avg_fat"], reverse=True)
    
    return {
        "period": {"start": start_date, "end": end_date},
        "report": report
    }

@api_router.get("/reports/farmer-ranking")
async def get_farmer_ranking_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = "quantity",  # quantity, amount, fat
    current_user: dict = Depends(get_current_user)
):
    """Get farmer ranking report"""
    if not start_date:
        today = datetime.now(timezone.utc)
        start_date = today.replace(day=1).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    collections = await db.milk_collections.find(
        {"date": {"$gte": start_date, "$lte": end_date}}, {"_id": 0}
    ).to_list(10000)
    
    # Group by farmer
    farmer_data = {}
    for c in collections:
        fid = c["farmer_id"]
        if fid not in farmer_data:
            farmer_data[fid] = {
                "farmer_name": c["farmer_name"],
                "total_quantity": 0,
                "total_amount": 0,
                "total_fat_weighted": 0,
                "count": 0
            }
        farmer_data[fid]["total_quantity"] += c["quantity"]
        farmer_data[fid]["total_amount"] += c["amount"]
        farmer_data[fid]["total_fat_weighted"] += c["fat"] * c["quantity"]
        farmer_data[fid]["count"] += 1
    
    # Build ranking list
    ranking = []
    for fid, data in farmer_data.items():
        avg_fat = data["total_fat_weighted"] / data["total_quantity"] if data["total_quantity"] > 0 else 0
        ranking.append({
            "farmer_id": fid,
            "farmer_name": data["farmer_name"],
            "total_quantity": round(data["total_quantity"], 2),
            "total_amount": round(data["total_amount"], 2),
            "avg_fat": round(avg_fat, 2),
            "entries": data["count"]
        })
    
    # Sort based on criteria
    if sort_by == "quantity":
        ranking.sort(key=lambda x: x["total_quantity"], reverse=True)
    elif sort_by == "amount":
        ranking.sort(key=lambda x: x["total_amount"], reverse=True)
    elif sort_by == "fat":
        ranking.sort(key=lambda x: x["avg_fat"], reverse=True)
    
    # Add rank
    for i, r in enumerate(ranking):
        r["rank"] = i + 1
    
    return {
        "period": {"start": start_date, "end": end_date},
        "sort_by": sort_by,
        "ranking": ranking
    }

@api_router.get("/reports/monthly-summary")
async def get_monthly_summary_report(
    month: Optional[str] = None,  # Format: YYYY-MM
    current_user: dict = Depends(get_current_user)
):
    """Get monthly business summary"""
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    year, mon = month.split("-")
    start_date = f"{month}-01"
    
    # Calculate end date (last day of month)
    if int(mon) == 12:
        end_date = f"{int(year)+1}-01-01"
    else:
        end_date = f"{year}-{int(mon)+1:02d}-01"
    
    # Get all data for the month
    collections = await db.milk_collections.find(
        {"date": {"$gte": start_date, "$lt": end_date}}, {"_id": 0}
    ).to_list(10000)
    
    payments = await db.payments.find(
        {"date": {"$gte": start_date, "$lt": end_date}}, {"_id": 0}
    ).to_list(10000)
    
    sales = await db.sales.find(
        {"date": {"$gte": start_date, "$lt": end_date}}, {"_id": 0}
    ).to_list(10000)
    
    expenses = await db.expenses.find(
        {"date": {"$gte": start_date, "$lt": end_date}}, {"_id": 0}
    ).to_list(10000)
    
    # Calculate totals
    total_milk = sum(c["quantity"] for c in collections)
    total_milk_amount = sum(c["amount"] for c in collections)
    total_payments = sum(p["amount"] for p in payments)
    total_sales = sum(s["amount"] for s in sales)
    total_expenses = sum(e["amount"] for e in expenses)
    
    # Unique farmers
    unique_farmers = len(set(c["farmer_id"] for c in collections))
    
    # Average fat
    if collections:
        avg_fat = sum(c["fat"] * c["quantity"] for c in collections) / total_milk if total_milk > 0 else 0
    else:
        avg_fat = 0
    
    # Daily breakdown
    daily_data = {}
    for c in collections:
        if c["date"] not in daily_data:
            daily_data[c["date"]] = {"quantity": 0, "amount": 0}
        daily_data[c["date"]]["quantity"] += c["quantity"]
        daily_data[c["date"]]["amount"] += c["amount"]
    
    return {
        "month": month,
        "collection": {
            "total_milk": round(total_milk, 2),
            "total_amount": round(total_milk_amount, 2),
            "unique_farmers": unique_farmers,
            "avg_fat": round(avg_fat, 2),
            "entries": len(collections)
        },
        "payments": {
            "total": round(total_payments, 2),
            "count": len(payments)
        },
        "sales": {
            "total": round(total_sales, 2),
            "count": len(sales)
        },
        "expenses": {
            "total": round(total_expenses, 2),
            "count": len(expenses)
        },
        "profit": {
            "gross": round(total_sales - total_milk_amount, 2),
            "net": round(total_sales - total_milk_amount - total_expenses, 2)
        },
        "daily_breakdown": [
            {"date": d, **v} for d, v in sorted(daily_data.items())
        ]
    }

# ==================== BILL GENERATION ROUTES ====================

@api_router.get("/bills/farmer/{farmer_id}", response_class=HTMLResponse)
async def generate_farmer_bill(
    farmer_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate HTML bill for a farmer"""
    farmer = await db.farmers.find_one({"id": farmer_id}, {"_id": 0})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    # Default to current month if no dates
    if not start_date:
        today = datetime.now(timezone.utc)
        start_date = today.replace(day=1).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get collections
    collection_query = {"farmer_id": farmer_id, "date": {"$gte": start_date, "$lte": end_date}}
    collections = await db.milk_collections.find(collection_query, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # Get payments
    payment_query = {"farmer_id": farmer_id, "date": {"$gte": start_date, "$lte": end_date}}
    payments = await db.payments.find(payment_query, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # Get settings for dairy info
    settings = await db.settings.find_one({"type": "dairy_info"}, {"_id": 0}) or {}
    
    html = generate_farmer_bill_html(
        farmer=farmer,
        collections=collections,
        payments=payments,
        period_start=start_date,
        period_end=end_date,
        dairy_name=settings.get("dairy_name", "Nirbani Dairy"),
        dairy_phone=settings.get("dairy_phone", ""),
        dairy_address=settings.get("dairy_address", "")
    )
    
    return HTMLResponse(content=html)

@api_router.get("/bills/daily/{date}", response_class=HTMLResponse)
async def generate_daily_bill(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate HTML daily report"""
    collections = await db.milk_collections.find({"date": date}, {"_id": 0}).to_list(1000)
    payments = await db.payments.find({"date": date}, {"_id": 0}).to_list(1000)
    
    total_quantity = sum(c["quantity"] for c in collections)
    total_amount = sum(c["amount"] for c in collections)
    morning_qty = sum(c["quantity"] for c in collections if c["shift"] == "morning")
    evening_qty = sum(c["quantity"] for c in collections if c["shift"] == "evening")
    
    summary = {
        "total_quantity": total_quantity,
        "total_amount": total_amount,
        "morning_quantity": morning_qty,
        "evening_quantity": evening_qty
    }
    
    settings = await db.settings.find_one({"type": "dairy_info"}, {"_id": 0}) or {}
    
    html = generate_daily_report_html(
        date=date,
        collections=collections,
        payments=payments,
        summary=summary,
        dairy_name=settings.get("dairy_name", "Nirbani Dairy")
    )
    
    return HTMLResponse(content=html)

# ==================== SETTINGS ROUTES ====================

class DairySettings(BaseModel):
    dairy_name: str = "Nirbani Dairy"
    dairy_phone: str = ""
    dairy_address: str = ""
    sms_enabled: bool = False
    msg91_auth_key: str = ""
    msg91_sender_id: str = "NIRDRY"

class SMSTemplateSettings(BaseModel):
    collection_template: str = ""
    payment_template: str = ""

@api_router.get("/settings/dairy")
async def get_dairy_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"type": "dairy_info"}, {"_id": 0})
    if not settings:
        return {
            "dairy_name": "Nirbani Dairy",
            "dairy_phone": "",
            "dairy_address": "",
            "sms_enabled": False
        }
    return settings

@api_router.put("/settings/dairy")
async def update_dairy_settings(
    settings: DairySettings,
    current_user: dict = Depends(get_current_user)
):
    await db.settings.update_one(
        {"type": "dairy_info"},
        {"$set": {
            "type": "dairy_info",
            "dairy_name": settings.dairy_name,
            "dairy_phone": settings.dairy_phone,
            "dairy_address": settings.dairy_address,
            "sms_enabled": settings.sms_enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Settings updated successfully"}

@api_router.get("/settings/sms-templates")
async def get_sms_templates(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"type": "sms_templates"}, {"_id": 0})
    if not settings:
        return {
            "collection_template": "Nirbani Dairy: {farmer_name} जी, आपका {shift} का दूध: मात्रा: {quantity}L | फैट: {fat}% | राशि: ₹{amount}",
            "payment_template": "Nirbani Dairy: {farmer_name} जी, ₹{amount} का भुगतान प्राप्त। बकाया: ₹{balance}"
        }
    return settings

@api_router.put("/settings/sms-templates")
async def update_sms_templates(
    templates: SMSTemplateSettings,
    current_user: dict = Depends(get_current_user)
):
    await db.settings.update_one(
        {"type": "sms_templates"},
        {"$set": {
            "type": "sms_templates",
            "collection_template": templates.collection_template,
            "payment_template": templates.payment_template,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "SMS templates updated successfully"}

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
