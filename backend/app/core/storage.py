import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

ALLOWED_IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}
MAX_IMAGE_BYTES = 15 * 1024 * 1024  # 15 MB


async def save_scene_image(file: UploadFile) -> str:
    """Validates and persists an uploaded scene image, returning its stored filename."""
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

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    (UPLOAD_DIR / filename).write_bytes(contents)
    return filename


def delete_scene_image(filename: str) -> None:
    path = UPLOAD_DIR / filename
    path.unlink(missing_ok=True)
