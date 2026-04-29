import json
import os
import sys

os.environ.setdefault("FLAGS_use_mkldnn", "0")
os.environ.setdefault("FLAGS_enable_pir_api", "0")


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"text": "", "lines": []}))
        return 0

    image_path = sys.argv[1]

    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        print(f"PaddleOCR is not installed: {exc}", file=sys.stderr)
        return 2

    ocr = PaddleOCR(
        lang="en",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="en_PP-OCRv5_mobile_rec",
    )
    result = ocr.ocr(image_path)
    lines = []

    for page in result or []:
        if isinstance(page, dict) and "rec_texts" in page:
            texts = page.get("rec_texts") or []
            scores = page.get("rec_scores") or []
            for index, text_value in enumerate(texts):
                text = str(text_value).strip()
                confidence = float(scores[index]) if index < len(scores) else 0.0
                if text:
                    lines.append({"text": text, "confidence": confidence})
            continue

        for item in page or []:
            if not item or len(item) < 2:
                continue
            text_info = item[1]
            if not text_info:
                continue
            text = str(text_info[0]).strip()
            confidence = float(text_info[1]) if len(text_info) > 1 else 0.0
            if text:
                lines.append({"text": text, "confidence": confidence})

    print(json.dumps({
        "text": "\n".join(line["text"] for line in lines),
        "lines": lines,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
