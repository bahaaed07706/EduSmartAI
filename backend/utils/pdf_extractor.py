# utils/pdf_extractor.py - استخراج النص من ملفات PDF
"""
PDF text extraction utility for course materials
Uses PyPDF2 , falls back to basic extraction if unavailable
"""
import os
from pathlib import Path

def extract_text_from_pdf(file_path: str) -> str:
    """استخراج النص من ملف PDF"""
    try:
        from PyPDF2 import PdfReader
        
        reader = PdfReader(file_path)
        text_parts = []
        
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        
        extracted_text = "\n\n".join(text_parts)
        return extracted_text.strip() if extracted_text else ""
    
    except ImportError:
        print("⚠️ PyPDF2 not installed. Run: pip install PyPDF2")
        return "[PyPDF2 library not installed - cannot extract text]"
    except Exception as e:
        print(f"❌ PDF extraction error: {e}")
        return f"[Error extracting PDF: {str(e)}]"


def extract_text_from_file(file_path: str) -> str:
    """استخراج النص من أي ملف (PDF, TXT, etc.)"""
    ext = Path(file_path).suffix.lower()
    
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in [".txt", ".md"]:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            return f"[Error reading file: {str(e)}]"
    else:
        return f"[Unsupported file type: {ext}]"


def save_uploaded_file(upload_dir: str, filename: str, content: bytes) -> str:
    """حفظ الملف المرفوع وإرجاع المسار"""
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    return file_path
