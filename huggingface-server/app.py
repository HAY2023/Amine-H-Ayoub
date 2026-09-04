from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import random
import uuid

app = FastAPI(title="Learn Quran Kids Quiz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# بيانات مبسطة لبعض السور (يمكن التوسع فيها لتشمل الـ 114 سورة)
SURAHS = [
    {"id": 1, "name": "الفاتحة", "ayahs": 7, "type": "مكية"},
    {"id": 2, "name": "البقرة", "ayahs": 286, "type": "مدنية"},
    {"id": 3, "name": "آل عمران", "ayahs": 200, "type": "مدنية"},
    {"id": 18, "name": "الكهف", "ayahs": 110, "type": "مكية"},
    {"id": 36, "name": "يس", "ayahs": 83, "type": "مكية"},
    {"id": 55, "name": "الرحمن", "ayahs": 78, "type": "مدنية"},
    {"id": 56, "name": "الواقعة", "ayahs": 96, "type": "مكية"},
    {"id": 67, "name": "الملك", "ayahs": 30, "type": "مكية"},
    {"id": 93, "name": "الضحى", "ayahs": 11, "type": "مكية"},
    {"id": 94, "name": "الشرح", "ayahs": 8, "type": "مكية"},
    {"id": 97, "name": "القدر", "ayahs": 5, "type": "مكية"},
    {"id": 108, "name": "الكوثر", "ayahs": 3, "type": "مكية"},
    {"id": 112, "name": "الإخلاص", "ayahs": 4, "type": "مكية"},
    {"id": 113, "name": "الفلق", "ayahs": 5, "type": "مكية"},
    {"id": 114, "name": "الناس", "ayahs": 6, "type": "مكية"},
]

def generate_questions():
    questions = []
    
    # 1. أسئلة عن عدد الآيات
    for s in SURAHS:
        wrong_options = [s["ayahs"] - 1, s["ayahs"] + 1, s["ayahs"] + 2, s["ayahs"] - 2]
        wrong_options = [o for o in wrong_options if o > 0]
        options = [s["ayahs"]] + random.sample(wrong_options, 3)
        random.shuffle(options)
        
        questions.append({
            "id": f"ayahs_count_{s['id']}",
            "type": "multiple_choice",
            "question": f"كم عدد آيات سورة {s['name']}؟",
            "options": [str(opt) for opt in options],
            "correct_answer": str(s["ayahs"])
        })
    
    # 2. أسئلة مكية أو مدنية
    for s in SURAHS:
        options = ["مكية", "مدنية"]
        questions.append({
            "id": f"revelation_type_{s['id']}",
            "type": "true_false",
            "question": f"هل سورة {s['name']} مكية أم مدنية؟",
            "options": options,
            "correct_answer": s["type"]
        })
        
    # 3. ترتيب السور (السورة التي تليها)
    for i in range(len(SURAHS) - 1):
        s1 = SURAHS[i]
        s2 = SURAHS[i+1]
        
        other_surahs = [s["name"] for s in SURAHS if s["id"] not in (s1["id"], s2["id"])]
        options = [s2["name"]] + random.sample(other_surahs, 3)
        random.shuffle(options)
        
        questions.append({
            "id": f"next_surah_{s1['id']}",
            "type": "multiple_choice",
            "question": f"ما هي السورة التي تأتي مباشرة بعد سورة {s1['name']} في ترتيب المصحف من الخيارات التالية؟",
            "options": options,
            "correct_answer": s2["name"]
        })
        
    return questions

ALL_QUESTIONS = generate_questions()

@app.get("/api/questions")
def get_questions(exclude: str = Query(None, description="Comma separated list of question IDs to exclude"), limit: int = 60):
    exclude_list = []
    if exclude:
        exclude_list = exclude.split(",")
        
    available = [q for q in ALL_QUESTIONS if q["id"] not in exclude_list]
    
    # إذا كانت الأسئلة المتاحة أقل من الحد المطلوب، نعيد المتوفر فقط
    # وفي حال انتهت جميع الأسئلة نعيد القائمة فارغة ليقوم التطبيق بتصفير الأسئلة المجابة
    if len(available) <= limit:
        return {"questions": available, "remaining": len(available)}
        
    selected = random.sample(available, limit)
    return {"questions": selected, "remaining": len(available) - limit}

@app.get("/")
def read_root():
    return {"message": "Welcome to Learn Quran Kids Quiz Server API", "total_questions": len(ALL_QUESTIONS)}
