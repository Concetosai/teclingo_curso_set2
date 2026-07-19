import json
import os
import re
import datetime
import urllib.request
import urllib.parse
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from pydantic_settings import BaseSettings
from typing import List, Optional, Dict, Any
from groq import Groq

# ==========================================
# CONFIG
# ==========================================
class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    GOOGLE_APPS_SCRIPT_URL: str = ""
    GOOGLE_CLIENT_ID: str = ""
    ENVIRONMENT: str = "development"
    VITE_API_URL: str = ""

    model_config = ConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", ".env"),
        extra="ignore"
    )

settings = Settings()

# ==========================================
# TUTOR SERVICE
# ==========================================
class TutorService:
    def __init__(self):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError("GROQ_API_KEY no encontrada. Verifica tu archivo .env en la raíz del proyecto.")
        self.client = Groq(api_key=api_key)

    def evaluate_batch(self, exercises: list, user_context: dict = None) -> dict:
        if not user_context:
            user_context = {"country": "México", "city": "Ciudad de México", "institutional_world": "tecnm"}

        worlds_db = {
            "tecnm": {"name": "Tecnológico Nacional de México", "protagonist": "Estudiante de ingeniería", "names": "Luis, Fernanda, el Ing. Ramírez", "places": "el campus, la cafetería del plantel, el laboratorio"},
            "empresa": {"name": "Empresa / Negocios", "protagonist": "Empresario o ejecutivo", "names": "Lic. Méndez, Mr. Smith, la gerente de logística", "places": "la sala de juntas, la planta de producción, la videollamada con el cliente"},
            "usa_university": {"name": "USA University", "protagonist": "International student / Estudiante internacional", "names": "Emily, Jake, Professor Johnson", "places": "the campus, the library, the dorm, the lecture hall, the student center"},
            "viajes": {"name": "Viajes / Turismo", "protagonist": "Turista o viajero", "names": "María, Carlos, el guía turístico", "places": "el aeropuerto, el hotel, el restaurante, el museo"},
            "vida_diaria": {"name": "Vida Cotidiana", "protagonist": "Persona en su vida diaria", "names": "Carlos, Ana, el vecino", "places": "la casa, el barrio, el supermercado, el parque"}
        }

        world = worlds_db.get(user_context.get("institutional_world", "tecnm"), worlds_db["tecnm"])

        exercises_context = ""
        for i, ex in enumerate(exercises):
            exercises_context += f"{i+1}. Question/Prompt: '{ex.get('question', '')}' | User Answer: '{ex.get('user_answer', '')}' | Expected: '{ex.get('correct_answer', '')}'\n"

        system_prompt = f"""You are an expert instructional designer and empathetic English tutor for Spanish-speaking students.
You are currently teaching a student with the following INSTITUTIONAL PROFILE:
- Country/City: {user_context.get('country', 'México')}, {user_context.get('city', 'Ciudad de México')}
- Institution/Context: {world['name']}
- Student Profile: {world['protagonist']}
- Characters to use: {world['names']}
- Places/Scenarios to use: {world['places']}
- CEFR Level: A1

CRITICAL PEDAGOGICAL RULES:
1. STRICT CONTEXTUALIZATION: You MUST use the characters, places, and scenarios provided above.
2. LANGUAGE: Your 'summary', 'feedback', and 'pedagogical_reason' MUST BE IN SPANISH.
3. GRAMMAR SCOPE: Strictly use ONLY A1 grammar.
4. SPEAKING/PRONUNCIATION TOLERANCE: NEVER penalize for exact string matching. Evaluate based on PHONETIC SIMILARITY and CORE MEANING.
5. "I DON'T KNOW": If the user writes "no sé", gently encourage them to try.
6. PEDAGOGICAL REASON: Base your 'pedagogical_reason' on strict A1 rules explained in Spanish.
7. *** ABSOLUTELY CRITICAL - THE 'feedback' FIELD MUST NEVER CONTAIN THE CORRECT ANSWER WORD ***
8. MULTIPLE VALID ANSWERS: If the user's answer is grammatically correct in the context, give FULL CREDIT.

Return a JSON object with this EXACT structure:
{{
  "summary": "A brief, encouraging 1-sentence summary in SPANISH.",
  "results": [
    {{
      "is_correct": true/false,
      "score": 0-100,
      "feedback": "If correct: praise. If wrong: redirect to grammar library rule. NEVER reveal the answer.",
      "pedagogical_reason": "The exact grammatical rule in SPANISH explaining WHY.",
      "rule_hint": "Short description of which grammar rule to review"
    }}
  ]
}}"""

        user_prompt = f"Evaluate this batch of {len(exercises)} exercises:\n{exercises_context}"

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=2500,
                response_format={"type": "json_object"}
            )
            raw = json.loads(response.choices[0].message.content)
            return self._sanitize_feedback(raw, exercises)
        except Exception as e:
            return {"error": str(e), "summary": "Error al conectar con la IA.", "results": []}

    def generate_alternate_exercises(self, skill: str, subtopic_id: str, theory: str, title: str, user_context: dict = None) -> dict:
        if not user_context:
            user_context = {"country": "México", "city": "Ciudad de México", "institutional_world": "tecnm"}

        worlds_db = {
            "tecnm": {"name": "Tecnológico Nacional de México", "protagonist": "Estudiante de ingeniería", "names": "Luis, Fernanda, el Ing. Ramírez", "places": "el campus, la cafetería del plantel, el laboratorio"},
            "empresa": {"name": "Empresa / Negocios", "protagonist": "Empresario o ejecutivo", "names": "Lic. Méndez, Mr. Smith, la gerente de logística", "places": "la sala de juntas, la planta de producción, la videollamada con el cliente"},
            "usa_university": {"name": "USA University", "protagonist": "International student / Estudiante internacional", "names": "Emily, Jake, Professor Johnson", "places": "the campus, the library, the dorm, the lecture hall, the student center"},
            "viajes": {"name": "Viajes / Turismo", "protagonist": "Turista o viajero", "names": "María, Carlos, el guía turístico", "places": "el aeropuerto, el hotel, el restaurante, el museo"},
            "vida_diaria": {"name": "Vida Cotidiana", "protagonist": "Persona en su vida diaria", "names": "Carlos, Ana, el vecino", "places": "la casa, el barrio, el supermercado, el parque"}
        }
        world = worlds_db.get(user_context.get("institutional_world", "tecnm"), worlds_db["tecnm"])

        skill_names = {"grammar": "Grammar", "vocabulary": "Vocabulary", "reading": "Reading", "listening": "Listening", "writing": "Writing", "pronunciation": "Speaking"}
        skill_name = skill_names.get(skill, skill)

        system_prompt = f"""You are an expert English exercise designer for A1 level Spanish-speaking students.

STUDENT PROFILE:
- Country: {user_context.get('country', 'México')}, {user_context.get('city', 'Ciudad de México')}
- Institution: {world['name']}
- Context: {world['protagonist']}
- Characters to use: {world['names']}
- Places to use: {world['places']}
- CEFR Level: A1

LESSON TOPIC:
- Title: {title}
- Grammar Rule: {theory}
- Subtopic: {subtopic_id}

TASK: Generate 5 NEW exercises for the skill "{skill_name}". These must be DIFFERENT from the original exercises but test the SAME grammar concept.

Return a JSON object with this EXACT structure:
{{
  "exercises": {{
    "<skill_key>": [...exercises...]
  }}
}}"""

        user_prompt = f"Generate 5 alternate {skill_name} exercises for lesson '{title}' in subtopic {subtopic_id}. Theory: {theory}"

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=3000,
                response_format={"type": "json_object"}
            )
            raw = json.loads(response.choices[0].message.content)
            exercises_data = raw.get("exercises", raw)
            if skill in exercises_data:
                return {"exercises": {skill: exercises_data[skill]}}
            return {"exercises": exercises_data}
        except Exception as e:
            return {"error": str(e), "exercises": {}}

    def _sanitize_feedback(self, result: dict, exercises: list) -> dict:
        if not result.get("results"):
            return result

        for i, r in enumerate(result["results"]):
            ex = exercises[i] if i < len(exercises) else {}
            correct = (ex.get("correct_answer") or "").strip().lower()
            fb = r.get("feedback", "")

            if not correct or r.get("is_correct", True):
                continue

            reveal_patterns = [
                rf"(?i)(intent|prueb|us[ae]|la respuesta es|se usa)\s*['\"]?\s*{re.escape(correct)}\b",
                rf"(?i)['\"]?{re.escape(correct)}['\"]?\s*(para|en|por|cuando|porque|ya que|pues)",
            ]

            for pattern in reveal_patterns:
                fb = re.sub(pattern, "Recuerda la regla gramatical correspondiente.", fb)

            r["feedback"] = fb

        return result

tutor = TutorService()

# ==========================================
# FASTAPI APP + ROUTER (Course + ADN)
# ==========================================
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
COURSE_CONTENT_PATH = os.path.join(DATA_DIR, "course_content.json")
GRAMMAR_LIBRARY_PATH = os.path.join(DATA_DIR, "grammar_library.json")

def _load_course_content():
    try:
        with open(COURSE_CONTENT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"course_subtopics": {}, "lesson_content_variants": {}}

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

course_data = _load_course_content()

# ================== PYDANTIC MODELS ==================
class FeedbackRequest(BaseModel):
    question: str
    user_answer: str
    correct_answer: str
    common_mistakes: Optional[List[dict]] = None
    user_context: Optional[Dict[str, Any]] = None

class BatchFeedbackRequest(BaseModel):
    exercises: List[dict]
    user_context: Optional[Dict[str, Any]] = None

class AlternateExercisesRequest(BaseModel):
    skill: str
    subtopic_id: str
    theory: Optional[str] = ""
    title: Optional[str] = ""
    user_context: Optional[Dict[str, Any]] = None

class ProgressSaveRequest(BaseModel):
    user_id: str
    subtopic_id: str
    skill: str
    score: float
    attempts: int
    world: Optional[str] = "tecnm"

class ExamAnswerRequest(BaseModel):
    user_id: str
    world: str
    answers: List[dict]

# ========== MODELO ADN (Nuevo) ==========
class ADNData(BaseModel):
    email: str
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

# ================== APPS Y ROUTERS ==================
app = FastAPI(
    title="TECLINGO AI Engine",
    version="1.0.0",
    description="API para el Curso MCER y Base de Conocimiento de Gramatica"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Router para el Curso ----
router = APIRouter(prefix="/api/course", tags=["Course"])

@router.get("/module/{module_id}/subtopics")
def get_module_subtopics(module_id: str, world: Optional[str] = Query(None)):
    if world and world in ['viajes', 'vida_diaria']:
        variants = course_data.get("lesson_content_variants", {}).get(world, {})
        subtopics = []
        for lesson_id_str, lesson in sorted(variants.items(), key=lambda x: int(x[0])):
            subtopics.append({
                "subtopic_id": f"A1-M01-ST{str(lesson_id_str).zfill(2)}",
                "title": lesson.get("title", ""),
                "sequence_order": int(lesson_id_str)
            })
        return subtopics

    module_subs = course_data.get("course_subtopics", {}).get(module_id, [])
    return [{"subtopic_id": s["subtopic_id"], "title": s["title"], "sequence_order": s["sequence_order"]} for s in module_subs]

@router.get("/subtopic/{subtopic_id}")
def get_subtopic(subtopic_id: str, world: Optional[str] = Query(None)):
    if world and world in ['viajes', 'vida_diaria']:
        lesson_num = int(subtopic_id.split('-')[-1].replace('ST', ''))
        variants = course_data.get("lesson_content_variants", {}).get(world, {})
        lesson = variants.get(str(lesson_num))
        if lesson:
            return {
                "subtopic_id": subtopic_id,
                "title": lesson.get("title", ""),
                "mcer_goal": lesson.get("mcer_goal", ""),
                "theory": lesson.get("theory", ""),
                "exercises": lesson.get("exercises", {})
            }
        raise HTTPException(status_code=404, detail="Subtopic not found")

    module_id = "-".join(subtopic_id.split('-')[:2])
    module_subs = course_data.get("course_subtopics", {}).get(module_id, [])
    for sub in module_subs:
        if sub["subtopic_id"] == subtopic_id:
            return sub

    raise HTTPException(status_code=404, detail="Subtopic not found")

@router.post("/feedback/batch")
def get_batch_feedback(request: BatchFeedbackRequest):
    try:
        result = tutor.evaluate_batch(request.exercises, request.user_context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-alternate")
def generate_alternate(request: AlternateExercisesRequest):
    try:
        result = tutor.generate_alternate_exercises(
            skill=request.skill,
            subtopic_id=request.subtopic_id,
            theory=request.theory,
            title=request.title,
            user_context=request.user_context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/progress/save")
def save_progress(request: ProgressSaveRequest):
    try:
        result = _call_gas("registrarProgreso", {
            "email": request.user_id,
            "subtopicId": request.subtopic_id,
            "skill": request.skill,
            "score": str(request.score),
            "attempts": str(request.attempts),
            "world": request.world,
            "fecha": datetime.datetime.utcnow().isoformat()
        })
        if result.get("error"):
            return {"status": "error", "detail": result["error"]}
        return {"status": "saved"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.get("/progress/{user_id}")
def get_progress(user_id: str, world: Optional[str] = Query(None)):
    try:
        result = _call_gas("obtenerProgreso", {"email": user_id, "world": world})
        if result.get("error"):
            raise HTTPException(status_code=502, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/progress/{user_id}/subtopic/{subtopic_id}")
def get_subtopic_progress(user_id: str, subtopic_id: str):
    try:
        result = _call_gas("obtenerProgresoSubtopic", {"email": user_id, "subtopicId": subtopic_id})
        if result.get("error"):
            raise HTTPException(status_code=502, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---- Router para ADN (Nuevo) ----
adn_router = APIRouter(prefix="/api/adn", tags=["ADN"])

@adn_router.post("/save")
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

@adn_router.get("/{email}")
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

# ---- Incluir routers ----
app.include_router(router)
app.include_router(adn_router)

# ================== ENDPOINTS PÚBLICOS ==================
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/api")
def api_root():
    return {"message": "TECLINGO AI Backend is running!"}