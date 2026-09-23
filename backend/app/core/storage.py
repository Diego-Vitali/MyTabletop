import uuid
from pathlib import Path
from typing import Literal

from fastapi import HTTPException, UploadFile, status

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

ImageCategory = Literal["maps", "tokens"]

ALLOWED_IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}
MAX_IMAGE_BYTES = 15 * 1024 * 1024  # 15 MB


async def save_image(file: UploadFile, category: ImageCategory) -> str:
    """Validates and persists an uploaded image under UPLOAD_DIR/<category>/,
    returning its stored path relative to UPLOAD_DIR (e.g. "maps/<uuid>.png").

    Nothing is ever deleted here — maps and tokens are kept indefinitely so
    they can be referenced from map history (see app/models/map_history.py).
    """
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Formato de imagem não suportado (use PNG, JPEG, WEBP ou GIF)",
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Imagem maior que o limite de {MAX_IMAGE_BYTES // (1024 * 1024)}MB",
        )

    category_dir = UPLOAD_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    (category_dir / filename).write_bytes(contents)
    return f"{category}/{filename}"
