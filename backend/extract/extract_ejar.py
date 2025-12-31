# -*- coding: utf-8 -*-
from __future__ import annotations
import os, re, json, argparse, unicodedata
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import pdfplumber

# ------------------------------
# Helpers
# ------------------------------
AR_NUMS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
ARABIC_CHARS = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]")

def to_ascii_digits(s: str) -> str:
    return (s or "").translate(AR_NUMS)

def norm_space(s: str) -> str:
    return re.sub(r"[ \t\u200f\u200e]+", " ", s or "").strip()

def parse_date_any(s: str) -> Optional[str]:
    if not s: return None
    s = to_ascii_digits(s).replace("\\", "-").replace("/", "-").strip()
    for f in ["%Y-%m-%d", "%d-%m-%Y", "%m-%d-%Y", "%d-%m-%y"]:
        try:
            return datetime.strptime(s, f).strftime("%Y-%m-%d")
        except: pass
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s): return s
    return None

def extract_text(pdf_path: str) -> Tuple[str, List[str]]:
    pages_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for p in pdf.pages:
            try:
                t = p.extract_text() or ""
            except Exception:
                t = ""
            pages_text.append(t)
    return "\n".join(pages_text), pages_text

# ------------------------------
# Arabic post-processing (for JSON)
# ------------------------------
def _normalize_ar_presentation(s: str) -> str:
    # يحوّل Presentation Forms إلى حروف عربية عادية
    s = unicodedata.normalize("NFKC", s or "")
    # تصحيح الرموز الخاصة
    s = s.replace("ﷲ", "الله")
    s = s.replace("ﷺ", "")
    # شيل فراغات قبل/بعد النقطتين إن وجدت
    s = re.sub(r"\s*[:：]\s*$", "", s)
    return s

def _shape_ar_for_display(s: str) -> str:
    """ تشكيل النص العربي للعرض (بدون قلب bidi). """
    try:
        import arabic_reshaper
        reshaped = arabic_reshaper.reshape(s)
        return reshaped
    except Exception:
        return s

def _fix_arabic_text(text: str) -> str:
    """ إصلاح اتجاه النص العربي - عكس الكلمات والجملة. """
    if not text or not ARABIC_CHARS.search(text):
        return text
    
    text = _normalize_ar_presentation(text)
    
    # إصلاح الكلمات التي تحتوي على "الله" أو "الـ" بدون مسافات
    text = re.sub(r'(الله)([^\s])', r'\1 \2', text)  # الله + حرف
    text = re.sub(r'([^\s])(الله)', r'\1 \2', text)  # حرف + الله
    text = re.sub(r'([^\s])(ال)([^\s])', r'\1 \2\3', text)  # حرف + ال + حرف
    
    words = text.split()
    reversed_words = []
    for w in words:
        # لا نعكس "الله" لأنها خاصة
        if w == 'الله':
            reversed_words.append('الله')
        else:
            reversed_words.append(w[::-1])
    
    return " ".join(reversed_words[::-1])

def arabic_for_json(value: Any, shape: bool=True) -> Any:
    if not isinstance(value, str): 
        return value
    if not ARABIC_CHARS.search(value):
        return value
    s = _normalize_ar_presentation(value)
    if shape:
        s = _shape_ar_for_display(s)
    return s

def walk_and_fix_arabic(x: Any, shape: bool=True) -> Any:
    if isinstance(x, dict):
        return {k: walk_and_fix_arabic(v, shape) for k, v in x.items()}
    elif isinstance(x, list):
        return [walk_and_fix_arabic(v, shape) for v in x]
    else:
        return arabic_for_json(x, shape)

# ------------------------------
# Section detection
# ------------------------------
SECTION_PATTERNS = [
    (r"(?:Lessor\s*Data)", "lessor"),
    (r"(?:Lessor\s*Representative\s*Data)", "lessor_rep"),
    (r"(?:Tenant\s*Data)", "tenant"),
    (r"(?:Tenant\s*Representative\s*Data)", "tenant_rep"),
    (r"(?:Brokerage\s*Entity.*?Data)", "brokerage"),
    (r"(?:Title\s*Deeds?\s*Data)", "titles"),
    (r"(?:Property\s*Data)", "property"),
    (r"(?:Rental\s*Units?\s*Data)", "units"),
    (r"(?:Financial\s*Data)", "financial"),
    (r"(?:Rent\s*Payments?\s*Schedule)", "payments"),
]

def find_spans(full_text: str) -> Dict[str, Tuple[int, int]]:
    marks = []
    for pat, key in SECTION_PATTERNS:
        m = re.search(pat, full_text, flags=re.IGNORECASE)
        if m: marks.append((m.start(), key))
    marks.sort()
    spans = {}
    for i, (pos, key) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(full_text)
        spans[key] = (pos, end)
    return spans

def slice_section(full_text: str, spans: Dict[str, Tuple[int,int]], key: str) -> str:
    if key not in spans: return ""
    a, b = spans[key]
    return full_text[a:b]

# ------------------------------
# Basic fields
# ------------------------------
def extract_basic(full_text: str) -> Dict[str, Any]:
    """
    استخراج الحقول الأساسية من نص عقد الإيجار (رقم العقد، الإيجار السنوي، القيمة الإجمالية، بداية ونهاية العقد).
    يدعم العربية والإنجليزية ويتعامل مع النصوص متعددة الأسطر.
    """
    text_d = to_ascii_digits(full_text)
    out: Dict[str, Any] = {}

    # -------------------------------
    # رقم العقد
    # -------------------------------
    m = re.search(r"Contract\s+No\.?\s*([^\s/]+(?:/\S+)?)", full_text, re.IGNORECASE)
    if m:
        out["contract_no"] = norm_space(m.group(1))

    # -------------------------------
    # الإيجار السنوي
    # -------------------------------
    m = re.search(r"Annual\s*Rent[:：]?\s*([0-9\.,]+)", text_d, re.IGNORECASE)
    if m:
        try:
            out["annual_rent"] = f"{float(m.group(1).replace(',', '')):.2f}"
        except:
            out["annual_rent"] = m.group(1)

    # -------------------------------
    # القيمة الإجمالية للعقد
    # -------------------------------
    m = re.search(r"Total\s*Contract\s*Value[:：]?\s*([0-9\.,]+)", text_d, re.IGNORECASE)
    if m:
        try:
            out["total_contract_value"] = f"{float(m.group(1).replace(',', '')):.2f}"
        except:
            out["total_contract_value"] = m.group(1)

    # -------------------------------
    # ✅ تاريخ بداية ونهاية العقد (باللغتين)
    # -------------------------------
    date_patterns = [
        # English: Tenancy Start / End Date
        r"Tenancy\s*Start\s*Date\s*[:：]?\s*([0-9/\-]+)[\s\S]{0,100}?(?:Tenancy\s*End\s*Date\s*[:：]?\s*([0-9/\-]+))",
        # Arabic: بداية العقد / نهاية أو انتهاء العقد
        r"بداية\s*العقد\s*[:：]?\s*([0-9/\-]+)[\s\S]{0,100}?(?:نهاية|انتهاء)\s*العقد\s*[:：]?\s*([0-9/\-]+)",
    ]

    for pat in date_patterns:
        m = re.search(pat, text_d, re.IGNORECASE)
        if m:
            start_raw, end_raw = m.group(1).strip(), m.group(2).strip()
            start = parse_date_any(start_raw) or start_raw
            end = parse_date_any(end_raw) or end_raw
            out["tenancy_start"] = start
            out["tenancy_end"] = end
            break

    # -------------------------------
    # ✅ fallback إذا كانت كل تاريخ في سطر منفصل
    # -------------------------------
    if "tenancy_start" not in out:
        m1 = re.search(r"Tenancy\s*Start\s*Date\s*[:：]?\s*([0-9/\-]+)", text_d, re.IGNORECASE)
        if m1:
            out["tenancy_start"] = parse_date_any(m1.group(1)) or m1.group(1)
    if "tenancy_end" not in out:
        m2 = re.search(r"Tenancy\s*End\s*Date\s*[:：]?\s*([0-9/\-]+)", text_d, re.IGNORECASE)
        if m2:
            out["tenancy_end"] = parse_date_any(m2.group(1)) or m2.group(1)

    # -------------------------------
    # ✅ fallback العربية بشكل منفصل
    # -------------------------------
    if "tenancy_start" not in out:
        m1 = re.search(r"بداية\s*العقد\s*[:：]?\s*([0-9/\-]+)", text_d)
        if m1:
            out["tenancy_start"] = parse_date_any(m1.group(1)) or m1.group(1)
    if "tenancy_end" not in out:
        m2 = re.search(r"(?:نهاية|انتهاء)\s*العقد\s*[:：]?\s*([0-9/\-]+)", text_d)
        if m2:
            out["tenancy_end"] = parse_date_any(m2.group(1)) or m2.group(1)

    return out



# ------------------------------
# People parsing
# ------------------------------
def clean_name_line(s: str) -> str:
    s = norm_space(s)
    s = re.sub(r"\s*[:：]?\s*(?:ﻢﺳﻻا|الاسم)\s*$", "", s)
    return s

def split_cards_by_name(block: str) -> List[str]:
    idxs = [m.start() for m in re.finditer(r"(?m)^Name\s+", block)]
    cards = []
    for i, start in enumerate(idxs):
        end = idxs[i+1] if i+1 < len(idxs) else len(block)
        cards.append(block[start:end])
    return cards or ([block] if re.search(r"(?m)^Name\s+", block) else [])

def pick_first(pattern: str, text: str, flags=0, group=1, post=lambda x: x) -> str:
    m = re.search(pattern, text or "", flags)
    if not m:
        return ""
    try:
        return post(m.group(group))
    except IndexError:
        return post(m.group(0))


def parse_person_card(card: str) -> Dict[str, str]:
    info: Dict[str, str] = {}

    # الاسم
    m = re.search(r"(?m)^Name\s+(.+?)\s*$", card)
    if m:
        info["name"] = clean_name_line(m.group(1))
        

    bd = to_ascii_digits(card)
    info["id"] = pick_first(r"ID\s*No\.?\s*([0-9]+)", bd)
    info["phone"] = norm_space(pick_first(r"Mobile\s*No\.?\s*([+\d][\d\s\-+]*)", card, re.IGNORECASE))
    info["email"] = pick_first(r"Email\s+([^\s:]+@[^\s:]+)", card, re.IGNORECASE)

    # -----------------------------
    # ✅ الجنسية
    # -----------------------------
    nat = ""
    m_inline = re.search(
        r"(?:الجنسية|Nationality|ﺔﻴ\S*ﻟا)\s*[:：]?\s*([^\n:]+)",
        card, re.IGNORECASE)
    if m_inline:
        val = m_inline.group(1).strip()
        val = re.split(r"(?:ID|Type|No\.|\bNationality\b|Email|Mobile)", val)[0]
        nat = val.strip(" :،.-")

    if not nat:
        lines = [l.strip() for l in card.splitlines() if l.strip()]
        for i, line in enumerate(lines):
            if re.search(r"(?:الجنسية|Nationality|ﺔﻴ\S*ﻟا)", line):
                if i + 1 < len(lines):
                    nxt = lines[i + 1].strip()
                    if nxt and not re.search(r"(?:الجنسية|Nationality|ﺔﻴ\S*ﻟا)", nxt):
                        nat = nxt.strip(" :،.-")
                        break

    if nat:
        nat = re.sub(r"(?:الجنسية|Nationality|ﺔﻴ\S*ﻟا)\b", "", nat).strip(" :،.-")
        if nat and not re.fullmatch(r"(?:الجنسية|Nationality|ﺔ\S*ﻟا)", nat):
            info["nationality"] = nat

    # -----------------------------
    # ✅ إصلاح الاتجاه العربي (الاسم والجنسية)
    # -----------------------------
    for key in ["name", "nationality"]:
        if key in info and ARABIC_CHARS.search(info[key]):
            info[key] = _fix_arabic_text(info[key])

    # ✅ تحويل الحروف الشكلية Presentation Forms إلى الحروف العربية الأصلية
    import unicodedata
    for key in ["name", "nationality"]:
        if key in info:
            info[key] = unicodedata.normalize("NFKC", info[key])

    return {k: v for k, v in info.items() if v}


def extract_party_people(block: str) -> List[Dict[str, str]]:
    people = []
    for c in split_cards_by_name(block):
        p = parse_person_card(c)
        if any(p.values()):
            people.append(p)
    # unique
    seen=set(); uniq=[]
    for p in people:
        key=(p.get("name",""), p.get("id",""), p.get("phone",""))
        if key not in seen:
            seen.add(key); uniq.append(p)
    return uniq

# ------------------------------
# Company (Tenant/Lessor company header)
# ------------------------------
def extract_company_header(block: str, role: str) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    bd = to_ascii_digits(block)

    name = pick_first(r"(?mi)^(?:Tenant|Lessee|Company|Entity|Establishment)\s*Name\s*[:：]?\s*(.+?)$",
                      block)
    if not name:
        name = pick_first(r"(?mi)^Name\s+(.+?)$", block)
    if name:
        name = clean_name_line(name)
        # تصحيح النص العربي إذا كان مقلوباً
        if ARABIC_CHARS.search(name):
            name = _fix_arabic_text(name)
        out[f"{role}_name"] = name

    uni = pick_first(r"\bUnified\s*(?:No\.?|Number)\s*([0-9]+)\b", bd)
    cr  = pick_first(r"\bCR\s*No\.?\s*([0-9]+)\b", bd)
    dt  = pick_first(r"\bIssue\s*Date\s*([0-9/\-]+)\b", bd, post=lambda x: parse_date_any(x) or x)

    if uni: out[f"{role}_unified_no"] = uni
    if cr:  out[f"{role}_cr_no"] = cr
    if dt:  out[f"{role}_cr_date"] = dt

    em = pick_first(r"Email\s+([^\s:]+@[^\s:]+)", block, re.IGNORECASE)
    ph = pick_first(r"Mobile\s*No\.?\s*([+\d][\d\s\-+]*)", block, re.IGNORECASE)
    if em: out[f"{role}_email"] = em
    if ph: out[f"{role}_phone"] = norm_space(ph)

    company_obj = {}
    if out.get(f"{role}_name"):        company_obj["name"]        = out[f"{role}_name"]
    if out.get(f"{role}_unified_no"):  company_obj["unified_no"]  = out[f"{role}_unified_no"]
    if out.get(f"{role}_cr_no"):       company_obj["cr_no"]       = out[f"{role}_cr_no"]
    if out.get(f"{role}_cr_date"):     company_obj["cr_date"]     = out[f"{role}_cr_date"]
    if out.get(f"{role}_email"):       company_obj["email"]       = out[f"{role}_email"]
    if out.get(f"{role}_phone"):       company_obj["phone"]       = out[f"{role}_phone"]
    if company_obj:
        out[role] = company_obj

    return out

# ------------------------------
# Brokerage (entity + brokers)
# ------------------------------
def extract_brokerage(block: str) -> Dict[str, Any]:
    import unicodedata, re
    out: Dict[str, Any] = {}
    bd = to_ascii_digits(block)

    # ========== Entity Info ==========
    ent: Dict[str, str] = {}
    
    # استخراج الاسم والعنوان
    name_raw = pick_first(r"Brokerage\s*Entity\s*Name\s*[:：]?\s*(.+)", block, re.IGNORECASE)
    address_raw = pick_first(r"Brokerage\s*Entity\s*Address\s*[:：]?\s*(.+)", block, re.IGNORECASE)
    
    # تنظيف الاسم والعنوان من الـ labels
    if name_raw:
        # إزالة الـ labels العربية والإنجليزية من الاسم
        name_raw = re.sub(
            r"(?:اسم\s*منش[اأإآ](?:ة|ﺔ)?\s*الوساطة\s*العقارية|ﺔﻳرﺎﻘﻌﻟا\s*ﺔﻃﺎﺳﻮﻟا\s*ةﺄﺸﻨﻣ\s*ﻢﺳا)\s*[:：]?\s*",
            "",
            name_raw,
            flags=re.IGNORECASE
        )
        if ARABIC_CHARS.search(name_raw):
            ent["name"] = _fix_arabic_text(name_raw)
        else:
            ent["name"] = norm_space(name_raw)
    
    if address_raw:
        # إزالة الـ labels من العنوان
        address_raw = re.sub(
            r"(?:عنوان\s*منش[اأإآ](?:ة|ﺔ)?\s*الوساطة\s*العقارية|ﺔﻳرﺎﻘﻌﻟا\s*ﺔﻃﺎﺳﻮﻟا\s*ةﺄﺸﻨﻣ\s*ناﻮﻨﻋ)\s*[:：]?\s*",
            "",
            address_raw,
            flags=re.IGNORECASE
        )
        if ARABIC_CHARS.search(address_raw):
            ent["address"] = _fix_arabic_text(address_raw)
        else:
            ent["address"] = norm_space(address_raw)
    
    ent["cr_no"]    = pick_first(r"\bCR\s*No\.?\s*([0-9]+)", bd)
    ent["landline"] = pick_first(r"Landline\s*No\.?\s*[:：]?\s*([0-9\-\s]+)", block, re.IGNORECASE)
    ent["fax"]      = pick_first(r"Fax\s*No\.?\s*[:：]?\s*([0-9\-\s]+)", block, re.IGNORECASE)

    ent = {k: v for k, v in ent.items() if v}
    if ent:
        out["brokerage_entity"] = ent

    # ========== Brokers ==========
    brokers: List[Dict[str, str]] = []

    for seg in re.finditer(r"(?is)Broker\s*Name\s+(.+?)(?=Broker\s*Name|$)", block):
        chunk = "Name " + seg.group(1)
        p = parse_person_card(chunk)
        if any(p.values()):
            brokers.append(p)

    if not brokers:
        brokers = extract_party_people(block)

    # ========== Clean broker names ==========
    cleaned_brokers = []
    for b in brokers:
        name = b.get("name", "")
        if name:
            # Remove any labels
            name = re.sub(
                r"^\s*(?:"
                r"الممثل\s*(?:النظامي|الرسمي)\s*(?:للمنشأة|لمنشأة\s*الوساطة\s*العقارية)?"
                r"|اسم\s*الموظف|الموظف|Employee\s*Name|Name|اسم"
                r")\s*[:：]?\s*",
                "",
                name,
                flags=re.IGNORECASE,
            )

            name = unicodedata.normalize("NFKC", name)
            name = name.replace("ﻻ", "ال")
            name = re.sub(r"\bلا\b", "ال", name)
            name = re.sub(r"\s+", " ", name).strip(" :،.-")

            # reverse full name (Arabic order)
            
            b["name"] = name

        cleaned_brokers.append(b)

    # ========== Unique ==========
    if cleaned_brokers:
        seen = set()
        uniq = []
        for b in cleaned_brokers:
            key = (b.get("name", ""), b.get("id", ""), b.get("phone", ""))
            if key not in seen:
                seen.add(key)
                uniq.append(b)
        out["brokers"] = uniq
        
        # إضافة رقم جوال أول وسيط إلى brokerage_entity
        if uniq and uniq[0].get("phone") and "brokerage_entity" in out:
            out["brokerage_entity"]["phone"] = uniq[0]["phone"]

    return out







# ------------------------------
# Property & Title Deeds
# ------------------------------
def extract_property(block: str) -> Dict[str, Any]:
    import re, unicodedata

    def reverse_arabic_word(word: str) -> str:
        """يقلب الحروف داخل الكلمات العربية فقط"""
        return word[::-1] if re.search(r"[\u0600-\u06FF]", word) else word

    def fix_arabic_text(text: str) -> str:
        """إصلاح اتجاه النص العربي كلمةً بحرف."""
        if not text:
            return ""
        text = unicodedata.normalize("NFKC", text)
        text = text.replace("ﻻ", "ال")
        text = re.sub(r"\s+", " ", text).strip(" :،.-")

        # نقلب كل كلمة عربية
        words = text.split()
        fixed_words = [reverse_arabic_word(w) for w in words]
        text = " ".join(fixed_words)

        # إصلاح الكلمات المعروفة
        text = text.replace("نكس دارفأ", "سكن أفراد")
        text = text.replace("ةرامع", "عمارة")
        return text.strip()

    def extract_numbers_only(text: str) -> str:
        """استخراج الأرقام فقط من النص."""
        if not text:
            return ""
        text = unicodedata.normalize("NFKC", text)
        text = text.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
        nums = re.findall(r"\d+", text)
        return "، ".join(nums)

    # ========== استخراج الحقول ==========
    out: Dict[str, Any] = {}
    out["national_address"] = pick_first(r"National\s*Address\s*[:：]?\s*(.+)", block, re.IGNORECASE)
    out["property_usage"]   = pick_first(r"Property\s*Usage\s*[:：]?\s*([^\n:]+)", block, re.IGNORECASE)
    out["property_type"]    = pick_first(r"Property\s*Type\s*[:：]?\s*([^\n:]+)", block, re.IGNORECASE)

    bd = to_ascii_digits(block)
    out["num_units"]        = pick_first(r"Number\s*of\s*Units\s*[:：]?\s*([0-9]+)", bd, re.IGNORECASE)
    out["num_floors"]       = pick_first(r"Number\s*of\s*Floors\s*[:：]?\s*([0-9]+)", bd, re.IGNORECASE)
    out["num_parking"]      = pick_first(r"(?:Number\s*of\s*Parking(?:\s*Lots)?)\s*[:：]?\s*([0-9]+)", bd, re.IGNORECASE)
    out["num_elevators"]    = pick_first(r"(?:Number\s*of\s*Elevators?)\s*[:：]?\s*([0-9]+)", bd, re.IGNORECASE)
    out["electricity_meters_count"] = pick_first(r"Number\s*of\s*Electricity\s*Meters?\s*[:：]?\s*([0-9]+)", bd, re.IGNORECASE)
    out["water_meters_count"]       = pick_first(r"Number\s*of\s*Water\s*Meters?\s*[:：]?\s*([0-9]+)", bd, re.IGNORECASE)
    out["gas_meters_count"]         = pick_first(r"Number\s*of\s*Gas\s*Meters?\s*[:：]?\s*([0-9]+)", bd, re.IGNORECASE)

    # 🧠 تصحيح الاتجاه / الفلاتر
    if out.get("national_address"):
        out["national_address"] = extract_numbers_only(out["national_address"])

    for k in ["property_usage", "property_type"]:
        if out.get(k):
            out[k] = fix_arabic_text(out[k])

    return {k: v for k, v in out.items() if v}
   


def extract_title_deeds(block: str) -> Dict[str, Any]:
    """ يلتقط رقم الصك + الجهة + مكان/تاريخ الإصدار بدون تشويش. """
    out: Dict[str, Any] = {}
    bd = to_ascii_digits(block)

    # رقم الصك: الرقم فقط
    td = pick_first(r"(?i)\bTitle\s*Deed\s*No\.?\s*[:：]?\s*([0-9\-]+)\b", bd)
    if td:
        out["title_deed_no"] = td
        out["ownership_no"]  = td

    # الجهة: قف عند أي حقل معروف تالٍ
    issuer = pick_first(
        r"(?is)\bIssuer\s*[:：]?\s*(.+?)(?=\s*(?:Title\s*Deed|Place\s*of\s*Issue|Issue\s*Date|$))",
        block, re.IGNORECASE, post=lambda s: norm_space(re.sub(r"\s*[:：]\s*$","",s))
    )
    if issuer:
        # إزالة الـ label وتصحيح الاتجاه
        issuer = re.sub(r"(?:جهة\s*الإصدار|راﺪﺻﻹا\s*ﺔﻬﺟ)\s*[:：]?\s*", "", issuer)
        issuer = issuer.strip(" :：")
        if ARABIC_CHARS.search(issuer):
            out["title_deed_issuer"] = _fix_arabic_text(issuer)
        elif issuer:
            out["title_deed_issuer"] = issuer

    # مكان الإصدار
    place = pick_first(
        r"(?is)\bPlace\s*of\s*Issue\s*[:：]?\s*(.+?)(?=\s*(?:Issuer|Title\s*Deed|Issue\s*Date|$))",
        block, re.IGNORECASE, post=norm_space
    )
    if place:
        # إزالة الـ label وتصحيح الاتجاه
        place = re.sub(r"(?:مكان\s*الإصدار|راﺪﺻﻹا\s*نﺎﻜﻣ)\s*[:：]?\s*", "", place)
        place = place.strip(" :：")
        if ARABIC_CHARS.search(place):
            out["title_deed_place"] = _fix_arabic_text(place)
        elif place:
            out["title_deed_place"] = place

    # تاريخ الإصدار
    issue_date = pick_first(r"(?i)\bIssue\s*Date\s*[:：]?\s*([0-9/\-]+)", bd,
                            post=lambda x: parse_date_any(x) or x)
    if issue_date:
        out["title_deed_issue_date"] = issue_date

    return out

# ------------------------------
# Units (+ meters/accounts)
# ------------------------------
def extract_unit_extras(seg: str) -> Dict[str, str]:
    extras: Dict[str, str] = {}
    patterns = [
        ("electricity_account_no", r"(?i)Electricity\s*(?:Account|Acc(?:ount)?)\s*No\.?\s*([A-Za-z0-9\-]+)"),
        ("electricity_meter_no",   r"(?i)Electricity\s*Meter\s*No\.?\s*([A-Za-z0-9\-]+)"),
        ("water_account_no",       r"(?i)Water\s*(?:Account|Acc(?:ount)?)\s*No\.?\s*([A-Za-z0-9\-]+)"),
        ("water_meter_no",         r"(?i)Water\s*Meter\s*No\.?\s*([A-Za-z0-9\-]+)"),
        ("gas_account_no",         r"(?i)Gas\s*(?:Account|Acc(?:ount)?)\s*No\.?\s*([A-Za-z0-9\-]+)"),
        ("gas_meter_no",           r"(?i)Gas\s*Meter\s*No\.?\s*([A-Za-z0-9\-]+)"),
        ("ac_type",                r"(?i)A\.?C\.?\s*Type\s*[:：]?\s*([^\n:]+)"),
    ]
    for key, pat in patterns:
        m = re.search(pat, seg)
        if m: extras[key] = norm_space(m.group(1))

    # Arabic fallbacks
    ar_patterns = [
        ("electricity_meter_no", r"عداد\s*الكهرب(?:اء)?\s*[:：]?\s*([0-9\-]+)"),
        ("water_meter_no",       r"عداد\s*الم(?:ي|ياه)\s*[:：]?\s*([0-9\-]+)"),
        ("gas_meter_no",         r"عداد\s*الغاز\s*[:：]?\s*([0-9\-]+)"),
    ]
    for key, pat in ar_patterns:
        m = re.search(pat, seg)
        if m and key not in extras:
            extras[key] = norm_space(m.group(1))

    return extras

import re
import unicodedata
from typing import List, Dict

def extract_units(block: str) -> List[Dict[str, str]]:
    units: List[Dict[str, str]] = []
    
    # 🔹 تقسيم كل وحدة (Unit)
    for m in re.finditer(r"(?is)Unit\s*No\.?\s*([^\s:\n]+)([\s\S]{0,600}?)(?=Unit\s*No\.?|$)", block):
        seg = m.group(0)
        u: Dict[str, str] = {"unit_no": m.group(1).strip().strip(".")}
        mtype = re.search(r"Unit\s*Type\s*([^\n:]+)", seg, re.IGNORECASE)
        if mtype:
            u["unit_type"] = norm_space(mtype.group(1))
        marea = re.search(r"Unit\s*Area\s*([0-9\.,]+)", to_ascii_digits(seg), re.IGNORECASE)
        if marea:
            try:
                u["unit_area"] = f"{float(marea.group(1).replace(',', '')):.1f}"
            except:
                pass
        u.update(extract_unit_extras(seg))
        units.append({k: v for k, v in u.items() if v})

    # 🔹 fallback لو مافي أكثر من وحدة
    if not units:
        seg = block
        u = {}
        m = re.search(r"Unit\s*No\.?\s*([^\s:\n]+)", seg, re.IGNORECASE)
        if m:
            u["unit_no"] = m.group(1).strip().strip(".")
        m = re.search(r"Unit\s*Type\s*([^\n:]+)", seg, re.IGNORECASE)
        if m:
            u["unit_type"] = norm_space(m.group(1))
        m = re.search(r"Unit\s*Area\s*([0-9\.,]+)", to_ascii_digits(seg), re.IGNORECASE)
        if m:
            try:
                u["unit_area"] = f"{float(m.group(1).replace(',', '')):.1f}"
            except:
                pass
        u.update(extract_unit_extras(seg))
        if u:
            units.append({k: v for k, v in u.items() if v})

    # 🔹 إزالة التكرار
    seen = set()
    uniq = []
    for u in units:
        key = (
            u.get("unit_no", ""),
            u.get("unit_type", ""),
            u.get("unit_area", ""),
            u.get("electricity_meter_no", ""),
            u.get("water_meter_no", ""),
            u.get("gas_meter_no", "")
        )
        if key not in seen:
            seen.add(key)
            uniq.append(u)

    # 🔹 تصحيح النصوص العربية في unit_type
    for u in uniq:
        if "unit_type" in u and ARABIC_CHARS.search(u["unit_type"]):
            u["unit_type"] = _fix_arabic_text(u["unit_type"])

    return uniq





# ------------------------------
# Financial (VAT) & Payments
# ------------------------------
def extract_vat(financial_block: str) -> str:
    bd = to_ascii_digits(financial_block)
    m = re.search(r"\bVAT\b.*?(?:Value|amount)?\s*[:\-]?\s*([0-9\.,]+)", bd, re.IGNORECASE)
    if m:
        try: return f"{float(m.group(1).replace(',', '')):.2f}"
        except: pass
    return ""

AMOUNT_RE = re.compile(r"(?<!\d)(\d{3,}(?:,\d{3})*\.\d{2})(?!\d)")
AD_RE     = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")
AH_RE     = re.compile(r"\b(14\d{2}-\d{2}-\d{2})\b")

def extract_payments(pay_block: str) -> Dict[str, Any]:
    payments: List[Dict[str, str]] = []
    block = to_ascii_digits(pay_block)

    row_pat = re.compile(
        r"(?m)^\s*(\d{3,}(?:,\d{3})*\.\d{2}).*?(14\d{2}-\d{2}-\d{2}).*?(20\d{2}-\d{2}-\d{2}).*$"
    )
    for m in row_pat.finditer(block):
        amt = m.group(1).replace(",", "")
        ad  = m.group(3)
        payments.append({"due_date": ad, "amount": f"{float(amt):.2f}"})

    if not payments:
        for ln in block.splitlines():
            ad = AD_RE.search(ln)
            amt = AMOUNT_RE.search(ln)
            if ad and amt:
                payments.append({
                    "due_date": parse_date_any(ad.group(1)) or ad.group(1),
                    "amount": f"{float(amt.group(1).replace(',', '')):.2f}"
                })

    if not payments:
        for ln in block.splitlines():
            ah = AH_RE.search(ln)
            amt = AMOUNT_RE.search(ln)
            if ah and amt:
                payments.append({
                    "due_date": ah.group(1),
                    "amount": f"{float(amt.group(1).replace(',', '')):.2f}"
                })

    seen=set(); uniq=[]
    for p in payments:
        key=(p["due_date"], p["amount"])
        if key not in seen:
            seen.add(key); uniq.append(p)

    out: Dict[str, Any] = {}
    if uniq:
        out["payments"] = uniq
        out["installments_count"] = len(uniq)
        amts = {p["amount"] for p in uniq}
        if len(amts) == 1:
            out["installment_amount"] = uniq[0]["amount"]
    return out

# ------------------------------
# Extract All
# ------------------------------
def extract_all(pdf_path: str, debug: bool=False) -> Dict[str, Any]:
    full_text, pages = extract_text(pdf_path)
    spans = find_spans(full_text)

    data: Dict[str, Any] = {}
    data.update(extract_basic(full_text))

    lessor_block   = slice_section(full_text, spans, "lessor")
    lessor_rep_blk = slice_section(full_text, spans, "lessor_rep")
    tenant_block   = slice_section(full_text, spans, "tenant")
    tenant_rep_blk = slice_section(full_text, spans, "tenant_rep")
    brokerage_blk  = slice_section(full_text, spans, "brokerage")
    titles_blk     = slice_section(full_text, spans, "titles")
    property_blk   = slice_section(full_text, spans, "property")
    financial_blk  = slice_section(full_text, spans, "financial")
    units_blk      = slice_section(full_text, spans, "units")
    pays_blk       = slice_section(full_text, spans, "payments")

    tenant_company = extract_company_header(tenant_block, "tenant")
    data.update(tenant_company)
    
    # استخراج الاسم من tenant_block مباشرة (بدل الاعتماد على company header)
    tenant_people = extract_party_people(tenant_block)
    if tenant_people and tenant_people[0].get("name"):
        data["tenant_name"] = tenant_people[0]["name"]
        if tenant_people[0].get("id"):
            data["tenant_id"] = tenant_people[0]["id"]
        if tenant_people[0].get("phone"):
            data["tenant_phone"] = tenant_people[0]["phone"]
        # تحديث tenant object
        if data.get("tenant"):
            data["tenant"]["name"] = tenant_people[0]["name"]
            if tenant_people[0].get("id"):
                data["tenant"]["id"] = tenant_people[0]["id"]
            if tenant_people[0].get("phone"):
                data["tenant"]["phone"] = tenant_people[0]["phone"]

    tenant_reps = extract_party_people(tenant_rep_blk)
    if tenant_reps:
        data["tenant_reps"] = tenant_reps
    if not data.get("tenant_name") and tenant_reps:
        data["tenant_name"]  = tenant_reps[0].get("name","")
        data["tenant_id"]    = tenant_reps[0].get("id","")
        data["tenant_phone"] = tenant_reps[0].get("phone","")
        data["tenant_email"] = tenant_reps[0].get("email","")

    lessors = extract_party_people(lessor_block)
    if lessors:
        data["lessors"] = lessors
        first = lessors[0]
        if first.get("name"):  data["lessor_name"]  = first["name"]
        if first.get("id"):    data["lessor_id"]    = first["id"]
        if first.get("phone"): data["lessor_phone"] = first["phone"]
        if first.get("email"): data["lessor_email"] = first["email"]

    lessor_reps = extract_party_people(lessor_rep_blk)
    if lessor_reps:
        data["lessor_reps"] = lessor_reps

    brok = extract_brokerage(brokerage_blk)
    if brok: data.update(brok)

    prop = extract_property(property_blk)
    if prop: data["property"] = prop
    tds = extract_title_deeds(titles_blk)
    if tds: data.update(tds)

    units = extract_units(units_blk)
    if units:
        data["units"] = units
        u0 = units[0]
        for k in ["unit_no","unit_type","unit_area"]:
            if k in u0: data[k] = u0[k]

    vat = extract_vat(financial_blk)
    if vat: data["vat_value"] = vat
    data.setdefault("vat_value", "")
    data.update(extract_payments(pays_blk))
    data.setdefault("first_payment", "")

    if debug:
        data["debug"] = {
            "spans": {k:list(v) for k,v in spans.items()},
            "pages_count": len(pages),
            "per_page_lengths": [len(p or "") for p in pages],
        }
    return data, full_text

# ------------------------------
# CLI
# ------------------------------
def main():
    parser = argparse.ArgumentParser(description="Extract fields from Ejar bilingual contracts.")
    parser.add_argument("pdf_path", help="مسار ملف العقد PDF")
    parser.add_argument("--debug", action="store_true", help="حفظ ملفات تصحيح (raw_text/debug)")
    parser.add_argument("--output-dir", default=None, help="مجلد الإخراج (إفتراضي مجلد السكربت).")
    parser.add_argument("--no-shape-ar", action="store_true",
                        help="عدم قلب/تشكيل العربية للعرض في JSON (يُستخدم التطبيع فقط).")
    args = parser.parse_args()

    pdf_path = args.pdf_path
    if not os.path.isfile(pdf_path):
        raise SystemExit(f"[ERROR] الملف غير موجود: {pdf_path}")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = args.output_dir if args.output_dir else script_dir
    os.makedirs(out_dir, exist_ok=True)

    base = os.path.splitext(os.path.basename(pdf_path))[0]
    out_json = os.path.join(out_dir, f"{base}_result.json")

    data, full_text = extract_all(pdf_path, debug=args.debug)

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON saved -> {out_json}", flush=True)

    if args.debug:
        out_txt = os.path.join(out_dir, f"{base}_raw_text.txt")
        with open(out_txt, "w", encoding="utf-8") as f:
            f.write(full_text)
        print(f"[DEBUG] raw text -> {out_txt}", flush=True)

if __name__ == "__main__":
    main()
