# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from extract_ejar import extract_all, walk_and_fix_arabic
import tempfile, os, traceback

app = Flask(__name__)

@app.route("/extract", methods=["POST"])
def extract_contract():
    try:
        # 📥 استلام الملف
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "لم يتم رفع أي ملف"}), 400

        # 📂 حفظ مؤقت
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            file.save(tmp)
            tmp_path = tmp.name

        # 🧠 تحليل العقد
        data, _ = extract_all(tmp_path)
        shaped = walk_and_fix_arabic(data, shape=False)

        # 🧹 حذف الملف بعد التحليل
        try:
            os.remove(tmp_path)
        except:
            pass

        # ✅ إرسال النتيجة
        return jsonify(shaped)

    except Exception as e:
        print("🔥 Error while extracting:", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # 🚀 تشغيل الخادم
    app.run(host="0.0.0.0", port=8081)
