import json
import os
import datetime
import urllib.request
import urllib.parse
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from api.core.config import settings
from api.services.tutor_service import tutor

router = APIRouter(prefix="/api/course", tags=["Course"])

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
COURSE_CONTENT_PATH = os.path.join(DATA_DIR, "course_content.json")
GRAMMAR_LIBRARY_PATH = os.path.join(DATA_DIR, "grammar_library.json")


def _load_course_content():
    with open(COURSE_CONTENT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _call_gas(action: str, data: dict = None) -> dict:
    """Call Google Apps Script for progress persistence."""
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


# ==========================================
# CONTENT ENDPOINTS
# ==========================================

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


# ==========================================
# FEEDBACK ENDPOINTS (Groq AI)
# ==========================================

@router.post("/feedback/batch")
def get_batch_feedback(request: BatchFeedbackRequest):
    try:
        result = tutor.evaluate_batch(request.exercises, request.user_context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
def get_feedback(request: FeedbackRequest):
    try:
        result = tutor.evaluate_batch([{
            "question": request.question,
            "user_answer": request.user_answer,
            "correct_answer": request.correct_answer
        }], request.user_context)
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


# ==========================================
# PROGRESS ENDPOINTS (via Google Sheets)
# ==========================================

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
            "fecha": __import__("datetime").datetime.utcnow().isoformat()
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


# ==========================================
# A1 EXAM
# ==========================================

@router.post("/exam/a1")
def submit_a1_exam(request: ExamAnswerRequest):
    try:
        A1_THRESHOLDS = {"grammar": 70, "vocabulary": 70, "reading": 60, "listening": 60, "writing": 60, "pronunciation": 60}

        skill_scores = {}
        for ans in request.answers:
            skill = ans.get("skill", "grammar")
            is_correct = ans.get("is_correct", False)
            if skill not in skill_scores:
                skill_scores[skill] = {"correct": 0, "total": 0}
            skill_scores[skill]["total"] += 1
            if is_correct:
                skill_scores[skill]["correct"] += 1

        results = {}
        for skill, data in skill_scores.items():
            pct = round((data["correct"] / data["total"]) * 100, 1) if data["total"] > 0 else 0
            threshold = A1_THRESHOLDS.get(skill, 60)
            results[skill] = {"score": pct, "passed": pct >= threshold, "threshold": threshold}

        a1_passed = all(r["passed"] for r in results.values())

        for ans in request.answers:
            _call_gas("registrarProgreso", {
                "email": request.user_id,
                "subtopicId": "A1_EXAM",
                "skill": ans.get("skill", "grammar"),
                "score": "100" if ans.get("is_correct") else "0",
                "attempts": "1",
                "world": request.world,
            "fecha": datetime.datetime.utcnow().isoformat()
            })

        return {
            "exam_results": results,
            "a1_passed": a1_passed,
            "overall_score": round(sum(r["score"] for r in results.values()) / len(results), 1) if results else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# GRAMMAR LIBRARY
# ==========================================

@router.get("/grammar-library")
def get_grammar_library():
    try:
        with open(GRAMMAR_LIBRARY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grammar-library/{rule_id}")
def get_grammar_rule(rule_id: str):
    try:
        with open(GRAMMAR_LIBRARY_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for rule in data.get("rules", []):
            if rule["rule_id"] == rule_id:
                return rule
        raise HTTPException(status_code=404, detail=f"Regla '{rule_id}' no encontrada")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grammar-library/by-subtopic/{subtopic_id}")
def get_grammar_rules_by_subtopic(subtopic_id: str):
    try:
        with open(GRAMMAR_LIBRARY_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        rules = [r for r in data.get("rules", []) if subtopic_id in r.get("subtopic_ids", [])]
        return {"subtopic_id": subtopic_id, "rules": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
