import json
import re
from groq import Groq
from api.core.config import settings


class TutorService:
    def __init__(self):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError("GROQ_API_KEY no encontrada.")
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

        # 🆕 CAMBIO CLAVE 1: Incluir tipo de ejercicio y banco de palabras
        exercises_context = ""
        for i, ex in enumerate(exercises):
        exercises_context = ""
            words_bank = ex.get('words', [])
            exercises_context += f"{i+1}. Type: '{ex_type}' | Question/Prompt: '{ex.get('question', '')}' | User Answer: '{ex.get('user_answer', '')}' | Expected: '{ex.get('correct_answer', '')}'"
            if ex_type == 'unscramble' and words_bank:
                exercises_context += f" | Word Bank: {words_bank} (user MUST use ONLY these words, nothing more, nothing less)"
            exercises_context += "\n"

        # 🆕 CAMBIO CLAVE 2: System prompt con Regla #16 anti-alucinación
        system_prompt = f"""You are an expert instructional designer and empathetic English tutor for Spanish-speaking students.

You are currently teaching a student with the following INSTITUTIONAL PROFILE:
- Country/City: {user_context.get('country', 'México')}, {user_context.get('city', 'Ciudad de México')}
- Institution/Context: {world['name']}
- Student Profile: {world['protagonist']}
- Characters to use: {world['names']}
- Places/Scenarios to use: {world['places']}
- CEFR Level: A1

CRITICAL PEDAGOGICAL RULES:
1. STRICT CONTEXTUALIZATION: You MUST use the characters, places, and scenarios provided above (EXCEPT for unscramble exercises - see rule #16).
2. LANGUAGE: Your 'summary', 'feedback', and 'pedagogical_reason' MUST BE IN SPANISH.
3. GRAMMAR SCOPE: Strictly use ONLY A1 grammar.
4. SPEAKING/PRONUNCIATION TOLERANCE: NEVER penalize for exact string matching. Evaluate based on PHONETIC SIMILARITY and CORE MEANING.
5. "I DON'T KNOW": If the user writes "no sé", gently encourage them to try.
6. PEDAGOGICAL REASON: Base your 'pedagogical_reason' on strict A1 rules explained in Spanish.
7. *** ABSOLUTELY CRITICAL - THE 'feedback' FIELD MUST NEVER CONTAIN THE CORRECT ANSWER WORD ***
8. MULTIPLE VALID ANSWERS: If the user's answer is grammatically correct in the context, give FULL CREDIT.
9. GRAMMAR RULE REFERENCE: When an answer is WRONG, include a 'rule_hint' field.
10. GRAMMAR MULTIPLE CHOICE: Evaluate based on GRAMMATICAL CORRECTNESS, NOT string comparison.
11. FILL-IN-THE-BLANK: If the user_answer CONTAINS the correct_answer word (case-insensitive), give FULL CREDIT.
12. PUNCTUATION IN SPEAKING: DO NOT penalize for missing punctuation.
13. CAPITALIZATION IN SPEAKING: Be lenient with capitalization in spoken responses.
14. PROMPT READING DETECTION: If the user's answer is EXACTLY the same as the prompt, score it 0.
15. EVERYDAY vs EVERY DAY: Accept BOTH forms.
16. *** ABSOLUTELY CRITICAL - UNSCRAMBLE EXERCISES (Type: 'unscramble') ***
    - These exercises provide a "Word Bank" with EXACTLY the words the user must use.
    - Evaluate ONLY if the user formed a grammatically correct sentence using EXACTLY the words from the Word Bank.
    - DO NOT require additional words like institution names, places, or context if those words are NOT in the Word Bank.
    - If the user used ALL words from the bank in a grammatically correct order, give FULL CREDIT (100/100).
    - NEVER penalize or give partial credit if the user correctly ordered the words but didn't add extra context words.
    - Example: If Word Bank is ["I", "am", "a", "student"] and user writes "I am a student", give 100/100 even if institutional context suggests adding "at Tecnológico Nacional de México".
16. *** ABSOLUTELY CRITICAL - UNSCRAMBLE EXERCISES (Type: 'unscramble') ***
    - These exercises provide a "Word Bank" with EXACTLY the words the user must use.
    - Evaluate ONLY if the user formed a grammatically correct sentence using EXACTLY the words from the Word Bank.
    - DO NOT require additional words like institution names, places, or context if those words are NOT in the Word Bank.
    - If the user used ALL words from the bank in a grammatically correct order, give FULL CREDIT (100/100).
    - NEVER penalize or give partial credit if the user correctly ordered the words but didn't add extra context words.
    - NEVER tell the user they need to "specify" or "add" information that is already present in their answer.
    - Example: If Word Bank is ["The", "book", "is", "on", "the", "table"] and user writes "The book is on the table", give 100/100. DO NOT say "you need to specify where the book is" because "on the table" already specifies it.
    - Example: If Word Bank is ["I", "am", "a", "student"] and user writes "I am a student", give 100/100 even if institutional context suggests adding "at Tecnológico Nacional de México".

16. *** ABSOLUTELY CRITICAL - UNSCRAMBLE EXERCISES (Type: 'unscramble') ***
   - These exercises provide a "Word Bank" with EXACTLY the words the user must use.
   - Evaluate ONLY if the user formed a grammatically correct sentence using EXACTLY the words from the Word Bank.
   - DO NOT require additional words like institution names, places, or context if those words are NOT in the Word Bank.
   - If the user used ALL words from the bank in a grammatically correct order, give FULL CREDIT (100/100).
   - NEVER penalize or give partial credit if the user correctly ordered the words but didn't add extra context words.
   - Example: If Word Bank is ["I", "am", "a", "student"] and user writes "I am a student", give 100/100 even if institutional context suggests adding "at Tecnológico Nacional de México".

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

EXERCISE FORMAT by skill:
- grammar: Multiple choice with 3 options. Each exercise has "question", "options" (array of 3 strings), "answer".
- vocabulary: Fill-in-the-blank. Each exercise has "question", "answer".
- reading: Short paragraph + 3 comprehension questions. Return "text" and "questions" array.
- listening: Short dialogue script + 3 questions. Return "script" and "questions" array.
- writing: 3 sentence writing prompts. Each exercise has "question", "answer".
- pronunciation: 3 speaking prompts. Each exercise has "prompt".

16. *** ABSOLUTELY CRITICAL - UNSCRAMBLE EXERCISES (Type: 'unscramble') ***
   - These exercises provide a "Word Bank" with EXACTLY the words the user must use.
   - Evaluate ONLY if the user formed a grammatically correct sentence using EXACTLY the words from the Word Bank.
   - DO NOT require additional words like institution names, places, or context if those words are NOT in the Word Bank.
   - If the user used ALL words from the bank in a grammatically correct order, give FULL CREDIT (100/100).
   - NEVER penalize or give partial credit if the user correctly ordered the words but didn't add extra context words.
   - Example: If Word Bank is ["I", "am", "a", "student"] and user writes "I am a student", give 100/100 even if institutional context suggests adding "at Tecnológico Nacional de México".

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
                rf"(?i)(us[ae]|prueb|intent)\s+['\"]?{re.escape(correct)}['\"]?",
            ]

            for pattern in reveal_patterns:
                fb = re.sub(pattern, "Recuerda la regla gramatical correspondiente.", fb)

            r["feedback"] = fb

        return result


tutor = TutorService()