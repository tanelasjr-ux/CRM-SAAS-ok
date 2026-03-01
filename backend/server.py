from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import hashlib
from supabase import create_client, Client
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

# OpenAI
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Create the main app
app = FastAPI(title="CRM SaaS API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

# ==================== PYDANTIC MODELS ====================

class LoginRequest(BaseModel):
    email: str
    password: str

class UserBase(BaseModel):
    email: str
    name: str
    role: str = "client"  # "server_admin" or "client"
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str
    tenant_id: Optional[str] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None

class TenantBase(BaseModel):
    company_name: str
    plan: str = "active"
    status: str = "active"

class TenantCreate(TenantBase):
    pass

class Tenant(TenantBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_limit: int = 999
    automation_limit: int = 999
    ai_requests_limit: int = 999
    ai_requests_used: int = 0
    created_at: Optional[str] = None
    # Server config
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    whatsapp_instance: Optional[str] = None

class TenantConfig(BaseModel):
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    whatsapp_instance: Optional[str] = None

class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    pipeline_stage_id: Optional[str] = None
    estimated_value: float = 0
    responsible_id: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class Lead(LeadBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    lead_score: int = 0
    last_activity_at: Optional[str] = None
    created_at: Optional[str] = None

class PipelineStageBase(BaseModel):
    name: str
    order: int
    color: str = "#4F46E5"

class PipelineStageCreate(PipelineStageBase):
    pass

class PipelineStage(PipelineStageBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    average_time_days: int = 0

class ActivityBase(BaseModel):
    lead_id: str
    type: str
    description: str
    scheduled_at: Optional[str] = None

class ActivityCreate(ActivityBase):
    pass

class Activity(ActivityBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    user_id: Optional[str] = None
    is_completed: bool = False
    completed_at: Optional[str] = None
    created_at: Optional[str] = None

class DealBase(BaseModel):
    lead_id: str
    value: float
    status: str = "open"

class DealCreate(DealBase):
    pass

class Deal(DealBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    closed_at: Optional[str] = None
    created_at: Optional[str] = None

class InvoiceBase(BaseModel):
    deal_id: str
    value: float
    due_date: str
    status: str = "pending"

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    created_at: Optional[str] = None

class PaymentBase(BaseModel):
    invoice_id: str
    amount_paid: float

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    payment_date: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class MoveLeadRequest(BaseModel):
    stage_id: str

# ==================== AUTH HELPERS ====================

def create_jwt_token(user_data: dict) -> str:
    payload = {
        **user_data,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return decode_jwt_token(credentials.credentials)

async def get_server_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Only server_admin can access"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Não autenticado")
    user = decode_jwt_token(credentials.credentials)
    if user.get("role") != "server_admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador do servidor")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login with email and password"""
    try:
        # Find user by email
        result = supabase.table("users").select("*, tenants(*)").eq("email", request.email.lower()).execute()
        
        if not result.data:
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        user = result.data[0]
        
        # Verify password
        if not verify_password(request.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Usuário desativado")
        
        tenant = user.get("tenants", {})
        
        # Generate JWT
        token_data = {
            "user_id": user["id"],
            "tenant_id": user.get("tenant_id"),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "avatar_url": user.get("avatar_url")
        }
        
        token = create_jwt_token(token_data)
        
        return TokenResponse(
            access_token=token,
            user={
                **token_data,
                "tenant": tenant
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    result = supabase.table("users").select("*, tenants(*)").eq("id", current_user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user = result.data[0]
    return {
        "id": user["id"],
        "tenant_id": user.get("tenant_id"),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "avatar_url": user.get("avatar_url"),
        "tenant": user.get("tenants", {})
    }

# ==================== SERVER ADMIN ENDPOINTS ====================

@api_router.get("/server/tenants", response_model=List[Tenant])
async def get_all_tenants(current_user: dict = Depends(get_server_admin)):
    """Get all tenants (server admin only)"""
    result = supabase.table("tenants").select("*").execute()
    return result.data or []

@api_router.post("/server/tenants", response_model=Tenant)
async def create_tenant(tenant: TenantCreate, current_user: dict = Depends(get_server_admin)):
    """Create a new tenant (server admin only)"""
    tenant_data = {
        "id": str(uuid.uuid4()),
        **tenant.model_dump(),
        "plan": "active",
        "status": "active",
        "user_limit": 999,
        "automation_limit": 999,
        "ai_requests_limit": 999,
        "ai_requests_used": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("tenants").insert(tenant_data).execute()
    
    # Create default pipeline stages
    default_stages = [
        {"name": "Novo Lead", "order": 1, "color": "#6366F1"},
        {"name": "Qualificação", "order": 2, "color": "#8B5CF6"},
        {"name": "Proposta", "order": 3, "color": "#F59E0B"},
        {"name": "Negociação", "order": 4, "color": "#F97316"},
        {"name": "Fechado/Ganho", "order": 5, "color": "#10B981"},
        {"name": "Perdido", "order": 6, "color": "#EF4444"}
    ]
    for stage in default_stages:
        stage["id"] = str(uuid.uuid4())
        stage["tenant_id"] = tenant_data["id"]
        stage["average_time_days"] = 0
        supabase.table("pipeline_stages").insert(stage).execute()
    
    return result.data[0] if result.data else tenant_data

@api_router.put("/server/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, tenant: TenantBase, current_user: dict = Depends(get_server_admin)):
    """Update a tenant (server admin only)"""
    result = supabase.table("tenants").update(tenant.model_dump()).eq("id", tenant_id).execute()
    return result.data[0] if result.data else None

@api_router.put("/server/tenants/{tenant_id}/config")
async def update_tenant_config(tenant_id: str, config: TenantConfig, current_user: dict = Depends(get_server_admin)):
    """Update tenant Evolution API config (server admin only)"""
    update_data = {
        "evolution_api_url": config.evolution_api_url,
        "evolution_api_key": config.evolution_api_key,
        "whatsapp_instance": config.whatsapp_instance
    }
    result = supabase.table("tenants").update(update_data).eq("id", tenant_id).execute()
    return result.data[0] if result.data else None

@api_router.delete("/server/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user: dict = Depends(get_server_admin)):
    """Delete a tenant (server admin only)"""
    supabase.table("tenants").delete().eq("id", tenant_id).execute()
    return {"success": True}

@api_router.get("/server/users", response_model=List[User])
async def get_all_users(current_user: dict = Depends(get_server_admin)):
    """Get all users (server admin only)"""
    result = supabase.table("users").select("id, tenant_id, email, name, role, avatar_url, is_active, created_at").execute()
    return result.data or []

@api_router.post("/server/users", response_model=User)
async def create_user(user: UserCreate, current_user: dict = Depends(get_server_admin)):
    """Create a new user (server admin only)"""
    # Check if email exists
    existing = supabase.table("users").select("id").eq("email", user.email.lower()).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user_data = {
        "id": str(uuid.uuid4()),
        "email": user.email.lower(),
        "name": user.name,
        "role": user.role,
        "tenant_id": user.tenant_id,
        "avatar_url": user.avatar_url,
        "password_hash": hash_password(user.password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("users").insert(user_data).execute()
    
    # Return without password_hash
    return_data = {k: v for k, v in user_data.items() if k != "password_hash"}
    return return_data

@api_router.put("/server/users/{user_id}/password")
async def update_user_password(user_id: str, password: str, current_user: dict = Depends(get_server_admin)):
    """Update user password (server admin only)"""
    result = supabase.table("users").update({"password_hash": hash_password(password)}).eq("id", user_id).execute()
    return {"success": True}

@api_router.put("/server/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_user: dict = Depends(get_server_admin)):
    """Toggle user active status (server admin only)"""
    # Get current status
    user_result = supabase.table("users").select("is_active").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    new_status = not user_result.data[0].get("is_active", True)
    supabase.table("users").update({"is_active": new_status}).eq("id", user_id).execute()
    return {"success": True, "is_active": new_status}

@api_router.delete("/server/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_server_admin)):
    """Delete a user (server admin only)"""
    supabase.table("users").delete().eq("id", user_id).execute()
    return {"success": True}

# ==================== TENANT ENDPOINTS ====================

@api_router.get("/tenants/current", response_model=Tenant)
async def get_current_tenant(current_user: dict = Depends(get_current_user)):
    """Get current user's tenant"""
    if not current_user.get("tenant_id"):
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    result = supabase.table("tenants").select("*").eq("id", current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    return result.data[0]

@api_router.put("/tenants/current")
async def update_current_tenant(tenant: TenantBase, current_user: dict = Depends(get_current_user)):
    """Update current tenant"""
    if current_user["role"] not in ["server_admin"]:
        raise HTTPException(status_code=403, detail="Não autorizado")
    
    result = supabase.table("tenants").update(tenant.model_dump()).eq("id", current_user["tenant_id"]).execute()
    return result.data[0] if result.data else None

# ==================== PIPELINE STAGES ENDPOINTS ====================

@api_router.get("/pipeline-stages", response_model=List[PipelineStage])
async def get_pipeline_stages(current_user: dict = Depends(get_current_user)):
    """Get all pipeline stages for current tenant"""
    if not current_user.get("tenant_id"):
        return []
    result = supabase.table("pipeline_stages").select("*").eq("tenant_id", current_user["tenant_id"]).order("order").execute()
    return result.data or []

@api_router.post("/pipeline-stages", response_model=PipelineStage)
async def create_pipeline_stage(stage: PipelineStageCreate, current_user: dict = Depends(get_current_user)):
    """Create a new pipeline stage"""
    stage_data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        **stage.model_dump(),
        "average_time_days": 0
    }
    result = supabase.table("pipeline_stages").insert(stage_data).execute()
    return result.data[0] if result.data else stage_data

@api_router.put("/pipeline-stages/{stage_id}", response_model=PipelineStage)
async def update_pipeline_stage(stage_id: str, stage: PipelineStageCreate, current_user: dict = Depends(get_current_user)):
    """Update a pipeline stage"""
    result = supabase.table("pipeline_stages").update(stage.model_dump()).eq("id", stage_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Stage não encontrado")
    return result.data[0]

@api_router.delete("/pipeline-stages/{stage_id}")
async def delete_pipeline_stage(stage_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a pipeline stage"""
    supabase.table("pipeline_stages").delete().eq("id", stage_id).eq("tenant_id", current_user["tenant_id"]).execute()
    return {"success": True}

# ==================== LEADS ENDPOINTS ====================

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(
    stage_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all leads for current tenant"""
    if not current_user.get("tenant_id"):
        return []
    query = supabase.table("leads").select("*").eq("tenant_id", current_user["tenant_id"])
    
    if stage_id:
        query = query.eq("pipeline_stage_id", stage_id)
    
    if search:
        query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%")
    
    result = query.order("created_at", desc=True).execute()
    return result.data or []

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific lead"""
    result = supabase.table("leads").select("*").eq("id", lead_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return result.data[0]

@api_router.post("/leads", response_model=Lead)
async def create_lead(lead: LeadCreate, current_user: dict = Depends(get_current_user)):
    """Create a new lead"""
    # Get first pipeline stage if not specified
    if not lead.pipeline_stage_id:
        stages = supabase.table("pipeline_stages").select("id").eq("tenant_id", current_user["tenant_id"]).order("order").limit(1).execute()
        if stages.data:
            lead.pipeline_stage_id = stages.data[0]["id"]
    
    lead_data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        **lead.model_dump(),
        "lead_score": 50,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_activity_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("leads").insert(lead_data).execute()
    return result.data[0] if result.data else lead_data

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead: LeadCreate, current_user: dict = Depends(get_current_user)):
    """Update a lead"""
    update_data = {
        **lead.model_dump(),
        "last_activity_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("leads").update(update_data).eq("id", lead_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return result.data[0]

@api_router.put("/leads/{lead_id}/move", response_model=Lead)
async def move_lead(lead_id: str, request: MoveLeadRequest, current_user: dict = Depends(get_current_user)):
    """Move lead to another pipeline stage"""
    update_data = {
        "pipeline_stage_id": request.stage_id,
        "last_activity_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("leads").update(update_data).eq("id", lead_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    # Log activity
    activity_data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        "lead_id": lead_id,
        "user_id": current_user["user_id"],
        "type": "stage_change",
        "description": f"Lead movido para outro estágio",
        "is_completed": True,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    supabase.table("activities").insert(activity_data).execute()
    
    return result.data[0]

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a lead"""
    supabase.table("leads").delete().eq("id", lead_id).eq("tenant_id", current_user["tenant_id"]).execute()
    return {"success": True}

# ==================== ACTIVITIES ENDPOINTS ====================

@api_router.get("/activities", response_model=List[Activity])
async def get_activities(
    lead_id: Optional[str] = None,
    type: Optional[str] = None,
    pending: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get activities for current tenant"""
    if not current_user.get("tenant_id"):
        return []
    query = supabase.table("activities").select("*").eq("tenant_id", current_user["tenant_id"])
    
    if lead_id:
        query = query.eq("lead_id", lead_id)
    if type:
        query = query.eq("type", type)
    if pending is not None:
        query = query.eq("is_completed", not pending)
    
    result = query.order("created_at", desc=True).execute()
    return result.data or []

@api_router.post("/activities", response_model=Activity)
async def create_activity(activity: ActivityCreate, current_user: dict = Depends(get_current_user)):
    """Create a new activity"""
    activity_data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        "user_id": current_user["user_id"],
        **activity.model_dump(),
        "is_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("activities").insert(activity_data).execute()
    
    # Update lead's last activity
    supabase.table("leads").update({
        "last_activity_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", activity.lead_id).execute()
    
    return result.data[0] if result.data else activity_data

@api_router.put("/activities/{activity_id}/complete")
async def complete_activity(activity_id: str, current_user: dict = Depends(get_current_user)):
    """Mark activity as completed"""
    update_data = {
        "is_completed": True,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("activities").update(update_data).eq("id", activity_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    return result.data[0]

@api_router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an activity"""
    supabase.table("activities").delete().eq("id", activity_id).eq("tenant_id", current_user["tenant_id"]).execute()
    return {"success": True}

# ==================== DEALS ENDPOINTS ====================

@api_router.get("/deals", response_model=List[Deal])
async def get_deals(
    lead_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all deals for current tenant"""
    if not current_user.get("tenant_id"):
        return []
    query = supabase.table("deals").select("*").eq("tenant_id", current_user["tenant_id"])
    
    if lead_id:
        query = query.eq("lead_id", lead_id)
    if status:
        query = query.eq("status", status)
    
    result = query.order("created_at", desc=True).execute()
    return result.data or []

@api_router.post("/deals", response_model=Deal)
async def create_deal(deal: DealCreate, current_user: dict = Depends(get_current_user)):
    """Create a new deal"""
    deal_data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        **deal.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("deals").insert(deal_data).execute()
    return result.data[0] if result.data else deal_data

@api_router.put("/deals/{deal_id}", response_model=Deal)
async def update_deal(deal_id: str, deal: DealCreate, current_user: dict = Depends(get_current_user)):
    """Update a deal"""
    update_data = deal.model_dump()
    if deal.status == "won":
        update_data["closed_at"] = datetime.now(timezone.utc).isoformat()
    result = supabase.table("deals").update(update_data).eq("id", deal_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Deal não encontrado")
    return result.data[0]

# ==================== INVOICES ENDPOINTS ====================

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    deal_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices for current tenant"""
    if not current_user.get("tenant_id"):
        return []
    query = supabase.table("invoices").select("*").eq("tenant_id", current_user["tenant_id"])
    
    if deal_id:
        query = query.eq("deal_id", deal_id)
    if status:
        query = query.eq("status", status)
    
    result = query.order("due_date", desc=True).execute()
    return result.data or []

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    """Create a new invoice"""
    invoice_data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        **invoice.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("invoices").insert(invoice_data).execute()
    return result.data[0] if result.data else invoice_data

# ==================== PAYMENTS ENDPOINTS ====================

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(
    invoice_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all payments for current tenant"""
    if not current_user.get("tenant_id"):
        return []
    query = supabase.table("payments").select("*").eq("tenant_id", current_user["tenant_id"])
    
    if invoice_id:
        query = query.eq("invoice_id", invoice_id)
    
    result = query.order("payment_date", desc=True).execute()
    return result.data or []

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment: PaymentCreate, current_user: dict = Depends(get_current_user)):
    """Create a new payment"""
    payment_data = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        **payment.model_dump(),
        "payment_date": datetime.now(timezone.utc).isoformat()
    }
    result = supabase.table("payments").insert(payment_data).execute()
    
    # Update invoice status
    supabase.table("invoices").update({"status": "paid"}).eq("id", payment.invoice_id).execute()
    
    return result.data[0] if result.data else payment_data

# ==================== WHATSAPP ENDPOINTS ====================

@api_router.get("/whatsapp/conversations")
async def get_whatsapp_conversations(current_user: dict = Depends(get_current_user)):
    """Get WhatsApp conversations"""
    if not current_user.get("tenant_id"):
        return []
    result = supabase.table("whatsapp_conversations").select("*, leads(name, email, phone)").eq("tenant_id", current_user["tenant_id"]).execute()
    return result.data or []

@api_router.get("/whatsapp/conversations/{lead_id}")
async def get_whatsapp_conversation(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get WhatsApp conversation for a lead"""
    result = supabase.table("whatsapp_conversations").select("*").eq("lead_id", lead_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if result.data:
        return result.data[0]
    return {"lead_id": lead_id, "messages": []}

@api_router.post("/whatsapp/send")
async def send_whatsapp_message(lead_id: str, message: str, current_user: dict = Depends(get_current_user)):
    """Send WhatsApp message via Evolution API"""
    # Get tenant config
    tenant_result = supabase.table("tenants").select("evolution_api_url, evolution_api_key, whatsapp_instance").eq("id", current_user["tenant_id"]).execute()
    
    if not tenant_result.data:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    
    tenant = tenant_result.data[0]
    
    # Get lead phone
    lead_result = supabase.table("leads").select("phone").eq("id", lead_id).execute()
    if not lead_result.data or not lead_result.data[0].get("phone"):
        raise HTTPException(status_code=400, detail="Lead sem telefone cadastrado")
    
    phone = lead_result.data[0]["phone"]
    
    # Try to send via Evolution API if configured
    evolution_sent = False
    if tenant.get("evolution_api_url") and tenant.get("evolution_api_key") and tenant.get("whatsapp_instance"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{tenant['evolution_api_url']}/message/sendText/{tenant['whatsapp_instance']}",
                    json={
                        "number": phone,
                        "text": message
                    },
                    headers={
                        "apikey": tenant["evolution_api_key"],
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )
                if response.status_code == 200 or response.status_code == 201:
                    evolution_sent = True
        except Exception as e:
            logger.error(f"Evolution API error: {e}")
    
    # Store message in database
    new_message = {
        "id": str(uuid.uuid4()),
        "content": message,
        "sent_by": "user",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "delivered": evolution_sent
    }
    
    result = supabase.table("whatsapp_conversations").select("*").eq("lead_id", lead_id).eq("tenant_id", current_user["tenant_id"]).execute()
    
    if result.data:
        messages = result.data[0].get("messages", [])
        messages.append(new_message)
        supabase.table("whatsapp_conversations").update({"messages": messages}).eq("id", result.data[0]["id"]).execute()
    else:
        conv_data = {
            "id": str(uuid.uuid4()),
            "tenant_id": current_user["tenant_id"],
            "lead_id": lead_id,
            "messages": [new_message]
        }
        supabase.table("whatsapp_conversations").insert(conv_data).execute()
    
    return {"success": True, "message": new_message, "evolution_sent": evolution_sent}

# ==================== KPIs & DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    tenant_id = current_user.get("tenant_id")
    
    if not tenant_id:
        return {
            "total_leads": 0,
            "total_value": 0,
            "total_revenue": 0,
            "conversion_rate": 0,
            "average_ticket": 0,
            "leads_by_stage": {},
            "stages": [],
            "recent_activities": [],
            "deals_won": 0,
            "deals_open": 0
        }
    
    # Get leads count by stage
    leads_result = supabase.table("leads").select("id, pipeline_stage_id, estimated_value, lead_score, created_at").eq("tenant_id", tenant_id).execute()
    leads = leads_result.data or []
    
    # Get stages
    stages_result = supabase.table("pipeline_stages").select("*").eq("tenant_id", tenant_id).order("order").execute()
    stages = stages_result.data or []
    
    # Get deals
    deals_result = supabase.table("deals").select("*").eq("tenant_id", tenant_id).execute()
    deals = deals_result.data or []
    
    # Calculate stats
    total_leads = len(leads)
    total_value = sum(l.get("estimated_value", 0) for l in leads)
    
    won_deals = [d for d in deals if d.get("status") == "won"]
    total_revenue = sum(d.get("value", 0) for d in won_deals)
    
    conversion_rate = (len(won_deals) / total_leads * 100) if total_leads > 0 else 0
    average_ticket = (total_revenue / len(won_deals)) if won_deals else 0
    
    # Leads by stage
    leads_by_stage = {}
    for stage in stages:
        stage_leads = [l for l in leads if l.get("pipeline_stage_id") == stage["id"]]
        leads_by_stage[stage["id"]] = {
            "count": len(stage_leads),
            "value": sum(l.get("estimated_value", 0) for l in stage_leads),
            "name": stage["name"],
            "color": stage.get("color", "#6366F1")
        }
    
    # Recent activities
    activities_result = supabase.table("activities").select("*").eq("tenant_id", tenant_id).order("created_at", desc=True).limit(10).execute()
    
    return {
        "total_leads": total_leads,
        "total_value": total_value,
        "total_revenue": total_revenue,
        "conversion_rate": round(conversion_rate, 1),
        "average_ticket": round(average_ticket, 2),
        "leads_by_stage": leads_by_stage,
        "stages": stages,
        "recent_activities": activities_result.data or [],
        "deals_won": len(won_deals),
        "deals_open": len([d for d in deals if d.get("status") == "open"])
    }

@api_router.get("/dashboard/revenue-chart")
async def get_revenue_chart(current_user: dict = Depends(get_current_user)):
    """Get revenue chart data"""
    tenant_id = current_user.get("tenant_id")
    
    if not tenant_id:
        return []
    
    # Get KPIs
    kpis_result = supabase.table("kpis").select("*").eq("tenant_id", tenant_id).order("month").execute()
    
    if kpis_result.data:
        return kpis_result.data
    
    # Generate mock data if no KPIs exist
    months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
    return [
        {"month": m, "revenue": (i + 1) * 15000 + (i * 5000), "leads": (i + 1) * 20}
        for i, m in enumerate(months)
    ]

# ==================== AI ENDPOINTS ====================

@api_router.post("/ai/lead-score")
async def calculate_lead_score(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Calculate lead score using AI"""
    # Get lead data
    lead_result = supabase.table("leads").select("*").eq("id", lead_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if not lead_result.data:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    lead = lead_result.data[0]
    
    # Get activities for this lead
    activities_result = supabase.table("activities").select("*").eq("lead_id", lead_id).execute()
    activities = activities_result.data or []
    
    # Calculate score based on rules
    score = 50  # Base score
    
    if lead.get("email"):
        score += 10
    if lead.get("phone"):
        score += 10
    if lead.get("estimated_value", 0) > 10000:
        score += 15
    if len(activities) > 5:
        score += 15
    
    # Cap score
    score = min(score, 100)
    
    # Update lead score
    supabase.table("leads").update({"lead_score": score}).eq("id", lead_id).execute()
    
    return {"lead_id": lead_id, "score": score}

@api_router.post("/ai/suggest-followup")
async def suggest_followup(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get AI suggestion for next follow-up action"""
    # Get lead data
    lead_result = supabase.table("leads").select("*").eq("id", lead_id).eq("tenant_id", current_user["tenant_id"]).execute()
    if not lead_result.data:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    lead = lead_result.data[0]
    
    # Get stage info
    stage_result = supabase.table("pipeline_stages").select("*").eq("id", lead.get("pipeline_stage_id")).execute()
    stage = stage_result.data[0] if stage_result.data else {"name": "Desconhecido"}
    
    # Simple rule-based suggestions
    suggestions = {
        "Novo Lead": "Envie um email de apresentação e agende uma ligação de qualificação.",
        "Qualificação": "Agende uma demonstração do produto para entender melhor as necessidades.",
        "Proposta": "Prepare uma proposta personalizada e envie em até 24h.",
        "Negociação": "Entre em contato para discutir condições e fechar o negócio.",
        "Fechado/Ganho": "Parabéns! Inicie o onboarding do cliente.",
        "Perdido": "Agende um follow-up para daqui a 3 meses."
    }
    
    suggestion = suggestions.get(stage["name"], "Continue o acompanhamento regular do lead.")
    
    return {
        "lead_id": lead_id,
        "current_stage": stage["name"],
        "suggestion": suggestion,
        "priority": "alta" if lead.get("estimated_value", 0) > 10000 else "média"
    }

@api_router.post("/ai/detect-bottlenecks")
async def detect_bottlenecks(current_user: dict = Depends(get_current_user)):
    """Detect pipeline bottlenecks using AI"""
    tenant_id = current_user.get("tenant_id")
    
    if not tenant_id:
        return {"bottlenecks": [], "total_leads": 0, "health_score": 100}
    
    # Get leads with stage info
    leads_result = supabase.table("leads").select("*, pipeline_stages(name, order)").eq("tenant_id", tenant_id).execute()
    leads = leads_result.data or []
    
    # Get stages
    stages_result = supabase.table("pipeline_stages").select("*").eq("tenant_id", tenant_id).order("order").execute()
    stages = stages_result.data or []
    
    bottlenecks = []
    
    for stage in stages:
        stage_leads = [l for l in leads if l.get("pipeline_stage_id") == stage["id"]]
        
        if len(stage_leads) > 10:
            bottlenecks.append({
                "stage": stage["name"],
                "count": len(stage_leads),
                "severity": "alta" if len(stage_leads) > 20 else "média",
                "suggestion": f"Muitos leads parados em '{stage['name']}'. Considere adicionar mais recursos ou automatizar este estágio."
            })
    
    return {
        "bottlenecks": bottlenecks,
        "total_leads": len(leads),
        "health_score": 100 - (len(bottlenecks) * 20)
    }

# ==================== USERS ENDPOINTS ====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    """Get all users for current tenant"""
    if not current_user.get("tenant_id"):
        return []
    result = supabase.table("users").select("id, tenant_id, email, name, role, avatar_url, is_active, created_at").eq("tenant_id", current_user["tenant_id"]).execute()
    return result.data or []

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "CRM SaaS API", "version": "2.0.0", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("CRM SaaS API v2.0 started")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("CRM SaaS API shutting down")
