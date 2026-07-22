#!/usr/bin/env python3
"""
Script to restructure course_content.json:
1. Add 3 new core lessons (ST10, ST11, ST12)
2. Move old ST10 to ST13
3. Fix viajes dialogues (add A:/B: labels)
4. Fix vida_diaria dialogues (unique content per lesson)
5. Add variant lessons 11-13 for both variants
"""

import json
import os
import shutil

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE, "api", "data", "course_content.json")
BACKUP_PATH = DATA_PATH + ".bak_restructure"

# ============================================================
# NEW CORE LESSONS DATA
# ============================================================

LESSON_10_PRESENT_CONTINUOUS = {
    "subtopic_id": "A1-M01-ST10",
    "title": "Present Continuous",
    "sequence_order": 10,
    "mcer_descriptor": "Puede describir acciones que están ocurriendo ahora y planes futuros cercanos.",
    "mcer_goal": "Talk about actions happening now and near future plans",
    "can_do_statements": [
        "I can say what I am doing right now.",
        "I can say what someone else is doing.",
        "I can talk about my plans for this week."
    ],
    "kb_reference_id": "KB-GRAM-PC-01",
    "theory": "The Present Continuous is formed with: Subject + am/is/are + verb-ing. Use it for actions happening now (I am reading), and for future plans (I am meeting my friend tomorrow). Keywords: now, right now, at the moment, today, this week, tomorrow, next week.",
    "vocabulary": [
        "am", "is", "are", "reading", "writing", "studying",
        "eating", "sleeping", "playing", "working", "cooking",
        "driving", "listening", "watching", "now", "today",
        "right now", "at the moment", "tomorrow", "next week"
    ],
    "common_mistakes": [
        {
            "error": "I reading a book.",
            "correction": "I am reading a book.",
            "explanation": "Present Continuous needs the auxiliary verb 'am/is/are' before the -ing form."
        },
        {
            "error": "She is read a book.",
            "correction": "She is reading a book.",
            "explanation": "In Present Continuous, the main verb takes -ing form, not the base form."
        }
    ],
    "exercises": {
        "grammar": [
            {
                "id": "G10-01",
                "type": "multiple_choice",
                "question": "I ___ reading a book.",
                "options": ["am", "is", "are"],
                "answer": "am"
            },
            {
                "id": "G10-02",
                "type": "multiple_choice",
                "question": "She ___ studying English.",
                "options": ["am", "is", "are"],
                "answer": "is"
            },
            {
                "id": "G10-03",
                "type": "multiple_choice",
                "question": "They ___ playing soccer.",
                "options": ["am", "is", "are"],
                "answer": "are"
            },
            {
                "id": "G10-04",
                "type": "multiple_choice",
                "question": "We ___ eating lunch.",
                "options": ["am", "is", "are"],
                "answer": "are"
            },
            {
                "id": "G10-05",
                "type": "multiple_choice",
                "question": "He ___ sleeping right now.",
                "options": ["am", "is", "are"],
                "answer": "is"
            },
            {
                "id": "G10-06",
                "type": "unscramble",
                "words": ["I", "am", "studying", "English"],
                "answer": "I am studying English"
            },
            {
                "id": "G10-07",
                "type": "unscramble",
                "words": ["She", "is", "reading", "a", "book"],
                "answer": "She is reading a book"
            },
            {
                "id": "G10-08",
                "type": "unscramble",
                "words": ["They", "are", "watching", "TV"],
                "answer": "They are watching TV"
            },
            {
                "id": "G10-09",
                "type": "fill_blank",
                "question": "I ___ eating breakfast right now.",
                "answer": "am"
            },
            {
                "id": "G10-10",
                "type": "fill_blank",
                "question": "He ___ playing football at the moment.",
                "answer": "is"
            }
        ],
        "vocabulary": [
            {"id": "V10-01", "question": "Accion de mirar un libro.", "answer": "reading"},
            {"id": "V10-02", "question": "Accion de estudiar (gerundio).", "answer": "studying"},
            {"id": "V10-03", "question": "Accion de comer (gerundio).", "answer": "eating"},
            {"id": "V10-04", "question": "Accion de dormir (gerundio).", "answer": "sleeping"},
            {"id": "V10-05", "question": "Accion de jugar (gerundio).", "answer": "playing"},
            {"id": "V10-06", "question": "Accion de trabajar (gerundio).", "answer": "working"},
            {"id": "V10-07", "question": "Verbo auxiliar para I.", "answer": "am"},
            {"id": "V10-08", "question": "Verbo auxiliar para he/she/it.", "answer": "is"},
            {"id": "V10-09", "question": "Verbo auxiliar para we/they.", "answer": "are"},
            {"id": "V10-10", "question": "Palabra clave: ahora mismo.", "answer": "right now"}
        ],
        "reading": {
            "text": "It is 3 PM. Maria is at the library. She is studying for her English exam. Her friend Carlos is at home. He is cooking dinner. Maria's mother is at work. She is writing an email. Carlos's brother is in the garden. He is playing with the dog. Everyone is busy right now.",
            "questions": [
                {"id": "R10-01", "question": "Where is Maria?", "options": ["At home", "At the library", "At work"], "answer": "At the library"},
                {"id": "R10-02", "question": "What is Maria doing?", "options": ["Cooking", "Studying", "Playing"], "answer": "Studying"},
                {"id": "R10-03", "question": "Where is Carlos?", "options": ["At the library", "At school", "At home"], "answer": "At home"},
                {"id": "R10-04", "question": "What is Carlos doing?", "options": ["Studying", "Cooking dinner", "Sleeping"], "answer": "Cooking dinner"},
                {"id": "R10-05", "question": "Where is Maria's mother?", "options": ["At home", "At the library", "At work"], "answer": "At work"},
                {"id": "R10-06", "question": "What is she doing?", "options": ["Reading", "Writing an email", "Studying"], "answer": "Writing an email"},
                {"id": "R10-07", "question": "Where is Carlos's brother?", "options": ["In the kitchen", "In the garden", "At school"], "answer": "In the garden"},
                {"id": "R10-08", "question": "What is the brother doing?", "options": ["Studying", "Eating", "Playing with the dog"], "answer": "Playing with the dog"},
                {"id": "R10-09", "question": "What time is it?", "options": ["3 AM", "3 PM", "9 PM"], "answer": "3 PM"},
                {"id": "R10-10", "question": "Is everyone busy?", "options": ["Yes", "No"], "answer": "Yes"}
            ]
        },
        "listening": {
            "script": "A: Hi! What are you doing? B: I am reading a book. It is very interesting! A: Oh, are you reading the new novel? B: Yes, I am. I am loving it! What are you doing? A: I am studying English. I am learning a lot!",
            "questions": [
                {"id": "L10-01", "question": "What is person B doing?", "options": ["Studying", "Reading a book", "Eating"], "answer": "Reading a book"},
                {"id": "L10-02", "question": "Is the book interesting?", "options": ["Yes", "No"], "answer": "Yes"},
                {"id": "L10-03", "question": "Is B reading the new novel?", "options": ["Yes", "No"], "answer": "Yes"},
                {"id": "L10-04", "question": "What is person A doing?", "options": ["Reading", "Studying English", "Sleeping"], "answer": "Studying English"},
                {"id": "L10-05", "question": "How does A feel about learning?", "options": ["Sad", "Tired", "Learning a lot"], "answer": "Learning a lot"},
                {"id": "L10-06", "question": "Is B studying?", "options": ["Yes", "No"], "answer": "No"},
                {"id": "L10-07", "question": "Is A reading?", "options": ["Yes", "No"], "answer": "No"},
                {"id": "L10-08", "question": "How many people are talking?", "options": ["One", "Two", "Three"], "answer": "Two"},
                {"id": "L10-09", "question": "Are they talking about food?", "options": ["Yes", "No"], "answer": "No"},
                {"id": "L10-10", "question": "Is the conversation about activities?", "options": ["Yes", "No"], "answer": "Yes"}
            ]
        },
        "speaking": [
            {"id": "S10-01", "prompt": "Say: 'I am studying English right now.'"},
            {"id": "S10-02", "prompt": "Say: 'She is reading a book at the moment.'"},
            {"id": "S10-03", "prompt": "Say: 'They are playing soccer today.'"},
            {"id": "S10-04", "prompt": "Say: 'We are cooking dinner.'"},
            {"id": "S10-05", "prompt": "Say: 'I am meeting my friend tomorrow.'"},
            {"id": "S10-06", "prompt": "Say: 'He is working right now.'"},
            {"id": "S10-07", "prompt": "Say: 'What are you doing at the moment?'"},
            {"id": "S10-08", "prompt": "Say: 'She is sleeping right now.'"},
            {"id": "S10-09", "prompt": "Say: 'I am not watching TV. I am studying.'"},
            {"id": "S10-10", "prompt": "Describe what 3 people around you are doing right now."}
        ],
        "writing": [
            {"id": "W10-01", "type": "unscramble", "words": ["I", "am", "reading", "a", "book"], "answer": "I am reading a book"},
            {"id": "W10-02", "type": "unscramble", "words": ["She", "is", "cooking", "dinner"], "answer": "She is cooking dinner"},
            {"id": "W10-03", "type": "unscramble", "words": ["They", "are", "playing", "soccer"], "answer": "They are playing soccer"},
            {"id": "W10-04", "question": "Write: Estoy estudiando ingles ahora.", "answer": "I am studying English now"},
            {"id": "W10-05", "question": "Write: Ella esta leyendo un libro.", "answer": "She is reading a book"},
            {"id": "W10-06", "question": "Write: Ellos estan jugando futbol.", "answer": "They are playing soccer"},
            {"id": "W10-07", "question": "Write: Nosotros estamos comiendo.", "answer": "We are eating"},
            {"id": "W10-08", "type": "fill_blank", "question": "He ___ sleeping. (is/am/are)", "answer": "is"},
            {"id": "W10-09", "type": "fill_blank", "question": "We ___ cooking dinner. (is/am/are)", "answer": "are"},
            {"id": "W10-10", "type": "unscramble", "words": ["What", "are", "you", "doing", "now"], "answer": "What are you doing now"}
        ],
        "pronunciation": [
            {"id": "P10-01", "phrase": "I am reading a book.", "focus": "'reading' stress on first syllable"},
            {"id": "P10-02", "phrase": "She is studying English.", "focus": "'studying' stress on first syllable"},
            {"id": "P10-03", "phrase": "They are playing soccer.", "focus": "'playing' has a long 'a' sound"},
            {"id": "P10-04", "phrase": "What are you doing now?", "focus": "Stress on 'doing' and 'now'"},
            {"id": "P10-05", "phrase": "I am not sleeping.", "focus": "'not' is stressed for negation"},
            {"id": "P10-06", "phrase": "We are cooking dinner.", "focus": "'cooking' stress on first syllable"},
            {"id": "P10-07", "phrase": "He is working right now.", "focus": "'working' has a soft 'r' sound"},
            {"id": "P10-08", "phrase": "I am meeting my friend tomorrow.", "focus": "'meeting' sounds like 'mee-ting'"},
            {"id": "P10-09", "phrase": "Are you studying?", "focus": "Rising intonation for questions"},
            {"id": "P10-10", "phrase": "She is listening to music.", "focus": "'listening' stress on first syllable"}
        ]
    }
}

LESSON_11_MODAL_CAN = {
    "subtopic_id": "A1-M01-ST11",
    "title": "Modal Verb 'Can'",
    "sequence_order": 11,
    "mcer_descriptor": "Puede hablar sobre habilidades, pedir permiso y hacer solicitudes.",
    "mcer_goal": "Talk about abilities, ask for permission, and make requests",
    "can_do_statements": [
        "I can talk about what I can and cannot do.",
        "I can ask for permission using 'Can I...?'",
        "I can make polite requests using 'Can you...?'"
    ],
    "kb_reference_id": "KB-GRAM-CAN-01",
    "theory": "The modal verb 'can' is used for ability, permission, and requests. Structure: Subject + can + base verb (no 'to'). Negative: can't (cannot). Questions: Can + subject + base verb? Examples: I can swim. Can I open the window? Can you help me?",
    "vocabulary": [
        "can", "can't", "cannot", "swim", "dance", "sing",
        "play", "cook", "drive", "speak", "help", "open",
        "close", "pass", "teach", "learn", "ask", "tell"
    ],
    "common_mistakes": [
        {
            "error": "I can to swim.",
            "correction": "I can swim.",
            "explanation": "Modal verbs like 'can' are followed directly by the base verb, never 'to + verb'."
        },
        {
            "error": "Can you to help me?",
            "correction": "Can you help me?",
            "explanation": "In questions with 'can', the base verb follows the subject directly without 'to'."
        }
    ],
    "exercises": {
        "grammar": [
            {
                "id": "G11-01",
                "type": "multiple_choice",
                "question": "I ___ speak English.",
                "options": ["can", "can't", "am"],
                "answer": "can"
            },
            {
                "id": "G11-02",
                "type": "multiple_choice",
                "question": "She ___ dance very well.",
                "options": ["can", "is", "does"],
                "answer": "can"
            },
            {
                "id": "G11-03",
                "type": "multiple_choice",
                "question": "___ you help me?",
                "options": ["Can", "Do", "Are"],
                "answer": "Can"
            },
            {
                "id": "G11-04",
                "type": "multiple_choice",
                "question": "He ___ not drive.",
                "options": ["can", "is", "does"],
                "answer": "can"
            },
            {
                "id": "G11-05",
                "type": "multiple_choice",
                "question": "___ I open the window?",
                "options": ["Can", "Do", "Am"],
                "answer": "Can"
            },
            {
                "id": "G11-06",
                "type": "unscramble",
                "words": ["I", "can", "play", "guitar"],
                "answer": "I can play guitar"
            },
            {
                "id": "G11-07",
                "type": "unscramble",
                "words": ["Can", "you", "speak", "Spanish"],
                "answer": "Can you speak Spanish"
            },
            {
                "id": "G11-08",
                "type": "unscramble",
                "words": ["She", "can", "dance", "very", "well"],
                "answer": "She can dance very well"
            },
            {
                "id": "G11-09",
                "type": "fill_blank",
                "question": "I ___ swim very fast. (can/can't)",
                "answer": "can"
            },
            {
                "id": "G11-10",
                "type": "fill_blank",
                "question": "He ___ cook. (can/can't)",
                "answer": "can't"
            }
        ],
        "vocabulary": [
            {"id": "V11-01", "question": "Habilidad para nadar.", "answer": "can"},
            {"id": "V11-02", "question": "Negacion de habilidad.", "answer": "can't"},
            {"id": "V11-03", "question": "Accion de moverse al ritmo de musica.", "answer": "dance"},
            {"id": "V11-04", "question": "Accion de producir musica con la voz.", "answer": "sing"},
            {"id": "V11-05", "question": "Accion de practicar un deporte o juego.", "answer": "play"},
            {"id": "V11-06", "question": "Accion de preparar comida.", "answer": "cook"},
            {"id": "V11-07", "question": "Accion de conducir un auto.", "answer": "drive"},
            {"id": "V11-08", "question": "Accion de usar una lengua.", "answer": "speak"},
            {"id": "V11-09", "question": "Pedir asistencia.", "answer": "help"},
            {"id": "V11-10", "question": "Pedir permiso para abrir.", "answer": "open"}
        ],
        "reading": {
            "text": "My name is Sofia. I can speak two languages: Spanish and English. I can also play the piano and sing. My brother Carlos can play soccer and basketball. He can also cook very well. He makes delicious tacos! My mother can drive and dance. She cannot sing, but she tries! My father can swim and play guitar. He cannot cook at all. Our family is very talented!",
            "questions": [
                {"id": "R11-01", "question": "How many languages can Sofia speak?", "options": ["One", "Two", "Three"], "answer": "Two"},
                {"id": "R11-02", "question": "What instrument can Sofia play?", "options": ["Guitar", "Piano", "Violin"], "answer": "Piano"},
                {"id": "R11-03", "question": "What sports can Carlos play?", "options": ["Tennis and golf", "Soccer and basketball", "Swimming and running"], "answer": "Soccer and basketball"},
                {"id": "R11-04", "question": "What can Carlos cook?", "options": ["Pasta", "Pizza", "Tacos"], "answer": "Tacos"},
                {"id": "R11-05", "question": "What can the mother do?", "options": ["Sing and dance", "Drive and dance", "Swim and cook"], "answer": "Drive and dance"},
                {"id": "R11-06", "question": "Can the mother sing?", "options": ["Yes", "No", "Not mentioned"], "answer": "No"},
                {"id": "R11-07", "question": "What can the father swim?", "options": ["He can swim", "He cannot swim", "Not mentioned"], "answer": "He can swim"},
                {"id": "R11-08", "question": "Can the father cook?", "options": ["Yes, he cooks well", "No, not at all", "He tries"], "answer": "No, not at all"},
                {"id": "R11-09", "question": "Can Sofia sing?", "options": ["Yes", "No", "Not mentioned"], "answer": "Yes"},
                {"id": "R11-10", "question": "Is the family talented?", "options": ["Yes", "No", "Only the father"], "answer": "Yes"}
            ]
        },
        "listening": {
            "script": "A: Can you speak Spanish? B: No, I can't. But I can speak English and French. A: Wow! Can you teach me some French? B: Yes, I can! Can I ask you a question? A: Yes, of course. B: Can you help me with my English homework? A: Yes, I can! Let's do it together.",
            "questions": [
                {"id": "L11-01", "question": "Can person B speak Spanish?", "options": ["Yes", "No"], "answer": "No"},
                {"id": "L11-02", "question": "What languages can B speak?", "options": ["Spanish and English", "English and French", "French and Spanish"], "answer": "English and French"},
                {"id": "L11-03", "question": "Can A teach French?", "options": ["Yes", "No", "Not mentioned"], "answer": "No"},
                {"id": "L11-04", "question": "What does B ask to learn?", "options": ["English", "French", "Spanish"], "answer": "French"},
                {"id": "L11-05", "question": "What does B need help with?", "options": ["French homework", "English homework", "Math homework"], "answer": "English homework"},
                {"id": "L11-06", "question": "Can A help with homework?", "options": ["Yes", "No"], "answer": "Yes"},
                {"id": "L11-07", "question": "How many languages are mentioned?", "options": ["One", "Two", "Three"], "answer": "Three"},
                {"id": "L11-08", "question": "Is B polite when asking?", "options": ["Yes", "No"], "answer": "Yes"},
                {"id": "L11-09", "question": "Do they agree to work together?", "options": ["Yes", "No"], "answer": "Yes"},
                {"id": "L11-10", "question": "What is the conversation mainly about?", "options": ["Languages and abilities", "Food", "Travel"], "answer": "Languages and abilities"}
            ]
        },
        "speaking": [
            {"id": "S11-01", "prompt": "Say: 'I can speak English.'"},
            {"id": "S11-02", "prompt": "Say: 'She can play the guitar.'"},
            {"id": "S11-03", "prompt": "Say: 'Can you help me, please?'"},
            {"id": "S11-04", "prompt": "Say: 'I can't cook, but I can dance.'"},
            {"id": "S11-05", "prompt": "Say: 'Can I open the window?'"},
            {"id": "S11-06", "prompt": "Say: 'He can swim very fast.'"},
            {"id": "S11-07", "prompt": "Say: 'They can play soccer.'"},
            {"id": "S11-08", "prompt": "Say: 'Can you speak French?'"},
            {"id": "S11-09", "prompt": "Say: 'I can't sing, but I can play piano.'"},
            {"id": "S11-10", "prompt": "List 3 things you can do and 3 things you can't do."}
        ],
        "writing": [
            {"id": "W11-01", "type": "unscramble", "words": ["I", "can", "speak", "English"], "answer": "I can speak English"},
            {"id": "W11-02", "type": "unscramble", "words": ["Can", "you", "help", "me"], "answer": "Can you help me"},
            {"id": "W11-03", "type": "unscramble", "words": ["She", "can't", "cook"], "answer": "She can't cook"},
            {"id": "W11-04", "question": "Write: El puede nadar.", "answer": "He can swim"},
            {"id": "W11-05", "question": "Write: Tu puedes bailar?", "answer": "Can you dance"},
            {"id": "W11-06", "question": "Write: Nosotros no podemos cocinar.", "answer": "We can't cook"},
            {"id": "W11-07", "question": "Write: Ella puede tocar piano.", "answer": "She can play piano"},
            {"id": "W11-08", "type": "fill_blank", "question": "I ___ sing. (can/can't)", "answer": "can"},
            {"id": "W11-09", "type": "fill_blank", "question": "___ she play guitar? (Can/Do)", "answer": "Can"},
            {"id": "W11-10", "type": "unscramble", "words": ["He", "can", "dance", "very", "well"], "answer": "He can dance very well"}
        ],
        "pronunciation": [
            {"id": "P11-01", "phrase": "I can swim.", "focus": "'can' is often reduced to /kən/ in fast speech"},
            {"id": "P11-02", "phrase": "Can you help me?", "focus": "'Can you' sounds like 'Canya' in fast speech"},
            {"id": "P11-03", "phrase": "I can't dance.", "focus": "'can't' has a long 'a' sound /kænt/"},
            {"id": "P11-04", "phrase": "She can play the piano.", "focus": "'play' has a long 'a' sound"},
            {"id": "P11-05", "phrase": "Can I open the window?", "focus": "Rising intonation for permission question"},
            {"id": "P11-06", "phrase": "He can speak French.", "focus": "'speak' has a long 'e' sound"},
            {"id": "P11-07", "phrase": "We can cook dinner.", "focus": "'cook' has a short 'oo' sound"},
            {"id": "P11-08", "phrase": "They can't swim.", "focus": "Stress on 'can't' for negation"},
            {"id": "P11-09", "phrase": "Can you teach me?", "focus": "'teach' has a long 'ee' sound"},
            {"id": "P11-10", "phrase": "I can't sing, but I can play guitar.", "focus": "Stress on 'can't' and 'can' to show contrast"}
        ]
    }
}

LESSON_12_FAMILY_HOME = {
    "subtopic_id": "A1-M01-ST12",
    "title": "My Family & My Home",
    "sequence_order": 12,
    "mcer_descriptor": "Puede describir a su familia y su hogar usando vocabulario y gramática básica.",
    "mcer_goal": "Describe your family members and your home using basic grammar",
    "can_do_statements": [
        "I can name my family members.",
        "I can describe my house or apartment.",
        "I can say how many rooms and people there are."
    ],
    "kb_reference_id": "KB-VOC-FAM-01",
    "theory": "Family vocabulary: mother, father, sister, brother, grandparents, aunt, uncle, cousin. House vocabulary: bedroom, living room, kitchen, bathroom, garden, garage. Use 'There is/There are' to describe rooms. Use 'I have' for family. Use adjectives: big, small, old, new, beautiful, comfortable.",
    "vocabulary": [
        "mother", "father", "sister", "brother", "grandparents",
        "aunt", "uncle", "cousin", "bedroom", "living room",
        "kitchen", "bathroom", "garden", "big", "small",
        "old", "new", "beautiful", "comfortable", "family"
    ],
    "common_mistakes": [
        {
            "error": "I have a brother. His name are Juan.",
            "correction": "I have a brother. His name is Juan.",
            "explanation": "Use 'is' with singular names: His name is Juan."
        },
        {
            "error": "There is three bedrooms.",
            "correction": "There are three bedrooms.",
            "explanation": "Use 'there are' with plural nouns: There are three bedrooms."
        }
    ],
    "exercises": {
        "grammar": [
            {
                "id": "G12-01",
                "type": "multiple_choice",
                "question": "There ___ three bedrooms in my house.",
                "options": ["is", "are", "am"],
                "answer": "are"
            },
            {
                "id": "G12-02",
                "type": "multiple_choice",
                "question": "I ___ two sisters.",
                "options": ["have", "has", "am"],
                "answer": "have"
            },
            {
                "id": "G12-03",
                "type": "multiple_choice",
                "question": "My mother ___ a teacher.",
                "options": ["am", "is", "are"],
                "answer": "is"
            },
            {
                "id": "G12-04",
                "type": "multiple_choice",
                "question": "There ___ a big garden.",
                "options": ["is", "are", "am"],
                "answer": "is"
            },
            {
                "id": "G12-05",
                "type": "multiple_choice",
                "question": "Her grandparents ___ from Mexico.",
                "options": ["am", "is", "are"],
                "answer": "are"
            },
            {
                "id": "G12-06",
                "type": "unscramble",
                "words": ["I", "have", "two", "brothers"],
                "answer": "I have two brothers"
            },
            {
                "id": "G12-07",
                "type": "unscramble",
                "words": ["There", "is", "a", "kitchen", "big"],
                "answer": "There is a big kitchen"
            },
            {
                "id": "G12-08",
                "type": "unscramble",
                "words": ["My", "father", "is", "a", "doctor"],
                "answer": "My father is a doctor"
            },
            {
                "id": "G12-09",
                "type": "fill_blank",
                "question": "There ___ five people in my family.",
                "answer": "are"
            },
            {
                "id": "G12-10",
                "type": "fill_blank",
                "question": "I ___ a small house.",
                "answer": "have"
            }
        ],
        "vocabulary": [
            {"id": "V12-01", "question": "Femenino de 'father'.", "answer": "mother"},
            {"id": "V12-02", "question": "Masculino de 'mother'.", "answer": "father"},
            {"id": "V12-03", "question": "Hermana (femenino).", "answer": "sister"},
            {"id": "V12-04", "question": "Hermano (masculino).", "answer": "brother"},
            {"id": "V12-05", "question": "Lugar donde duermes.", "answer": "bedroom"},
            {"id": "V12-06", "question": "Lugar donde cocinas.", "answer": "kitchen"},
            {"id": "V12-07", "question": "Lugar donde te banas.", "answer": "bathroom"},
            {"id": "V12-08", "question": "Lugar donde ves电视.", "answer": "living room"},
            {"id": "V12-09", "question": "Antepasados de tus padres.", "answer": "grandparents"},
            {"id": "V12-10", "question": "Hijo de tu tio/tia.", "answer": "cousin"}
        ],
        "reading": {
            "text": "I have a big family. My mother's name is Ana. She is a teacher. My father's name is Carlos. He is a doctor. I have one brother and one sister. My brother's name is Luis. He is 15 years old. My sister's name is Sofia. She is 10 years old. We live in a house. There are three bedrooms, a kitchen, a living room, and a bathroom. There is also a small garden. I love my family!",
            "questions": [
                {"id": "R12-01", "question": "Is the family big or small?", "options": ["Big", "Small"], "answer": "Big"},
                {"id": "R12-02", "question": "What is the mother's job?", "options": ["Doctor", "Teacher", "Engineer"], "answer": "Teacher"},
                {"id": "R12-03", "question": "What is the father's job?", "options": ["Teacher", "Driver", "Doctor"], "answer": "Doctor"},
                {"id": "R12-04", "question": "How old is Luis?", "options": ["10", "15", "20"], "answer": "15"},
                {"id": "R12-05", "question": "What is Sofia's name?", "options": ["Ana", "Sofia", "Maria"], "answer": "Sofia"},
                {"id": "R12-06", "question": "How many bedrooms are there?", "options": ["Two", "Three", "Four"], "answer": "Three"},
                {"id": "R12-07", "question": "Is there a garden?", "options": ["Yes", "No"], "answer": "Yes"},
                {"id": "R12-08", "question": "Do they live in an apartment?", "options": ["Yes", "No"], "answer": "No"},
                {"id": "R12-09", "question": "How many siblings does the narrator have?", "options": ["One", "Two", "Three"], "answer": "Two"},
                {"id": "R12-10", "question": "Does the narrator love their family?", "options": ["Yes", "No"], "answer": "Yes"}
            ]
        },
        "listening": {
            "script": "A: How many people are there in your family? B: There are five people: my parents, my sister, my brother, and me. A: Where do you live? B: We live in a house. There are three bedrooms and a garden. A: Is your house big? B: No, it's small but comfortable. I love my home!",
            "questions": [
                {"id": "L12-01", "question": "How many people are in the family?", "options": ["Three", "Four", "Five"], "answer": "Five"},
                {"id": "L12-02", "question": "Where do they live?", "options": ["Apartment", "House", "Condo"], "answer": "House"},
                {"id": "L12-03", "question": "How many bedrooms are there?", "options": ["Two", "Three", "Four"], "answer": "Three"},
                {"id": "L12-04", "question": "Is there a garden?", "options": ["Yes", "No"], "answer": "Yes"},
                {"id": "L12-05", "question": "Is the house big?", "options": ["Yes", "No"], "answer": "No"},
                {"id": "L12-06", "question": "How does the person describe the house?", "options": ["Big and old", "Small but comfortable", "Large and modern"], "answer": "Small but comfortable"},
                {"id": "L12-07", "question": "Does the person love their home?", "options": ["Yes", "No"], "answer": "Yes"},
                {"id": "L12-08", "question": "Who are the five people?", "options": ["Parents, sister, brother, me", "Grandparents, parents, me", "Mother, father, two sisters"], "answer": "Parents, sister, brother, me"},
                {"id": "L12-09", "question": "How many questions does A ask?", "options": ["Two", "Three", "Four"], "answer": "Three"},
                {"id": "L12-10", "question": "Is the conversation about family and home?", "options": ["Yes", "No"], "answer": "Yes"}
            ]
        },
        "speaking": [
            {"id": "S12-01", "prompt": "Say: 'I have two brothers and one sister.'"},
            {"id": "S12-02", "prompt": "Say: 'My mother is a teacher.'"},
            {"id": "S12-03", "prompt": "Say: 'There are three bedrooms in my house.'"},
            {"id": "S12-04", "prompt": "Say: 'My house is small but comfortable.'"},
            {"id": "S12-05", "prompt": "Say: 'I love my family.'"},
            {"id": "S12-06", "prompt": "Say: 'There is a big kitchen in my home.'"},
            {"id": "S12-07", "prompt": "Say: 'My grandfather is 70 years old.'"},
            {"id": "S12-08", "prompt": "Say: 'We live in a house with a garden.'"},
            {"id": "S12-09", "prompt": "Say: 'My sister is 10 years old.'"},
            {"id": "S12-10", "prompt": "Describe your family and home in 3 sentences."}
        ],
        "writing": [
            {"id": "W12-01", "type": "unscramble", "words": ["I", "have", "a", "big", "family"], "answer": "I have a big family"},
            {"id": "W12-02", "type": "unscramble", "words": ["There", "are", "three", "bedrooms"], "answer": "There are three bedrooms"},
            {"id": "W12-03", "type": "unscramble", "words": ["My", "mother", "is", "a", "teacher"], "answer": "My mother is a teacher"},
            {"id": "W12-04", "question": "Write: Tengo dos hermanas.", "answer": "I have two sisters"},
            {"id": "W12-05", "question": "Write: Hay un jardin grande.", "answer": "There is a big garden"},
            {"id": "W12-06", "question": "Write: Mi padre es doctor.", "answer": "My father is a doctor"},
            {"id": "W12-07", "question": "Write: Vivimos en una casa.", "answer": "We live in a house"},
            {"id": "W12-08", "type": "fill_blank", "question": "There ___ a bathroom. (is/are)", "answer": "is"},
            {"id": "W12-09", "type": "fill_blank", "question": "I ___ three cousins. (have/has)", "answer": "have"},
            {"id": "W12-10", "type": "unscramble", "words": ["My", "house", "is", "small", "but", "comfortable"], "answer": "My house is small but comfortable"}
        ],
        "pronunciation": [
            {"id": "P12-01", "phrase": "I have a big family.", "focus": "Stress on 'big' and 'family'"},
            {"id": "P12-02", "phrase": "My mother is a teacher.", "focus": "'mother' stress on first syllable"},
            {"id": "P12-03", "phrase": "There are three bedrooms.", "focus": "'three' has a 'th' sound"},
            {"id": "P12-04", "phrase": "The kitchen is beautiful.", "focus": "'beautiful' stress on first syllable"},
            {"id": "P12-05", "phrase": "My grandfather is seventy.", "focus": "'seventy' stress on first syllable"},
            {"id": "P12-06", "phrase": "We live in a comfortable house.", "focus": "'comfortable' stress on first syllable"},
            {"id": "P12-07", "phrase": "There is a garden.", "focus": "'garden' stress on first syllable"},
            {"id": "P12-08", "phrase": "My sister is ten years old.", "focus": "'sister' has a short 'i' sound"},
            {"id": "P12-09", "phrase": "I love my family.", "focus": "Stress on 'love' and 'family'"},
            {"id": "P12-10", "phrase": "There are five people in my family.", "focus": "'five' has a long 'i' sound"}
        ]
    }
}


def fix_viajes_dialogue(lesson_num, original_script):
    """Convert viajes monologues to A:/B: dialogue format."""
    fixes = {
        1: "A: Hi! My name is Carlos. What is your name? B: My name is Maria. I am a tourist too. A: Where are you from? B: I am from Guadalajara, Mexico. A: Me too! Are you going to New York? B: Yes, I am! Is your passport ready? A: Yes, it is. The airplane is big. Let's go!",
        2: "A: Are you a traveler? B: Yes, I am. I am from Mexico City. A: Is he a traveler too? B: No, he is not. He is from Canada. A: Where is the hotel? B: It is near the airport. A: Is the gate open? B: No, it is not open yet.",
        3: "A: What is your flight number? B: My flight is MX456. A: Where are you going? B: I am going to Paris. A: When is the flight? B: It is at 10:00 AM. A: What is your name? B: My name is Ana. Nice to meet you!",
        4: "A: Have you been to Paris? B: Yes, I have! It is romantic. A: Are the buildings old? B: Yes, they are. And the food is delicious. A: Is the Eiffel Tower amazing? B: Yes, it is! I love Paris!",
        5: "A: What time do you wake up when you travel? B: I wake up at 5 AM. A: That is early! What do you do? B: I eat breakfast quickly and take a taxi to the airport. A: Do you check your ticket? B: Yes, I do. Then I walk to the gate.",
        6: "A: Do you want to book a room? B: Yes, I want a room for three nights. A: Is the receptionist nice? B: Yes, she is very nice. A: What kind of room do you want? B: I want a suite with a view. The bill is reasonable.",
        7: "A: Are you ready to order? B: Yes, I want fish for dinner. A: Good choice! Do you want to see the menu? B: Yes, please. I call the waiter. A: Enjoy your food! B: Thank you! The food is delicious.",
        8: "A: What do you want to buy? B: I want to buy a souvenir for my friend. A: Do you like this market? B: Yes, I do. I visit the market every day. A: What is the price? B: It is not expensive. I pay with cash.",
        9: "A: Can you help me? I am lost. B: Where are you trying to go? A: Where is the airport? B: It is not far. Can you take a bus? A: Yes, I can. Thank you! B: The sign is helpful. You will find it.",
        10: "A: What are your travel plans? B: I am going to travel next year. A: Where are you going? B: I am going to visit Tokyo. A: Are you going to book a hotel? B: Yes, I am. I am going to buy tickets and pack my luggage."
    }
    return fixes.get(lesson_num, original_script)


def fix_vida_diaria_dialogues():
    """Create unique dialogues for each vida_diaria lesson."""
    return {
        1: "A: What do you like about your neighborhood? B: I like the parks and the stores. A: Is it quiet? B: Yes, it is very quiet and safe.",
        2: "A: Where do you live? B: I live on Main Street. A: Is there a store near your house? B: Yes, there is a grocery store on the corner.",
        3: "A: What is your address? B: My address is 123 Oak Avenue. A: What floor do you live on? B: I live on the second floor. A: Is there an elevator? B: No, there isn't. But the stairs are fine.",
        4: "A: Can you describe your house? B: Yes! There are three bedrooms and two bathrooms. A: Is there a garden? B: Yes, there is a small garden in the back. A: That sounds nice!",
        5: "A: What time do you wake up? B: I wake up at 6:30 AM. A: What do you do first? B: I take a shower and eat breakfast. A: What do you eat? B: I eat cereal and drink coffee.",
        6: "A: How many people are in your family? B: There are four: my parents, my sister, and me. A: Do you live with your grandparents? B: No, they live nearby. A: Do you see them often? B: Yes, every Sunday!",
        7: "A: What do you need from the store? B: I need milk, bread, and eggs. A: Is there a supermarket near you? B: Yes, there is one on Park Street. A: How much is the milk? B: It is about two dollars.",
        8: "A: What stores are near your house? B: There is a pharmacy and a bakery. A: Do you go to the bakery? B: Yes, I buy fresh bread every morning. A: That sounds delicious!",
        9: "A: Do you know your neighbors? B: Yes, my neighbor is very friendly. A: What is her name? B: Her name is Rosa. A: Do you help each other? B: Yes, she helps me with gardening and I help her carry groceries.",
        10: "A: What do you usually do on weekends? B: I relax at home and cook with my family. A: Do you go out? B: Sometimes. I go to the park with my friends. A: That sounds fun! B: Yes, I love weekends!"
    }


def renumber_st10_to_st13(lessons):
    """Move old ST10 (sequence_order 10) to ST13 (sequence_order 13)."""
    for lesson in lessons:
        if lesson.get("subtopic_id") == "A1-M01-ST10":
            lesson["subtopic_id"] = "A1-M01-ST13"
            lesson["sequence_order"] = 13
            lesson["title"] = "Review & Final Module Test"
            lesson["mcer_descriptor"] = "Puede demostrar comprension de todos los temas del modulo A1."
            lesson["mcer_goal"] = "Review all A1 topics and prepare for the final exam"
            lesson["can_do_statements"] = [
                "I can use the verb to be correctly.",
                "I can form Present Simple sentences.",
                "I can use Present Continuous for current actions.",
                "I can use 'can' for abilities.",
                "I can describe places with prepositions and there is/are."
            ]
            lesson["kb_reference_id"] = "KB-REVIEW-A1-01"
            lesson["theory"] = "Review: Subject pronouns and To Be, Negatives and Questions, Wh- Questions, Possessive Adjectives, Plural Nouns, Present Simple, There is/There are, Countable/Uncountable nouns, Prepositions, Present Continuous, and Modal Verb 'Can'."
            lesson["vocabulary"] = [
                "review", "grammar", "vocabulary", "reading", "listening",
                "writing", "speaking", "pronunciation", "practice", "test",
                "all", "topics", "综合", "final", "exam",
                "demonstrate", "understand", "apply", "use", "master"
            ]
            # Update exercise IDs from G10-XX to G13-XX, etc.
            if "exercises" in lesson:
                for skill, exercises in lesson["exercises"].items():
                    if isinstance(exercises, list):
                        for ex in exercises:
                            if "id" in ex:
                                ex["id"] = ex["id"].replace("G10-", "G13-").replace("V10-", "V13-").replace("R10-", "R13-").replace("L10-", "L13-").replace("S10-", "S13-").replace("W10-", "W13-").replace("P10-", "P13-")
                    elif isinstance(exercises, dict):
                        if "questions" in exercises:
                            for q in exercises["questions"]:
                                if "id" in q:
                                    q["id"] = q["id"].replace("R10-", "R13-").replace("L10-", "L13-")
            break
    return lessons


def main():
    # Backup
    shutil.copy2(DATA_PATH, BACKUP_PATH)
    print(f"Backup created: {BACKUP_PATH}")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # ============================================================
    # 1. CORE LESSONS: Rename ST10 -> ST13, insert new ST10-ST12
    # ============================================================
    lessons = data["course_subtopics"]["A1-M01"]

    # First: renumber ST10 to ST13
    lessons = renumber_st10_to_st13(lessons)

    # Insert new lessons at correct positions (after ST09, before old-ST10-now-ST13)
    new_lessons = [LESSON_10_PRESENT_CONTINUOUS, LESSON_11_MODAL_CAN, LESSON_12_FAMILY_HOME]

    # Find ST09 index
    st09_idx = None
    for i, lesson in enumerate(lessons):
        if lesson.get("subtopic_id") == "A1-M01-ST09":
            st09_idx = i
            break

    if st09_idx is not None:
        for j, new_lesson in enumerate(new_lessons):
            lessons.insert(st09_idx + 1 + j, new_lesson)

    data["course_subtopics"]["A1-M01"] = lessons
    print(f"Core lessons updated: {len(lessons)} total")
    for l in lessons:
        print(f"  {l['subtopic_id']}: {l['title']} (seq={l['sequence_order']})")

    # ============================================================
    # 2. VIAJES VARIANT: Fix dialogues + add lessons 11-13
    # ============================================================
    viajes = data["lesson_content_variants"]["viajes"]

    # Fix existing dialogue scripts (add A:/B: labels)
    for lesson_num_str, lesson_data in viajes.items():
        lesson_num = int(lesson_num_str)
        if "exercises" in lesson_data and "listening" in lesson_data["exercises"]:
            original = lesson_data["exercises"]["listening"].get("script", "")
            lesson_data["exercises"]["listening"]["script"] = fix_viajes_dialogue(lesson_num, original)
    print("Viajes dialogues fixed")

    # Add lessons 11-13 for viajes
    viajes_11 = {
        "title": "Travel Actions - Present Continuous",
        "mcer_goal": "Describe travel actions happening now using Present Continuous",
        "theory": "Use am/is/are + verb-ing for travel actions: I am checking in. She is boarding the plane. We are landing soon.",
        "exercises": {
            "grammar": [
                {"id": "G11-V-01", "type": "multiple_choice", "question": "I ___ checking in at the hotel.", "options": ["am", "is", "are"], "answer": "am"},
                {"id": "G11-V-02", "type": "multiple_choice", "question": "The plane ___ landing now.", "options": ["am", "is", "are"], "answer": "is"},
                {"id": "G11-V-03", "type": "multiple_choice", "question": "We ___ boarding the plane.", "options": ["am", "is", "are"], "answer": "are"},
                {"id": "G11-V-04", "type": "multiple_choice", "question": "She ___ waiting at the gate.", "options": ["am", "is", "are"], "answer": "is"},
                {"id": "G11-V-05", "type": "multiple_choice", "question": "They ___ packing their bags.", "options": ["am", "is", "are"], "answer": "are"},
                {"id": "G11-V-06", "type": "unscramble", "words": ["I", "am", "checking", "in"], "answer": "I am checking in"},
                {"id": "G11-V-07", "type": "unscramble", "words": ["She", "is", "boarding", "the", "plane"], "answer": "She is boarding the plane"},
                {"id": "G11-V-08", "type": "unscramble", "words": ["We", "are", "landing", "soon"], "answer": "We are landing soon"},
                {"id": "G11-V-09", "type": "fill_blank", "question": "I ___ taking a taxi to the hotel.", "answer": "am"},
                {"id": "G11-V-10", "type": "fill_blank", "question": "He ___ buying souvenirs right now.", "answer": "is"}
            ],
            "vocabulary": [
                {"id": "V11-V-01", "question": "Accion de registrarse en un hotel.", "answer": "checking in"},
                {"id": "V11-V-02", "question": "Subir al avion.", "answer": "boarding"},
                {"id": "V11-V-03", "question": "Llegar al suelo.", "answer": "landing"},
                {"id": "V11-V-04", "question": "Esperar en una area.", "answer": "waiting"},
                {"id": "V11-V-05", "question": "Preparar maletas.", "answer": "packing"},
                {"id": "V11-V-06", "question": "Hacer el check-out del hotel.", "answer": "checking out"},
                {"id": "V11-V-07", "question": "Sacar fotos.", "answer": "taking photos"},
                {"id": "V11-V-08", "question": "Comprar recuerdos.", "answer": "buying souvenirs"},
                {"id": "V11-V-09", "question": "Tomar un taxi.", "answer": "taking a taxi"},
                {"id": "V11-V-10", "question": "Visitar museos.", "answer": "visiting museums"}
            ],
            "reading": {
                "text": "Right now, Maria is at the airport. She is checking in for her flight to Paris. The attendant is helping her. Carlos is at the hotel. He is checking out after a wonderful vacation. Ana is at the museum. She is taking photos of the beautiful paintings.",
                "questions": [
                    {"id": "R11-V-01", "question": "Where is Maria?", "options": ["Hotel", "Airport", "Museum"], "answer": "Airport"},
                    {"id": "R11-V-02", "question": "Where is she going?", "options": ["London", "Paris", "New York"], "answer": "Paris"},
                    {"id": "R11-V-03", "question": "Where is Carlos?", "options": ["Airport", "Hotel", "Museum"], "answer": "Hotel"},
                    {"id": "R11-V-04", "question": "Is Carlos arriving or leaving?", "options": ["Arriving", "Leaving", "Staying"], "answer": "Leaving"},
                    {"id": "R11-V-05", "question": "Where is Ana?", "options": ["Airport", "Hotel", "Museum"], "answer": "Museum"},
                    {"id": "R11-V-06", "question": "What is Ana doing?", "options": ["Painting", "Taking photos", "Reading"], "answer": "Taking photos"},
                    {"id": "R11-V-07", "question": "Is the attendant helping Maria?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R11-V-08", "question": "Was Carlos's vacation good?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R11-V-09", "question": "What is Ana photographing?", "options": ["Buildings", "Paintings", "People"], "answer": "Paintings"},
                    {"id": "R11-V-10", "question": "How many people are mentioned?", "options": ["Two", "Three", "Four"], "answer": "Three"}
                ]
            },
            "listening": {
                "script": "A: What are you doing? B: I am checking in at the hotel. A: How is your trip? B: It is great! I am visiting many museums. A: What are you doing tomorrow? B: I am going to the Eiffel Tower. A: That sounds wonderful!",
                "questions": [
                    {"id": "L11-V-01", "question": "Where is person B?", "options": ["Airport", "Hotel", "Museum"], "answer": "Hotel"},
                    {"id": "L11-V-02", "question": "How is the trip?", "options": ["Bad", "Okay", "Great"], "answer": "Great"},
                    {"id": "L11-V-03", "question": "What is B doing?", "options": ["Checking in", "Checking out", "Sleeping"], "answer": "Checking in"},
                    {"id": "L11-V-04", "question": "What is B visiting?", "options": ["Parks", "Museums", "Restaurants"], "answer": "Museums"},
                    {"id": "L11-V-05", "question": "Where is B going tomorrow?", "options": ["The beach", "Eiffel Tower", "Hotel"], "answer": "Eiffel Tower"},
                    {"id": "L11-V-06", "question": "Is A excited for B?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L11-V-07", "question": "How many people are talking?", "options": ["One", "Two", "Three"], "answer": "Two"},
                    {"id": "L11-V-08", "question": "Is the trip in the past?", "options": ["Yes", "No, it is happening now"], "answer": "No, it is happening now"},
                    {"id": "L11-V-09", "question": "Is B traveling alone?", "options": ["Yes", "No", "Not mentioned"], "answer": "Not mentioned"},
                    {"id": "L11-V-10", "question": "What is the conversation about?", "options": ["A past trip", "Current travel activities", "Future plans only"], "answer": "Current travel activities"}
                ]
            },
            "speaking": [
                {"id": "S11-V-01", "prompt": "Say: 'I am checking in at the hotel.'"},
                {"id": "S11-V-02", "prompt": "Say: 'She is boarding the plane now.'"},
                {"id": "S11-V-03", "prompt": "Say: 'We are visiting museums today.'"},
                {"id": "S11-V-04", "prompt": "Say: 'They are taking photos.'"},
                {"id": "S11-V-05", "prompt": "Say: 'I am packing my bags.'"},
                {"id": "S11-V-06", "prompt": "Say: 'What are you doing right now?'"},
                {"id": "S11-V-07", "prompt": "Say: 'I am going to the airport.'"},
                {"id": "S11-V-08", "prompt": "Say: 'He is waiting at the gate.'"},
                {"id": "S11-V-09", "prompt": "Say: 'I am not sleeping. I am traveling.'"},
                {"id": "S11-V-10", "prompt": "Describe what you are doing on a trip right now."}
            ],
            "writing": [
                {"id": "W11-V-01", "type": "unscramble", "words": ["I", "am", "checking", "in"], "answer": "I am checking in"},
                {"id": "W11-V-02", "type": "unscramble", "words": ["She", "is", "boarding", "the", "plane"], "answer": "She is boarding the plane"},
                {"id": "W11-V-03", "type": "unscramble", "words": ["We", "are", "visiting", "museums"], "answer": "We are visiting museums"},
                {"id": "W11-V-04", "question": "Write: Estoy esperando en la puerta.", "answer": "I am waiting at the gate"},
                {"id": "W11-V-05", "question": "Write: Ellos estan tomando fotos.", "answer": "They are taking photos"},
                {"id": "W11-V-06", "type": "fill_blank", "question": "I ___ packing my bags.", "answer": "am"},
                {"id": "W11-V-07", "type": "fill_blank", "question": "She ___ checking in.", "answer": "is"},
                {"id": "W11-V-08", "type": "fill_blank", "question": "They ___ visiting the museum.", "answer": "are"},
                {"id": "W11-V-09", "type": "unscramble", "words": ["He", "is", "taking", "a", "taxi"], "answer": "He is taking a taxi"},
                {"id": "W11-V-10", "type": "unscramble", "words": ["What", "are", "you", "doing", "now"], "answer": "What are you doing now"}
            ],
            "pronunciation": [
                {"id": "P11-V-01", "phrase": "I am checking in.", "focus": "'checking' stress on first syllable"},
                {"id": "P11-V-02", "phrase": "She is boarding the plane.", "focus": "'boarding' sounds like 'bor-ding'"},
                {"id": "P11-V-03", "phrase": "We are visiting museums.", "focus": "'museums' sounds like 'myoo-zee-ums'"},
                {"id": "P11-V-04", "phrase": "I am taking photos.", "focus": "'photos' sounds like 'foh-tohs'"},
                {"id": "P11-V-05", "phrase": "He is waiting at the gate.", "focus": "'waiting' sounds like 'way-ting'"},
                {"id": "P11-V-06", "phrase": "They are packing their bags.", "focus": "'packing' stress on first syllable"},
                {"id": "P11-V-07", "phrase": "I am not sleeping.", "focus": "Stress on 'not' for negation"},
                {"id": "P11-V-08", "phrase": "What are you doing?", "focus": "Rising intonation for questions"},
                {"id": "P11-V-09", "phrase": "I am going to the airport.", "focus": "'airport' stress on first syllable"},
                {"id": "P11-V-10", "phrase": "She is checking out.", "focus": "'checking out' both words stressed"}
            ]
        }
    }

    viajes_12 = {
        "title": "Travel Abilities - Can",
        "mcer_goal": "Talk about travel abilities and ask for help using 'can'",
        "theory": "Use 'can' for travel abilities: I can speak English. Use 'Can you...?' for travel requests: Can you help me find the station? Use 'Can I...?' for permission: Can I take a photo here?",
        "exercises": {
            "grammar": [
                {"id": "G12-V-01", "type": "multiple_choice", "question": "I ___ speak English at the hotel.", "options": ["can", "can't", "am"], "answer": "can"},
                {"id": "G12-V-02", "type": "multiple_choice", "question": "She ___ read the map.", "options": ["can", "is", "does"], "answer": "can"},
                {"id": "G12-V-03", "type": "multiple_choice", "question": "___ you help me find the station?", "options": ["Can", "Do", "Are"], "answer": "Can"},
                {"id": "G12-V-04", "type": "multiple_choice", "question": "He ___ not swim.", "options": ["can", "is", "does"], "answer": "can"},
                {"id": "G12-V-05", "type": "multiple_choice", "question": "___ I take a photo here?", "options": ["Can", "Do", "Am"], "answer": "Can"},
                {"id": "G12-V-06", "type": "unscramble", "words": ["I", "can", "speak", "English"], "answer": "I can speak English"},
                {"id": "G12-V-07", "type": "unscramble", "words": ["Can", "you", "help", "me"], "answer": "Can you help me"},
                {"id": "G12-V-08", "type": "unscramble", "words": ["She", "can", "read", "the", "map"], "answer": "She can read the map"},
                {"id": "G12-V-09", "type": "fill_blank", "question": "I ___ take a taxi.", "answer": "can"},
                {"id": "G12-V-10", "type": "fill_blank", "question": "___ I check in now?", "answer": "Can"}
            ],
            "vocabulary": [
                {"id": "V12-V-01", "question": "Habilidad para hablar ingles.", "answer": "can speak English"},
                {"id": "V12-V-02", "question": "Pedir ayuda en un viaje.", "answer": "Can you help me"},
                {"id": "V12-V-03", "question": "Pedir permiso para fotos.", "answer": "Can I take a photo"},
                {"id": "V12-V-04", "question": "No poder nadar.", "answer": "can't swim"},
                {"id": "V12-V-05", "question": "Habilidad para leer un mapa.", "answer": "can read the map"},
                {"id": "V12-V-06", "question": "Pedir direcciones.", "answer": "Can you tell me the way"},
                {"id": "V12-V-07", "question": "No poder cocinar.", "answer": "can't cook"},
                {"id": "V12-V-08", "question": "Habilidad para manejar.", "answer": "can drive"},
                {"id": "V12-V-09", "question": "Pedir informacion.", "answer": "Can you tell me"},
                {"id": "V12-V-10", "question": "Habilidad para usar transporte.", "answer": "can take the bus"}
            ],
            "reading": {
                "text": "Traveling can be exciting! I can speak English and Spanish, so I can talk to many people. My friend Pedro can't speak English, but he can read maps very well. He can navigate any city! I can cook simple meals, but Pedro can't cook at all. We can both swim, so we love going to the beach. Can you travel easily? Learn a new language!",
                "questions": [
                    {"id": "R12-V-01", "question": "How many languages can the narrator speak?", "options": ["One", "Two", "Three"], "answer": "Two"},
                    {"id": "R12-V-02", "question": "Can Pedro speak English?", "options": ["Yes", "No"], "answer": "No"},
                    {"id": "R12-V-03", "question": "What can Pedro do well?", "options": ["Cook", "Swim", "Read maps"], "answer": "Read maps"},
                    {"id": "R12-V-04", "question": "Can the narrator cook?", "options": ["Yes, simple meals", "No, not at all", "Yes, very well"], "answer": "Yes, simple meals"},
                    {"id": "R12-V-05", "question": "Can Pedro cook?", "options": ["Yes", "No"], "answer": "No"},
                    {"id": "R12-V-06", "question": "Can they both swim?", "options": ["Yes", "No", "Only the narrator"], "answer": "Yes"},
                    {"id": "R12-V-07", "question": "Where do they love going?", "options": ["Mountains", "Beach", "City"], "answer": "Beach"},
                    {"id": "R12-V-08", "question": "What is the main idea?", "options": ["Cooking is hard", "Language helps travel", "Swimming is fun"], "answer": "Language helps travel"},
                    {"id": "R12-V-09", "question": "Can Pedro navigate cities?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R12-V-10", "question": "What does the text recommend?", "options": ["Learn to cook", "Learn a new language", "Learn to swim"], "answer": "Learn a new language"}
                ]
            },
            "listening": {
                "script": "A: Can you help me? I need to find the train station. B: Yes, of course! It is not far from here. A: Can I take a bus? B: Yes, you can take bus number 5. A: Thank you! Can you speak English? B: Yes, I can. I learned in school.",
                "questions": [
                    {"id": "L12-V-01", "question": "What does A need?", "options": ["A hotel", "The train station", "A restaurant"], "answer": "The train station"},
                    {"id": "L12-V-02", "question": "Is the station far?", "options": ["Yes", "No"], "answer": "No"},
                    {"id": "L12-V-03", "question": "Can A take a bus?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L12-V-04", "question": "Which bus number?", "options": ["Bus 3", "Bus 5", "Bus 7"], "answer": "Bus 5"},
                    {"id": "L12-V-05", "question": "Can B speak English?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L12-V-06", "question": "Where did B learn English?", "options": ["At home", "In school", "Online"], "answer": "In school"},
                    {"id": "L12-V-07", "question": "Is B helpful?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L12-V-08", "question": "How many 'can' questions are asked?", "options": ["One", "Two", "Three"], "answer": "Two"},
                    {"id": "L12-V-09", "question": "What is the conversation about?", "options": ["Asking for directions", "Ordering food", "Booking a hotel"], "answer": "Asking for directions"},
                    {"id": "L12-V-10", "question": "How many people are talking?", "options": ["One", "Two", "Three"], "answer": "Two"}
                ]
            },
            "speaking": [
                {"id": "S12-V-01", "prompt": "Say: 'I can speak English and Spanish.'"},
                {"id": "S12-V-02", "prompt": "Say: 'Can you help me find the hotel?'"},
                {"id": "S12-V-03", "prompt": "Say: 'Can I take a photo here?'"},
                {"id": "S12-V-04", "prompt": "Say: 'I can't read the map.'"},
                {"id": "S12-V-05", "prompt": "Say: 'She can take the bus to the airport.'"},
                {"id": "S12-V-06", "prompt": "Say: 'Can you tell me the way to the station?'"},
                {"id": "S12-V-07", "prompt": "Say: 'I can swim but I can't dive.'"},
                {"id": "S12-V-08", "prompt": "Say: 'Can I check in early?'"},
                {"id": "S12-V-09", "prompt": "Say: 'He can navigate any city.'"},
                {"id": "S12-V-10", "prompt": "List 3 things you can do when you travel."}
            ],
            "writing": [
                {"id": "W12-V-01", "type": "unscramble", "words": ["I", "can", "speak", "English"], "answer": "I can speak English"},
                {"id": "W12-V-02", "type": "unscramble", "words": ["Can", "you", "help", "me"], "answer": "Can you help me"},
                {"id": "W12-V-03", "type": "unscramble", "words": ["She", "can't", "swim"], "answer": "She can't swim"},
                {"id": "W12-V-04", "question": "Write: El puede leer el mapa.", "answer": "He can read the map"},
                {"id": "W12-V-05", "question": "Write: Tu puedes hablar espanol?", "answer": "Can you speak Spanish"},
                {"id": "W12-V-06", "type": "fill_blank", "question": "I ___ take a taxi.", "answer": "can"},
                {"id": "W12-V-07", "type": "fill_blank", "question": "She ___ drive a car.", "answer": "can"},
                {"id": "W12-V-08", "type": "fill_blank", "question": "___ I open the window?", "answer": "Can"},
                {"id": "W12-V-09", "type": "unscramble", "words": ["They", "can", "swim", "very", "fast"], "answer": "They can swim very fast"},
                {"id": "W12-V-10", "type": "unscramble", "words": ["Can", "I", "take", "a", "photo"], "answer": "Can I take a photo"}
            ],
            "pronunciation": [
                {"id": "P12-V-01", "phrase": "Can you help me?", "focus": "'Can you' sounds like 'Canya' in fast speech"},
                {"id": "P12-V-02", "phrase": "I can speak English.", "focus": "'can' is reduced to /kən/"},
                {"id": "P12-V-03", "phrase": "Can I take a photo?", "focus": "Rising intonation for permission"},
                {"id": "P12-V-04", "phrase": "She can't swim.", "focus": "'can't' has a long 'a' sound"},
                {"id": "P12-V-05", "phrase": "He can read maps.", "focus": "'read' has a long 'ee' sound"},
                {"id": "P12-V-06", "phrase": "I can't cook.", "focus": "Stress on 'can't' for negation"},
                {"id": "P12-V-07", "phrase": "Can you speak Spanish?", "focus": "Rising intonation for questions"},
                {"id": "P12-V-08", "phrase": "We can travel easily.", "focus": "'easily' stress on first syllable"},
                {"id": "P12-V-09", "phrase": "I can drive a car.", "focus": "'drive' has a long 'i' sound"},
                {"id": "P12-V-10", "phrase": "They can navigate the city.", "focus": "'navigate' stress on first syllable"}
            ]
        }
    }

    viajes_13 = {
        "title": "Travel Review & Final Test",
        "mcer_goal": "Review all travel vocabulary and grammar for the A1 exam",
        "theory": "Review: Travel introductions with To Be, Travel questions and negatives, Wh- questions at the airport, Describing destinations, Travel routines, Hotel reservations, Ordering food, Shopping, Asking for help, Present Continuous for travel, and Can for travel abilities.",
        "exercises": {
            "grammar": [
                {"id": "G13-V-01", "type": "multiple_choice", "question": "I ___ a tourist from Mexico.", "options": ["am", "is", "are"], "answer": "am"},
                {"id": "G13-V-02", "type": "multiple_choice", "question": "She ___ checking in now.", "options": ["am", "is", "are"], "answer": "is"},
                {"id": "G13-V-03", "type": "multiple_choice", "question": "___ you speak English?", "options": ["Can", "Do", "Are"], "answer": "Can"},
                {"id": "G13-V-04", "type": "multiple_choice", "question": "They ___ at the hotel.", "options": ["am", "is", "are"], "answer": "are"},
                {"id": "G13-V-05", "type": "multiple_choice", "question": "He ___ not find the airport.", "options": ["can", "is", "does"], "answer": "can"},
                {"id": "G13-V-06", "type": "unscramble", "words": ["I", "am", "a", "tourist"], "answer": "I am a tourist"},
                {"id": "G13-V-07", "type": "unscramble", "words": ["She", "is", "visiting", "Paris"], "answer": "She is visiting Paris"},
                {"id": "G13-V-08", "type": "unscramble", "words": ["Can", "I", "book", "a", "room"], "answer": "Can I book a room"},
                {"id": "G13-V-09", "type": "fill_blank", "question": "I ___ going to Tokyo next year.", "answer": "am"},
                {"id": "G13-V-10", "type": "fill_blank", "question": "He ___ speak three languages.", "answer": "can"}
            ],
            "vocabulary": [
                {"id": "V13-V-01", "question": "Documento para viajar.", "answer": "passport"},
                {"id": "V13-V-02", "question": "Lugar donde te quedas de noche.", "answer": "hotel"},
                {"id": "V13-V-03", "question": "Lugar donde tomas un avion.", "answer": "airport"},
                {"id": "V13-V-04", "question": "Persona que viaja.", "answer": "tourist"},
                {"id": "V13-V-05", "question": "Numero de vuelo.", "answer": "flight number"},
                {"id": "V13-V-06", "question": "Reservar un cuarto.", "answer": "book a room"},
                {"id": "V13-V-07", "question": "Llevar maletas.", "answer": "pack luggage"},
                {"id": "V13-V-08", "question": "Habilidad para nadar.", "answer": "can swim"},
                {"id": "V13-V-09", "question": "Accion de registrarse en hotel.", "answer": "check in"},
                {"id": "V13-V-10", "question": "Pedir ayuda.", "answer": "ask for help"}
            ],
            "reading": {
                "text": "Last summer, I traveled to Paris. I took a plane from Mexico City. The flight was eight hours. I stayed at a nice hotel near the Eiffel Tower. I visited museums, ate delicious food, and took many photos. I could speak a little French, but most people spoke English. I can't wait to travel again!",
                "questions": [
                    {"id": "R13-V-01", "question": "Where did the person travel?", "options": ["London", "Paris", "Tokyo"], "answer": "Paris"},
                    {"id": "R13-V-02", "question": "Where did they fly from?", "options": ["Guadalajara", "Mexico City", "Monterrey"], "answer": "Mexico City"},
                    {"id": "R13-V-03", "question": "How long was the flight?", "options": ["Six hours", "Eight hours", "Ten hours"], "answer": "Eight hours"},
                    {"id": "R13-V-04", "question": "Where was the hotel?", "options": ["Near the beach", "Near the Eiffel Tower", "Near the airport"], "answer": "Near the Eiffel Tower"},
                    {"id": "R13-V-05", "question": "What did they do in Paris?", "options": ["Only ate food", "Visited museums, ate, took photos", "Only took photos"], "answer": "Visited museums, ate, took photos"},
                    {"id": "R13-V-06", "question": "Could they speak French?", "options": ["Yes, fluently", "A little", "No"], "answer": "A little"},
                    {"id": "R13-V-07", "question": "What language did most people speak?", "options": ["French", "Spanish", "English"], "answer": "English"},
                    {"id": "R13-V-08", "question": "Does the person want to travel again?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R13-V-09", "question": "Is this about a past or future trip?", "options": ["Past", "Future"], "answer": "Past"},
                    {"id": "R13-V-10", "question": "Was the trip enjoyable?", "options": ["Yes", "No"], "answer": "Yes"}
                ]
            },
            "listening": {
                "script": "A: Where did you go on vacation? B: I went to Tokyo, Japan. A: How was it? B: It was amazing! I visited many temples and ate delicious food. A: Could you speak Japanese? B: No, I couldn't. But I can speak English, and many people helped me.",
                "questions": [
                    {"id": "L13-V-01", "question": "Where did B go?", "options": ["Paris", "Tokyo", "New York"], "answer": "Tokyo"},
                    {"id": "L13-V-02", "question": "How was the trip?", "options": ["Bad", "Okay", "Amazing"], "answer": "Amazing"},
                    {"id": "L13-V-03", "question": "What did B visit?", "options": ["Beaches", "Temples", "Museums"], "answer": "Temples"},
                    {"id": "L13-V-04", "question": "Could B speak Japanese?", "options": ["Yes", "No"], "answer": "No"},
                    {"id": "L13-V-05", "question": "What language did B use?", "options": ["Spanish", "French", "English"], "answer": "English"},
                    {"id": "L13-V-06", "question": "Did people help B?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L13-V-07", "question": "Is this a past trip?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L13-V-08", "question": "How many people are talking?", "options": ["One", "Two", "Three"], "answer": "Two"},
                    {"id": "L13-V-09", "question": "What is the conversation about?", "options": ["Current travel", "Past vacation", "Future plans"], "answer": "Past vacation"},
                    {"id": "L13-V-10", "question": "Is A interested in B's trip?", "options": ["Yes", "No"], "answer": "Yes"}
                ]
            },
            "speaking": [
                {"id": "S13-V-01", "prompt": "Say: 'I am a tourist from Mexico.'"},
                {"id": "S13-V-02", "prompt": "Say: 'I am visiting Paris right now.'"},
                {"id": "S13-V-03", "prompt": "Say: 'Can you help me find the station?'"},
                {"id": "S13-V-04", "prompt": "Say: 'I can speak English and Spanish.'"},
                {"id": "S13-V-05", "prompt": "Say: 'Where is the nearest hotel?'"},
                {"id": "S13-V-06", "prompt": "Say: 'I want to book a room for three nights.'"},
                {"id": "S13-V-07", "prompt": "Say: 'The food is delicious!'"},
                {"id": "S13-V-08", "prompt": "Say: 'I am going to visit Tokyo next year.'"},
                {"id": "S13-V-09", "prompt": "Say: 'Can I take a photo here?'"},
                {"id": "S13-V-10", "prompt": "Describe your dream vacation in 3 sentences."}
            ],
            "writing": [
                {"id": "W13-V-01", "type": "unscramble", "words": ["I", "am", "a", "tourist", "from", "Mexico"], "answer": "I am a tourist from Mexico"},
                {"id": "W13-V-02", "type": "unscramble", "words": ["She", "is", "visiting", "Paris"], "answer": "She is visiting Paris"},
                {"id": "W13-V-03", "type": "unscramble", "words": ["Can", "you", "help", "me"], "answer": "Can you help me"},
                {"id": "W13-V-04", "question": "Write: Fui a Tokyo el verano pasado.", "answer": "I went to Tokyo last summer"},
                {"id": "W13-V-05", "question": "Write: El hotel esta cerca de la playa.", "answer": "The hotel is near the beach"},
                {"id": "W13-V-06", "type": "fill_blank", "question": "I ___ a tourist.", "answer": "am"},
                {"id": "W13-V-07", "type": "fill_blank", "question": "She ___ checking in.", "answer": "is"},
                {"id": "W13-V-08", "type": "fill_blank", "question": "___ you speak French?", "answer": "Can"},
                {"id": "W13-V-09", "type": "unscramble", "words": ["The", "food", "is", "delicious"], "answer": "The food is delicious"},
                {"id": "W13-V-10", "type": "unscramble", "words": ["I", "am", "going", "to", "travel"], "answer": "I am going to travel"}
            ],
            "pronunciation": [
                {"id": "P13-V-01", "phrase": "I am a tourist.", "focus": "'tourist' sounds like 'too-rist'"},
                {"id": "P13-V-02", "phrase": "I am visiting Paris.", "focus": "'Paris' stress on first syllable"},
                {"id": "P13-V-03", "phrase": "Can you help me?", "focus": "'Can you' sounds like 'Canya'"},
                {"id": "P13-V-04", "phrase": "I can speak English.", "focus": "'can' reduced to /kən/"},
                {"id": "P13-V-05", "phrase": "The food is delicious.", "focus": "'delicious' stress on second syllable"},
                {"id": "P13-V-06", "phrase": "I went to Tokyo.", "focus": "'Tokyo' stress on first syllable"},
                {"id": "P13-V-07", "phrase": "I can't wait to travel.", "focus": "'can't' has a long 'a' sound"},
                {"id": "P13-V-08", "phrase": "She is checking in.", "focus": "'checking' stress on first syllable"},
                {"id": "P13-V-09", "phrase": "Can I take a photo?", "focus": "Rising intonation for permission"},
                {"id": "P13-V-10", "phrase": "I am going to visit Tokyo.", "focus": "'Tokyo' sounds like 'toh-kee-oh'"}
            ]
        }
    }

    viajes["11"] = viajes_11
    viajes["12"] = viajes_12
    viajes["13"] = viajes_13
    print(f"Viajes lessons updated: {len(viajes)} total")

    # ============================================================
    # 3. VIDA_DIARIA VARIANT: Fix dialogues + add lessons 11-13
    # ============================================================
    vida_diaria = data["lesson_content_variants"]["vida_diaria"]
    new_dialogues = fix_vida_diaria_dialogues()

    # Fix existing dialogues (replace identical placeholder with unique ones)
    for lesson_num_str, lesson_data in vida_diaria.items():
        lesson_num = int(lesson_num_str)
        if lesson_num in new_dialogues and "exercises" in lesson_data and "listening" in lesson_data["exercises"]:
            lesson_data["exercises"]["listening"]["script"] = new_dialogues[lesson_num]
    print("Vida diaria dialogues fixed")

    # Add lessons 11-13 for vida_diaria
    vida_diaria_11 = {
        "id": 11,
        "num": "11",
        "title": "Daily Actions - Present Continuous",
        "mcer_goal": "Describe daily actions happening now using Present Continuous",
        "theory": "Use am/is/are + verb-ing for daily actions happening now: I am cooking. She is cleaning. We are eating dinner.",
        "exercises": {
            "grammar": [
                {"id": "G11-D-01", "type": "multiple_choice", "question": "I ___ cooking dinner.", "options": ["am", "is", "are"], "answer": "am"},
                {"id": "G11-D-02", "type": "multiple_choice", "question": "She ___ cleaning the house.", "options": ["am", "is", "are"], "answer": "is"},
                {"id": "G11-D-03", "type": "multiple_choice", "question": "We ___ eating lunch.", "options": ["am", "is", "are"], "answer": "are"},
                {"id": "G11-D-04", "type": "multiple_choice", "question": "He ___ watching TV.", "options": ["am", "is", "are"], "answer": "is"},
                {"id": "G11-D-05", "type": "unscramble", "words": ["I", "am", "cooking", "dinner"], "answer": "I am cooking dinner"},
                {"id": "G11-D-06", "type": "fill_blank", "question": "She ___ reading a book right now.", "answer": "is"},
                {"id": "G11-D-07", "type": "fill_blank", "question": "They ___ playing in the park.", "answer": "are"},
                {"id": "G11-D-08", "type": "multiple_choice", "question": "My mother ___ working today.", "options": ["am", "is", "are"], "answer": "is"},
                {"id": "G11-D-09", "type": "unscramble", "words": ["She", "is", "cleaning", "the", "kitchen"], "answer": "She is cleaning the kitchen"},
                {"id": "G11-D-10", "type": "fill_blank", "question": "We ___ watching a movie now.", "answer": "are"}
            ],
            "vocabulary": [
                {"id": "V11-D-01", "question": "Accion de preparar comida.", "answer": "cooking"},
                {"id": "V11-D-02", "question": "Accion de limpiar.", "answer": "cleaning"},
                {"id": "V11-D-03", "question": "Accion de comer (gerundio).", "answer": "eating"},
                {"id": "V11-D-04", "question": "Accion de mirar television.", "answer": "watching TV"},
                {"id": "V11-D-05", "question": "Accion de leer (gerundio).", "answer": "reading"},
                {"id": "V11-D-06", "question": "Accion de trabajar (gerundio).", "answer": "working"},
                {"id": "V11-D-07", "question": "Accion de jugar (gerundio).", "answer": "playing"},
                {"id": "V11-D-08", "question": "Verbo auxiliar para I.", "answer": "am"},
                {"id": "V11-D-09", "question": "Verbo auxiliar para he/she.", "answer": "is"},
                {"id": "V11-D-10", "question": "Verbo auxiliar para we/they.", "answer": "are"}
            ],
            "reading": {
                "text": "It is 6 PM. My family is at home. My mother is cooking dinner in the kitchen. My father is reading the newspaper in the living room. My sister is doing her homework. I am listening to music in my bedroom. My brother is playing video games. We are all busy but happy!",
                "questions": [
                    {"id": "R11-D-01", "question": "What time is it?", "options": ["3 PM", "6 PM", "9 PM"], "answer": "6 PM"},
                    {"id": "R11-D-02", "question": "Where is the mother?", "options": ["Bedroom", "Kitchen", "Garden"], "answer": "Kitchen"},
                    {"id": "R11-D-03", "question": "What is the father doing?", "options": ["Cooking", "Reading the newspaper", "Playing"], "answer": "Reading the newspaper"},
                    {"id": "R11-D-04", "question": "What is the sister doing?", "options": ["Watching TV", "Doing homework", "Sleeping"], "answer": "Doing homework"},
                    {"id": "R11-D-05", "question": "Where is the narrator?", "options": ["Kitchen", "Living room", "Bedroom"], "answer": "Bedroom"},
                    {"id": "R11-D-06", "question": "What is the brother doing?", "options": ["Reading", "Playing video games", "Eating"], "answer": "Playing video games"},
                    {"id": "R11-D-07", "question": "Are they all busy?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R11-D-08", "question": "Are they happy?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R11-D-09", "question": "How many family members are mentioned?", "options": ["Four", "Five", "Six"], "answer": "Five"},
                    {"id": "R11-D-10", "question": "Is anyone sleeping?", "options": ["Yes", "No"], "answer": "No"}
                ]
            },
            "listening": {
                "script": "A: What is your mother doing? B: She is cooking dinner. A: What is she making? B: She is making pasta. It smells delicious! A: What are you doing? B: I am setting the table. A: Is your father helping? B: No, he is reading the newspaper.",
                "questions": [
                    {"id": "L11-D-01", "question": "What is the mother doing?", "options": ["Cleaning", "Cooking dinner", "Sleeping"], "answer": "Cooking dinner"},
                    {"id": "L11-D-02", "question": "What is she making?", "options": ["Rice", "Pasta", "Soup"], "answer": "Pasta"},
                    {"id": "L11-D-03", "question": "How does the food smell?", "options": ["Bad", "Okay", "Delicious"], "answer": "Delicious"},
                    {"id": "L11-D-04", "question": "What is B doing?", "options": ["Cooking", "Setting the table", "Reading"], "answer": "Setting the table"},
                    {"id": "L11-D-05", "question": "Is the father helping?", "options": ["Yes", "No"], "answer": "No"},
                    {"id": "L11-D-06", "question": "What is the father doing?", "options": ["Cooking", "Cleaning", "Reading the newspaper"], "answer": "Reading the newspaper"},
                    {"id": "L11-D-07", "question": "How many people are mentioned?", "options": ["Two", "Three", "Four"], "answer": "Three"},
                    {"id": "L11-D-08", "question": "Is it meal time?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L11-D-09", "question": "Is the conversation about daily activities?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L11-D-10", "question": "How many people are talking?", "options": ["One", "Two", "Three"], "answer": "Two"}
                ]
            },
            "speaking": [
                {"id": "S11-D-01", "prompt": "Say: 'I am cooking dinner right now.'"},
                {"id": "S11-D-02", "prompt": "Say: 'She is cleaning the house.'"},
                {"id": "S11-D-03", "prompt": "Say: 'We are eating lunch together.'"},
                {"id": "S11-D-04", "prompt": "Say: 'He is watching TV at the moment.'"},
                {"id": "S11-D-05", "prompt": "Say: 'I am listening to music.'"},
                {"id": "S11-D-06", "prompt": "Say: 'What are you doing right now?'"},
                {"id": "S11-D-07", "prompt": "Say: 'My mother is working today.'"},
                {"id": "S11-D-08", "prompt": "Say: 'They are playing in the park.'"},
                {"id": "S11-D-09", "prompt": "Say: 'I am not sleeping. I am studying.'"},
                {"id": "S11-D-10", "prompt": "Describe what your family is doing right now."}
            ],
            "writing": [
                {"id": "W11-D-01", "type": "unscramble", "words": ["I", "am", "cooking", "dinner"], "answer": "I am cooking dinner"},
                {"id": "W11-D-02", "type": "unscramble", "words": ["She", "is", "cleaning", "the", "house"], "answer": "She is cleaning the house"},
                {"id": "W11-D-03", "type": "unscramble", "words": ["We", "are", "eating", "lunch"], "answer": "We are eating lunch"},
                {"id": "W11-D-04", "question": "Write: Ella esta limpiando la cocina.", "answer": "She is cleaning the kitchen"},
                {"id": "W11-D-05", "question": "Write: Nosotros estamos comiendo.", "answer": "We are eating"},
                {"id": "W11-D-06", "type": "fill_blank", "question": "He ___ reading right now.", "answer": "is"},
                {"id": "W11-D-07", "type": "fill_blank", "question": "They ___ playing outside.", "answer": "are"},
                {"id": "W11-D-08", "type": "fill_blank", "question": "I ___ working today.", "answer": "am"},
                {"id": "W11-D-09", "type": "unscramble", "words": ["He", "is", "watching", "TV"], "answer": "He is watching TV"},
                {"id": "W11-D-10", "type": "unscramble", "words": ["What", "are", "you", "doing"], "answer": "What are you doing"}
            ],
            "pronunciation": [
                {"id": "P11-D-01", "phrase": "I am cooking dinner.", "focus": "'cooking' stress on first syllable"},
                {"id": "P11-D-02", "phrase": "She is cleaning the house.", "focus": "'cleaning' sounds like 'klee-ning'"},
                {"id": "P11-D-03", "phrase": "We are eating lunch.", "focus": "'eating' sounds like 'ee-ting'"},
                {"id": "P11-D-04", "phrase": "He is watching TV.", "focus": "'watching' stress on first syllable"},
                {"id": "P11-D-05", "phrase": "I am listening to music.", "focus": "'listening' stress on first syllable"},
                {"id": "P11-D-06", "phrase": "What are you doing?", "focus": "Rising intonation for questions"},
                {"id": "P11-D-07", "phrase": "She is reading a book.", "focus": "'reading' sounds like 'ree-ding'"},
                {"id": "P11-D-08", "phrase": "They are playing outside.", "focus": "'playing' has a long 'a' sound"},
                {"id": "P11-D-09", "phrase": "I am not sleeping.", "focus": "Stress on 'not' for negation"},
                {"id": "P11-D-10", "phrase": "We are all busy.", "focus": "'busy' sounds like 'bizz-ee'"}
            ]
        }
    }

    vida_diaria_12 = {
        "id": 12,
        "num": "12",
        "title": "Daily Abilities - Can",
        "mcer_goal": "Talk about daily abilities and make requests using 'can'",
        "theory": "Use 'can' for daily abilities: I can cook. Use 'Can you...?' for requests: Can you clean the room? Use 'Can I...?' for permission: Can I go out?",
        "exercises": {
            "grammar": [
                {"id": "G12-D-01", "type": "multiple_choice", "question": "I ___ cook very well.", "options": ["can", "can't", "am"], "answer": "can"},
                {"id": "G12-D-02", "type": "multiple_choice", "question": "She ___ clean the house.", "options": ["can", "is", "does"], "answer": "can"},
                {"id": "G12-D-03", "type": "multiple_choice", "question": "___ you help me with dinner?", "options": ["Can", "Do", "Are"], "answer": "Can"},
                {"id": "G12-D-04", "type": "multiple_choice", "question": "He ___ not drive.", "options": ["can", "is", "does"], "answer": "can"},
                {"id": "G12-D-05", "type": "multiple_choice", "question": "___ I go out tonight?", "options": ["Can", "Do", "Am"], "answer": "Can"},
                {"id": "G12-D-06", "type": "unscramble", "words": ["I", "can", "cook", "well"], "answer": "I can cook well"},
                {"id": "G12-D-07", "type": "unscramble", "words": ["Can", "you", "clean", "the", "room"], "answer": "Can you clean the room"},
                {"id": "G12-D-08", "type": "unscramble", "words": ["She", "can", "do", "housework"], "answer": "She can do housework"},
                {"id": "G12-D-09", "type": "fill_blank", "question": "I ___ wash the dishes.", "answer": "can"},
                {"id": "G12-D-10", "type": "fill_blank", "question": "___ he cook dinner?", "answer": "Can"}
            ],
            "vocabulary": [
                {"id": "V12-D-01", "question": "Habilidad para preparar comida.", "answer": "can cook"},
                {"id": "V12-D-02", "question": "Habilidad para limpiar.", "answer": "can clean"},
                {"id": "V12-D-03", "question": "Pedir ayuda para lavar platos.", "answer": "Can you wash the dishes"},
                {"id": "V12-D-04", "question": "Habilidad para lavar ropa.", "answer": "can do laundry"},
                {"id": "V12-D-05", "question": "No poder cocinar.", "answer": "can't cook"},
                {"id": "V12-D-06", "question": "Pedir permiso para salir.", "answer": "Can I go out"},
                {"id": "V12-D-07", "question": "Habilidad para planchar.", "answer": "can iron clothes"},
                {"id": "V12-D-08", "question": "Habilidad para barrer.", "answer": "can sweep the floor"},
                {"id": "V12-D-09", "question": "No poder lavar ropa.", "answer": "can't do laundry"},
                {"id": "V12-D-10", "question": "Pedir ayuda para cocinar.", "answer": "Can you help me cook"}
            ],
            "reading": {
                "text": "In our house, everyone can help with chores. My mother can cook very well. She makes delicious food every day. My father can fix things around the house. He can repair the sink and the door. My sister can do laundry and iron clothes. I can clean my room and sweep the floor. We all work together!",
                "questions": [
                    {"id": "R12-D-01", "question": "Can everyone help with chores?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R12-D-02", "question": "What can the mother do?", "options": ["Fix things", "Cook", "Do laundry"], "answer": "Cook"},
                    {"id": "R12-D-03", "question": "What can the father fix?", "options": ["The car", "The sink and door", "The TV"], "answer": "The sink and door"},
                    {"id": "R12-D-04", "question": "What can the sister do?", "options": ["Cook and clean", "Do laundry and iron", "Fix things"], "answer": "Do laundry and iron"},
                    {"id": "R12-D-05", "question": "What can the narrator do?", "options": ["Cook", "Fix things", "Clean and sweep"], "answer": "Clean and sweep"},
                    {"id": "R12-D-06", "question": "Does the mother cook well?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R12-D-07", "question": "How many family members are mentioned?", "options": ["Three", "Four", "Five"], "answer": "Four"},
                    {"id": "R12-D-08", "question": "Do they work together?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R12-D-09", "question": "Can the father cook?", "options": ["Yes", "No", "Not mentioned"], "answer": "Not mentioned"},
                    {"id": "R12-D-10", "question": "What is the main idea?", "options": ["Cooking is hard", "Everyone helps at home", "Chores are boring"], "answer": "Everyone helps at home"}
                ]
            },
            "listening": {
                "script": "A: Can you cook dinner tonight? B: Yes, I can! What do you want to eat? A: Can you make pasta? B: Yes, I can make pasta. Can you set the table? A: Yes, I can. Can your brother help? B: No, he can't cook, but he can wash the dishes.",
                "questions": [
                    {"id": "L12-D-01", "question": "What is B asked to do?", "options": ["Clean", "Cook dinner", "Go shopping"], "answer": "Cook dinner"},
                    {"id": "L12-D-02", "question": "Can B cook?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L12-D-03", "question": "What will they eat?", "options": ["Rice", "Pasta", "Soup"], "answer": "Pasta"},
                    {"id": "L12-D-04", "question": "What is A asked to do?", "options": ["Cook", "Set the table", "Wash dishes"], "answer": "Set the table"},
                    {"id": "L12-D-05", "question": "Can the brother cook?", "options": ["Yes", "No"], "answer": "No"},
                    {"id": "L12-D-06", "question": "What can the brother do?", "options": ["Cook", "Set the table", "Wash dishes"], "answer": "Wash dishes"},
                    {"id": "L12-D-07", "question": "How many people are mentioned?", "options": ["Two", "Three", "Four"], "answer": "Three"},
                    {"id": "L12-D-08", "question": "Is the conversation about chores?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L12-D-09", "question": "Are they working together?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L12-D-10", "question": "How many people are talking?", "options": ["One", "Two", "Three"], "answer": "Two"}
                ]
            },
            "speaking": [
                {"id": "S12-D-01", "prompt": "Say: 'I can cook very well.'"},
                {"id": "S12-D-02", "prompt": "Say: 'Can you help me clean the house?'"},
                {"id": "S12-D-03", "prompt": "Say: 'She can do laundry and iron.'"},
                {"id": "S12-D-04", "prompt": "Say: 'I can't fix things.'"},
                {"id": "S12-D-05", "prompt": "Say: 'Can I go out tonight?'"},
                {"id": "S12-D-06", "prompt": "Say: 'He can wash the dishes.'"},
                {"id": "S12-D-07", "prompt": "Say: 'Can you make dinner tonight?'"},
                {"id": "S12-D-08", "prompt": "Say: 'We can all help at home.'"},
                {"id": "S12-D-09", "prompt": "Say: 'I can clean my room.'"},
                {"id": "S12-D-10", "prompt": "List 3 chores you can do and 2 you can't do."}
            ],
            "writing": [
                {"id": "W12-D-01", "type": "unscramble", "words": ["I", "can", "cook", "very", "well"], "answer": "I can cook very well"},
                {"id": "W12-D-02", "type": "unscramble", "words": ["Can", "you", "help", "me"], "answer": "Can you help me"},
                {"id": "W12-D-03", "type": "unscramble", "words": ["She", "can't", "fix", "things"], "answer": "She can't fix things"},
                {"id": "W12-D-04", "question": "Write: El puede lavar los platos.", "answer": "He can wash the dishes"},
                {"id": "W12-D-05", "question": "Write: Tu puedes cocinar?", "answer": "Can you cook"},
                {"id": "W12-D-06", "type": "fill_blank", "question": "I ___ do laundry.", "answer": "can"},
                {"id": "W12-D-07", "type": "fill_blank", "question": "She ___ clean the house.", "answer": "can"},
                {"id": "W12-D-08", "type": "fill_blank", "question": "___ he fix the door?", "answer": "Can"},
                {"id": "W12-D-09", "type": "unscramble", "words": ["We", "can", "all", "help"], "answer": "We can all help"},
                {"id": "W12-D-10", "type": "unscramble", "words": ["Can", "I", "go", "out", "tonight"], "answer": "Can I go out tonight"}
            ],
            "pronunciation": [
                {"id": "P12-D-01", "phrase": "I can cook very well.", "focus": "'can' reduced to /kən/"},
                {"id": "P12-D-02", "phrase": "Can you help me?", "focus": "'Can you' sounds like 'Canya'"},
                {"id": "P12-D-03", "phrase": "She can't cook.", "focus": "'can't' has a long 'a' sound"},
                {"id": "P12-D-04", "phrase": "Can I go out tonight?", "focus": "Rising intonation for permission"},
                {"id": "P12-D-05", "phrase": "He can wash the dishes.", "focus": "'dishes' sounds like 'dish-iz'"},
                {"id": "P12-D-06", "phrase": "I can do laundry.", "focus": "'laundry' stress on first syllable"},
                {"id": "P12-D-07", "phrase": "Can you clean the room?", "focus": "'clean' has a long 'ee' sound"},
                {"id": "P12-D-08", "phrase": "We can all help.", "focus": "Stress on 'all' and 'help'"},
                {"id": "P12-D-09", "phrase": "I can't fix things.", "focus": "Stress on 'can't' for negation"},
                {"id": "P12-D-10", "phrase": "She can iron clothes.", "focus": "'iron' sounds like 'eye-ern'"}
            ]
        }
    }

    vida_diaria_13 = {
        "id": 13,
        "num": "13",
        "title": "Daily Life Review & Final Test",
        "mcer_goal": "Review all daily life vocabulary and grammar for the A1 exam",
        "theory": "Review: Daily life introductions, Neighborhoods, Addresses, Describing homes, Daily routines, Family, Grocery shopping, Stores, Neighbors, and Future plans.",
        "exercises": {
            "grammar": [
                {"id": "G13-D-01", "type": "multiple_choice", "question": "I ___ from this neighborhood.", "options": ["am", "is", "are"], "answer": "am"},
                {"id": "G13-D-02", "type": "multiple_choice", "question": "She ___ cooking dinner now.", "options": ["am", "is", "are"], "answer": "is"},
                {"id": "G13-D-03", "type": "multiple_choice", "question": "___ you clean the house?", "options": ["Can", "Do", "Are"], "answer": "Can"},
                {"id": "G13-D-04", "type": "multiple_choice", "question": "There ___ three bedrooms.", "options": ["is", "are", "am"], "answer": "are"},
                {"id": "G13-D-05", "type": "multiple_choice", "question": "He ___ from this area.", "options": ["am", "is", "are"], "answer": "is"},
                {"id": "G13-D-06", "type": "unscramble", "words": ["I", "am", "from", "this", "neighborhood"], "answer": "I am from this neighborhood"},
                {"id": "G13-D-07", "type": "unscramble", "words": ["She", "is", "cooking", "dinner"], "answer": "She is cooking dinner"},
                {"id": "G13-D-08", "type": "unscramble", "words": ["Can", "you", "help", "me"], "answer": "Can you help me"},
                {"id": "G13-D-09", "type": "fill_blank", "question": "There ___ a big garden.", "answer": "is"},
                {"id": "G13-D-10", "type": "fill_blank", "question": "I ___ two sisters.", "answer": "have"}
            ],
            "vocabulary": [
                {"id": "V13-D-01", "question": "Lugar donde vives.", "answer": "home"},
                {"id": "V13-D-02", "question": "Persona que vive cerca.", "answer": "neighbor"},
                {"id": "V13-D-03", "question": "Zona residencial.", "answer": "neighborhood"},
                {"id": "V13-D-04", "question": "Lugar donde duermes.", "answer": "bedroom"},
                {"id": "V13-D-05", "question": "Lugar donde cocinas.", "answer": "kitchen"},
                {"id": "V13-D-06", "question": "Habilidad para cocinar.", "answer": "can cook"},
                {"id": "V13-D-07", "question": "Accion de limpiar (gerundio).", "answer": "cleaning"},
                {"id": "V13-D-08", "question": "Femenino de 'father'.", "answer": "mother"},
                {"id": "V13-D-09", "question": "Accion de hacer mandados.", "answer": "grocery shopping"},
                {"id": "V13-D-10", "question": "Dia de descanso.", "answer": "weekend"}
            ],
            "reading": {
                "text": "My name is Rosa. I live in a nice neighborhood. There are stores, parks, and a school near my house. My family is small: my mother, my father, and me. On weekends, we go grocery shopping together. I can cook simple meals. My mother can cook very well. My father can fix things. We love our home!",
                "questions": [
                    {"id": "R13-D-01", "question": "What is her name?", "options": ["Maria", "Rosa", "Ana"], "answer": "Rosa"},
                    {"id": "R13-D-02", "question": "Is the neighborhood nice?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R13-D-03", "question": "What is near the house?", "options": ["Only a park", "Stores, parks, and a school", "Only stores"], "answer": "Stores, parks, and a school"},
                    {"id": "R13-D-04", "question": "How big is the family?", "options": ["Big", "Small", "Medium"], "answer": "Small"},
                    {"id": "R13-D-05", "question": "What do they do on weekends?", "options": ["Go to the beach", "Go grocery shopping", "Go to the movies"], "answer": "Go grocery shopping"},
                    {"id": "R13-D-06", "question": "Can Rosa cook?", "options": ["Yes, simple meals", "No", "Yes, very well"], "answer": "Yes, simple meals"},
                    {"id": "R13-D-07", "question": "Who cooks very well?", "options": ["Rosa", "Her mother", "Her father"], "answer": "Her mother"},
                    {"id": "R13-D-08", "question": "What can the father do?", "options": ["Cook", "Fix things", "Clean"], "answer": "Fix things"},
                    {"id": "R13-D-09", "question": "Do they love their home?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "R13-D-10", "question": "How many people are in the family?", "options": ["Two", "Three", "Four"], "answer": "Three"}
                ]
            },
            "listening": {
                "script": "A: What do you usually do on weekends? B: I go grocery shopping with my family. A: What do you buy? B: We buy vegetables, fruits, and bread. A: Can you cook? B: Yes, I can cook simple meals. My mother teaches me.",
                "questions": [
                    {"id": "L13-D-01", "question": "What does B do on weekends?", "options": ["Go to the park", "Go grocery shopping", "Stay home"], "answer": "Go grocery shopping"},
                    {"id": "L13-D-02", "question": "Who does B go with?", "options": ["Friends", "Family", "Alone"], "answer": "Family"},
                    {"id": "L13-D-03", "question": "What do they buy?", "options": ["Clothes", "Vegetables, fruits, and bread", "Toys"], "answer": "Vegetables, fruits, and bread"},
                    {"id": "L13-D-04", "question": "Can B cook?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L13-D-05", "question": "What kind of meals can B cook?", "options": ["Complex meals", "Simple meals", "No meals"], "answer": "Simple meals"},
                    {"id": "L13-D-06", "question": "Who teaches B to cook?", "options": ["Father", "Mother", "No one"], "answer": "Mother"},
                    {"id": "L13-D-07", "question": "How many people are talking?", "options": ["One", "Two", "Three"], "answer": "Two"},
                    {"id": "L13-D-08", "question": "Is this about daily activities?", "options": ["Yes", "No"], "answer": "Yes"},
                    {"id": "L13-D-09", "question": "Does B enjoy cooking?", "options": ["Yes", "No", "Not mentioned"], "answer": "Yes"},
                    {"id": "L13-D-10", "question": "What is the conversation about?", "options": ["Work", "Weekend activities", "School"], "answer": "Weekend activities"}
                ]
            },
            "speaking": [
                {"id": "S13-D-01", "prompt": "Say: 'I live in a nice neighborhood.'"},
                {"id": "S13-D-02", "prompt": "Say: 'There are three bedrooms in my house.'"},
                {"id": "S13-D-03", "prompt": "Say: 'I am cooking dinner right now.'"},
                {"id": "S13-D-04", "prompt": "Say: 'Can you help me clean the house?'"},
                {"id": "S13-D-05", "prompt": "Say: 'I can cook simple meals.'"},
                {"id": "S13-D-06", "prompt": "Say: 'My family is small but happy.'"},
                {"id": "S13-D-07", "prompt": "Say: 'On weekends, I go grocery shopping.'"},
                {"id": "S13-D-08", "prompt": "Say: 'My neighbor is very friendly.'"},
                {"id": "S13-D-09", "prompt": "Say: 'I love my home.'"},
                {"id": "S13-D-10", "prompt": "Describe your daily routine in 3 sentences."}
            ],
            "writing": [
                {"id": "W13-D-01", "type": "unscramble", "words": ["I", "live", "in", "a", "nice", "neighborhood"], "answer": "I live in a nice neighborhood"},
                {"id": "W13-D-02", "type": "unscramble", "words": ["There", "are", "three", "bedrooms"], "answer": "There are three bedrooms"},
                {"id": "W13-D-03", "type": "unscramble", "words": ["I", "am", "cooking", "dinner"], "answer": "I am cooking dinner"},
                {"id": "W13-D-04", "question": "Write: Tengo dos hermanas.", "answer": "I have two sisters"},
                {"id": "W13-D-05", "question": "Write: Hay un jardin grande.", "answer": "There is a big garden"},
                {"id": "W13-D-06", "type": "fill_blank", "question": "I ___ from this neighborhood.", "answer": "am"},
                {"id": "W13-D-07", "type": "fill_blank", "question": "She ___ cooking dinner.", "answer": "is"},
                {"id": "W13-D-08", "type": "fill_blank", "question": "___ you help me?", "answer": "Can"},
                {"id": "W13-D-09", "type": "unscramble", "words": ["My", "mother", "is", "a", "teacher"], "answer": "My mother is a teacher"},
                {"id": "W13-D-10", "type": "unscramble", "words": ["We", "love", "our", "home"], "answer": "We love our home"}
            ],
            "pronunciation": [
                {"id": "P13-D-01", "phrase": "I live in a nice neighborhood.", "focus": "'neighborhood' stress on first syllable"},
                {"id": "P13-D-02", "phrase": "There are three bedrooms.", "focus": "'three' has a 'th' sound"},
                {"id": "P13-D-03", "phrase": "I am cooking dinner.", "focus": "'cooking' stress on first syllable"},
                {"id": "P13-D-04", "phrase": "Can you help me?", "focus": "'Can you' sounds like 'Canya'"},
                {"id": "P13-D-05", "phrase": "I can cook simple meals.", "focus": "'simple' sounds like 'sim-pul'"},
                {"id": "P13-D-06", "phrase": "My family is small but happy.", "focus": "'family' stress on first syllable"},
                {"id": "P13-D-07", "phrase": "We go grocery shopping.", "focus": "'grocery' sounds like 'groh-sherry'"},
                {"id": "P13-D-08", "phrase": "My neighbor is friendly.", "focus": "'neighbor' stress on first syllable"},
                {"id": "P13-D-09", "phrase": "I love my home.", "focus": "Stress on 'love' and 'home'"},
                {"id": "P13-D-10", "phrase": "We are all busy but happy.", "focus": "'busy' sounds like 'bizz-ee'"}
            ]
        }
    }

    vida_diaria["11"] = vida_diaria_11
    vida_diaria["12"] = vida_diaria_12
    vida_diaria["13"] = vida_diaria_13
    print(f"Vida diaria lessons updated: {len(vida_diaria)} total")

    # ============================================================
    # WRITE OUTPUT
    # ============================================================
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nDone! File written to {DATA_PATH}")

    # Verify
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        verify = json.load(f)
    core = verify["course_subtopics"]["A1-M01"]
    viajes_count = len(verify["lesson_content_variants"]["viajes"])
    vida_count = len(verify["lesson_content_variants"]["vida_diaria"])
    print(f"Verification: {len(core)} core lessons, {viajes_count} viajes lessons, {vida_count} vida_diaria lessons")
    for l in core:
        print(f"  {l['subtopic_id']}: {l['title']} (seq={l['sequence_order']})")


if __name__ == "__main__":
    main()
