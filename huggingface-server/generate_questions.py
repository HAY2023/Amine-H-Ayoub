import json
import random

# We'll use all 114 surahs to generate a robust dataset.
SURAHS = [
   
    {"id": 36, "name": "يس", "ayahs": 83, "type": "مكية"},
    {"id": 37, "name": "الصافات", "ayahs": 182, "type": "مكية"},
    {"id": 38, "name": "ص", "ayahs": 88, "type": "مكية"},
    {"id": 39, "name": "الزمر", "ayahs": 75, "type": "مكية"},
    {"id": 40, "name": "غافر", "ayahs": 85, "type": "مكية"},
    {"id": 41, "name": "فصلت", "ayahs": 54, "type": "مكية"},
    {"id": 42, "name": "الشورى", "ayahs": 53, "type": "مكية"},
    {"id": 43, "name": "الزخرف", "ayahs": 89, "type": "مكية"},
    {"id": 44, "name": "الدخان", "ayahs": 59, "type": "مكية"},
    {"id": 45, "name": "الجاثية", "ayahs": 37, "type": "مكية"},
    {"id": 46, "name": "الأحقاف", "ayahs": 35, "type": "مكية"},
    {"id": 47, "name": "محمد", "ayahs": 38, "type": "مدنية"},
    {"id": 48, "name": "الفتح", "ayahs": 29, "type": "مدنية"},
    {"id": 49, "name": "الحجرات", "ayahs": 18, "type": "مدنية"},
    {"id": 50, "name": "ق", "ayahs": 45, "type": "مكية"},
    {"id": 51, "name": "الذاريات", "ayahs": 60, "type": "مكية"},
    {"id": 52, "name": "الطور", "ayahs": 49, "type": "مكية"},
    {"id": 53, "name": "النجم", "ayahs": 62, "type": "مكية"},
    {"id": 54, "name": "القمر", "ayahs": 55, "type": "مكية"},
    {"id": 55, "name": "الرحمن", "ayahs": 78, "type": "مدنية"},
    {"id": 56, "name": "الواقعة", "ayahs": 96, "type": "مكية"},
    {"id": 57, "name": "الحديد", "ayahs": 29, "type": "مدنية"},
    {"id": 58, "name": "المجادلة", "ayahs": 22, "type": "مدنية"},
    {"id": 59, "name": "الحشر", "ayahs": 24, "type": "مدنية"},
    {"id": 60, "name": "الممتحنة", "ayahs": 13, "type": "مدنية"},
    {"id": 61, "name": "الصف", "ayahs": 14, "type": "مدنية"},
    {"id": 62, "name": "الجمعة", "ayahs": 11, "type": "مدنية"},
    {"id": 63, "name": "المنافقون", "ayahs": 11, "type": "مدنية"},
    {"id": 64, "name": "التغابن", "ayahs": 18, "type": "مدنية"},
    {"id": 65, "name": "الطلاق", "ayahs": 12, "type": "مدنية"},
    {"id": 66, "name": "التحريم", "ayahs": 12, "type": "مدنية"},
    {"id": 67, "name": "الملك", "ayahs": 30, "type": "مكية"},
    {"id": 68, "name": "القلم", "ayahs": 52, "type": "مكية"},
    {"id": 69, "name": "الحاقة", "ayahs": 52, "type": "مكية"},
    {"id": 70, "name": "المعارج", "ayahs": 44, "type": "مكية"},
    {"id": 71, "name": "نوح", "ayahs": 28, "type": "مكية"},
    {"id": 72, "name": "الجن", "ayahs": 28, "type": "مكية"},
    {"id": 73, "name": "المزمل", "ayahs": 20, "type": "مكية"},
    {"id": 74, "name": "المدثر", "ayahs": 56, "type": "مكية"},
    {"id": 75, "name": "القيامة", "ayahs": 40, "type": "مكية"},
    {"id": 76, "name": "الإنسان", "ayahs": 31, "type": "مدنية"},
    {"id": 77, "name": "المرسلات", "ayahs": 50, "type": "مكية"},
    {"id": 78, "name": "النبأ", "ayahs": 40, "type": "مكية"},
    {"id": 79, "name": "النازعات", "ayahs": 46, "type": "مكية"},
    {"id": 80, "name": "عبس", "ayahs": 42, "type": "مكية"},
    {"id": 81, "name": "التكوير", "ayahs": 29, "type": "مكية"},
    {"id": 82, "name": "الانفطار", "ayahs": 19, "type": "مكية"},
    {"id": 83, "name": "المطففين", "ayahs": 36, "type": "مكية"},
    {"id": 84, "name": "الانشقاق", "ayahs": 25, "type": "مكية"},
    {"id": 85, "name": "البروج", "ayahs": 22, "type": "مكية"},
    {"id": 86, "name": "الطارق", "ayahs": 17, "type": "مكية"},
    {"id": 87, "name": "الأعلى", "ayahs": 19, "type": "مكية"},
    {"id": 88, "name": "الغاشية", "ayahs": 26, "type": "مكية"},
    {"id": 89, "name": "الفجر", "ayahs": 30, "type": "مكية"},
    {"id": 90, "name": "البلد", "ayahs": 20, "type": "مكية"},
    {"id": 91, "name": "الشمس", "ayahs": 15, "type": "مكية"},
    {"id": 92, "name": "الليل", "ayahs": 21, "type": "مكية"},
    {"id": 93, "name": "الضحى", "ayahs": 11, "type": "مكية"},
    {"id": 94, "name": "الشرح", "ayahs": 8, "type": "مكية"},
    {"id": 95, "name": "التين", "ayahs": 8, "type": "مكية"},
    {"id": 96, "name": "العلق", "ayahs": 19, "type": "مكية"},
    {"id": 97, "name": "القدر", "ayahs": 5, "type": "مكية"},
    {"id": 98, "name": "البينة", "ayahs": 8, "type": "مدنية"},
    {"id": 99, "name": "الزلزلة", "ayahs": 8, "type": "مدنية"},
    {"id": 100, "name": "العاديات", "ayahs": 11, "type": "مكية"},
    {"id": 101, "name": "القارعة", "ayahs": 11, "type": "مكية"},
    {"id": 102, "name": "التكاثر", "ayahs": 8, "type": "مكية"},
    {"id": 103, "name": "العصر", "ayahs": 3, "type": "مكية"},
    {"id": 104, "name": "الهمزة", "ayahs": 9, "type": "مكية"},
    {"id": 105, "name": "الفيل", "ayahs": 5, "type": "مكية"},
    {"id": 106, "name": "قريش", "ayahs": 4, "type": "مكية"},
    {"id": 107, "name": "الماعون", "ayahs": 7, "type": "مكية"},
    {"id": 108, "name": "الكوثر", "ayahs": 3, "type": "مكية"},
    {"id": 109, "name": "الكافرون", "ayahs": 6, "type": "مكية"},
    {"id": 110, "name": "النصر", "ayahs": 3, "type": "مدنية"},
    {"id": 111, "name": "المسد", "ayahs": 5, "type": "مكية"},
    {"id": 112, "name": "الإخلاص", "ayahs": 4, "type": "مكية"},
    {"id": 113, "name": "الفلق", "ayahs": 5, "type": "مكية"},
    {"id": 114, "name": "الناس", "ayahs": 6, "type": "مكية"}
]

def generate_questions():
    questions = []
    
    # فلترة السور لتكون من سورة يس (36) فما دون (إلى 114)
    filtered_surahs = [s for s in SURAHS if s["id"] >= 36]

    # 1. أسئلة عن عدد الآيات
    for s in filtered_surahs:
        wrong_options = [s["ayahs"] - 1, s["ayahs"] + 1, s["ayahs"] + 2, s["ayahs"] - 2, s["ayahs"] + 5, s["ayahs"] - 3]
        wrong_options = list(set([o for o in wrong_options if o > 0]))
        options = [s["ayahs"]] + random.sample(wrong_options, min(3, len(wrong_options)))
        random.shuffle(options)
        
        questions.append({
            "id": f"ayahs_count_{s['id']}",
            "type": "multiple_choice",
            "question": f"كم عدد آيات سورة {s['name']}؟",
            "options": [str(opt) for opt in options],
            "correct_answer": str(s["ayahs"])
        })
    
    # 2. أسئلة مكية أو مدنية
    for s in filtered_surahs:
        options = ["مكية", "مدنية"]
        questions.append({
            "id": f"revelation_type_{s['id']}",
            "type": "true_false",
            "question": f"هل سورة {s['name']} مكية أم مدنية؟",
            "options": options,
            "correct_answer": s["type"]
        })
        
    # 3. ترتيب السور (السورة التي تليها)
    for i in range(len(filtered_surahs) - 1):
        s1 = filtered_surahs[i]
        s2 = filtered_surahs[i+1]
        
        other_surahs = [s["name"] for s in filtered_surahs if s["id"] not in (s1["id"], s2["id"])]
        options = [s2["name"]] + random.sample(other_surahs, 3)
        random.shuffle(options)
        
        questions.append({
            "id": f"next_surah_{s1['id']}",
            "type": "multiple_choice",
            "question": f"ما هي السورة التي تأتي مباشرة بعد سورة {s1['name']} في ترتيب المصحف؟",
            "options": options,
            "correct_answer": s2["name"]
        })

    # 4. ترتيب السور (السورة التي تسبقها)
    for i in range(1, len(filtered_surahs)):
        s1 = filtered_surahs[i]
        s0 = filtered_surahs[i-1]
        
        other_surahs = [s["name"] for s in filtered_surahs if s["id"] not in (s1["id"], s0["id"])]
        options = [s0["name"]] + random.sample(other_surahs, 3)
        random.shuffle(options)
        
        questions.append({
            "id": f"prev_surah_{s1['id']}",
            "type": "multiple_choice",
            "question": f"ما هي السورة التي تسبق سورة {s1['name']} مباشرة في المصحف؟",
            "options": options,
            "correct_answer": s0["name"]
        })
        
    return questions

ALL_QUESTIONS = generate_questions()
print(f"Generated {len(ALL_QUESTIONS)} questions.")

with open('questions.json', 'w', encoding='utf-8') as f:
    json.dump({"questions": ALL_QUESTIONS, "total": len(ALL_QUESTIONS)}, f, ensure_ascii=False, indent=2)
print("Saved to questions.json")
