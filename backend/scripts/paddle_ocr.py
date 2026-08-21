import sys
import json
import os
import logging

# Mute warnings and logging from PaddleOCR
logging.getLogger("ppocr").setLevel(logging.ERROR)

try:
    from paddleocr import PaddleOCR  # type: ignore
    # Initialize PaddleOCR (uses English by default)
    # We set use_angle_cls=True to handle rotated labels
    ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)  # type: ignore
except ImportError:
    print("__OCR_JSON_OUT__" + json.dumps({"error": "PaddleOCR is not installed. Run 'pip install paddleocr paddlepaddle'"}))
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("__OCR_JSON_OUT__" + json.dumps({"error": "Image file path is required"}))
        sys.exit(1)

    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print("__OCR_JSON_OUT__" + json.dumps({"error": f"File not found: {img_path}"}))
        sys.exit(1)

    try:
        result = ocr.ocr(img_path, cls=True)
        
        # Format results: extract only the text strings
        text_lines = []
        if result and result[0]:
            for line in result[0]:
                text_lines.append(line[1][0]) # line[1][0] contains the text string
        
        print("__OCR_JSON_OUT__" + json.dumps({
            "status": "success",
            "text": " ".join(text_lines),
            "lines": text_lines
        }))
    except Exception as e:
        print("__OCR_JSON_OUT__" + json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
