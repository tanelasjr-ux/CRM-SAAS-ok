from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import jwt
import hashlib
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ========================
# CONFIG
# ========================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Automation CRM API", version="5.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ========================
# HELPERS
# ========================

def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str):
    return hash_password(password) == hashed

def create_token(data: dict):
    payload = {
        **data,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

# ========================
# MODELS
# ========================

class LoginRequest(BaseModel):
    email: str
    password: str

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    pipeline_stage_id: Optional[str] = None
    estimated_value: float = 0

class ActivityCreate(BaseModel):
    lead_id: str
    description: str
    type: str = "manual"
    is_completed: bool = True

class MoveLeadRequest(BaseModel):
    stage_id: str

class WebhookMessage(BaseModel):
    tenant_id: str
    phone: str
    message: str

# ========================
# AUTH
# ========================

@api_router.post("/auth/login")
async def login(request: LoginRequest):

    result = supabase.table("users").select("*").eq("email", request.email.lower()).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")

    user = result.data[0]

    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")

    token = create_token({
        "user_id": user["id"],
        "tenant_id": user["tenant_id"],
        "email": user["email"],
        "role": user["role"]
    })

    return {"access_token": token, "user": user}


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


# ========================
# DASHBOARD
# ========================

@api_router.get("/dashboard/stats")
async def dashboard_stats(current_user: dict = Depends(get_current_user)):

    leads = supabase.table("leads") \
        .select("id", count="exact") \
        .eq("tenant_id", current_user["tenant_id"]) \
        .execute()

    activities = supabase.table("activities") \
        .select("id", count="exact") \
        .eq("tenant_id", current_user["tenant_id"]) \
        .execute()

    return {
        "total_leads": leads.count or 0,
        "total_activities": activities.count or 0,
        "total_revenue": 0,
        "conversion_rate": 0
    }

# ========================
# PIPELINE
# ========================

@api_router.get("/pipeline-stages")
async def get_pipeline(current_user: dict = Depends(get_current_user)):

    result = supabase.table("pipeline_stages") \
        .select("*") \
        .eq("tenant_id", current_user["tenant_id"]) \
        .order("order") \
        .execute()

    return result.data or []

# ========================
# LEADS
# ========================

@api_router.get("/leads")
async def get_leads(current_user: dict = Depends(get_current_user)):

    result = supabase.table("leads") \
        .select("*") \
        .eq("tenant_id", current_user["tenant_id"]) \
        .order("created_at", desc=True) \
        .execute()

    return result.data or []

@api_router.post("/leads")
async def create_lead(lead: LeadCreate, current_user: dict = Depends(get_current_user)):

    if not lead.pipeline_stage_id:
        stage = supabase.table("pipeline_stages") \
            .select("id") \
            .eq("tenant_id", current_user["tenant_id"]) \
            .order("order") \
            .limit(1) \
            .execute()

        if stage.data:
            lead.pipeline_stage_id = stage.data[0]["id"]

    data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        **lead.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    supabase.table("leads").insert(data).execute()
    return data

@api_router.put("/leads/{lead_id}/move")
async def move_lead(lead_id: str, request: MoveLeadRequest, current_user: dict = Depends(get_current_user)):

    result = supabase.table("leads") \
        .update({"pipeline_stage_id": request.stage_id}) \
        .eq("id", lead_id) \
        .eq("tenant_id", current_user["tenant_id"]) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    return result.data[0]

# ========================
# ACTIVITIES
# ========================

@api_router.post("/activities")
async def create_activity(activity: ActivityCreate, current_user: dict = Depends(get_current_user)):

    data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        "lead_id": activity.lead_id,
        "description": activity.description,
        "type": activity.type,
        "is_completed": activity.is_completed,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    supabase.table("activities").insert(data).execute()
    return data

@api_router.get("/activities/{lead_id}")
async def get_activities(lead_id: str, current_user: dict = Depends(get_current_user)):

    result = supabase.table("activities") \
        .select("*") \
        .eq("lead_id", lead_id) \
        .eq("tenant_id", current_user["tenant_id"]) \
        .order("created_at", desc=True) \
        .execute()

    return result.data or []

# ========================
# WHATSAPP ENVIO
# ========================

@api_router.post("/whatsapp/send")
async def send_message(lead_id: str, message: str, current_user: dict = Depends(get_current_user)):

    lead = supabase.table("leads") \
        .select("phone") \
        .eq("id", lead_id) \
        .execute()

    if not lead.data:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    phone = lead.data[0]["phone"]

    # salva outgoing
    supabase.table("activities").insert({
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        "lead_id": lead_id,
        "description": f"Mensagem enviada: {message}",
        "type": "whatsapp_outgoing",
        "is_completed": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    async with httpx.AsyncClient() as client:
        await client.post(
            N8N_WEBHOOK_URL,
            json={
                "tenant_id": current_user["tenant_id"],
                "phone": phone,
                "message": message
            }
        )

    return {"success": True}

# ========================
# WEBHOOK RECEBIMENTO
# ========================

@api_router.post("/webhook/whatsapp")
async def receive_message(request: Request, data: WebhookMessage):

    if WEBHOOK_SECRET:
        token = request.headers.get("x-webhook-secret")
        if token != WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="Webhook não autorizado")

    lead = supabase.table("leads") \
        .select("*") \
        .eq("phone", data.phone) \
        .eq("tenant_id", data.tenant_id) \
        .execute()

    if not lead.data:
        new_lead = {
            "id": str(uuid.uuid4()),
            "tenant_id": data.tenant_id,
            "name": data.phone,
            "phone": data.phone,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("leads").insert(new_lead).execute()
        lead_id = new_lead["id"]
    else:
        lead_id = lead.data[0]["id"]

    supabase.table("activities").insert({
        "id": str(uuid.uuid4()),
        "tenant_id": data.tenant_id,
        "lead_id": lead_id,
        "description": f"Mensagem recebida: {data.message}",
        "type": "whatsapp_incoming",
        "is_completed": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    return {"received": True}

# ========================
# HEALTH
# ========================

@api_router.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)