import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import urllib.request
import urllib.parse
from api.core.config import settings

router = APIRouter(prefix="/api/adn", tags=["ADN"])

def _call_gas(action: str, data: dict = None) -> dict:
    url = settings.GOOGLE_APPS_SCRIPT_URL
    if not url:
        return {"error": "GOOGLE_APPS_SCRIPT_URL not configured"}
    payload = json.dumps({"accion": action, "datos": data or {}}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"error": str(e)}

class ADNData(BaseModel):
    email: EmailStr
    confianza: str
    nivel: str
    motivo: str
    meta_3m: str
    urgencia: str
    temas: str
    formato: str
    estilo_sesion: str
    correccion: str
    horario: str
    minutos_dia: str

@router.post("/save")
def save_adn(data: ADNData):
    try:
        result = _call_gas("guardarADN", data.dict())
        if result.get("error"):
            raise HTTPException(status_code=502, detail=result["error"])
        return {"status": "saved"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{email}")
def get_adn(email: str):
    try:
        result = _call_gas("obtenerADN", {"email": email})
        if result.get("error"):
            raise HTTPException(status_code=502, detail=result["error"])
        if not result.get("data"):
            raise HTTPException(status_code=404, detail="ADN no encontrado")
        return result["data"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
