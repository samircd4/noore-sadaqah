"""
Uploaded images (ADMIN.md "Funds, Programs …"): JPG, PNG or WebP up to 5 MB, shrunk to at most 2000 px wide when
saved, and the {url, alt, width, height} shape the API returns (API.md "Images").
"""

from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.validators import FileExtensionValidator
from django.db.models import ImageField
from PIL import Image, ImageOps

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_WIDTH = 2000
ORIENTATION = 0x0112  # the EXIF tag
FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


def max_5_mb(file):
    if file.size > MAX_UPLOAD_BYTES:
        raise ValidationError("The image is larger than 5 MB.")


image_upload_validators = [FileExtensionValidator(["jpg", "jpeg", "png", "webp"]), max_5_mb]


def shrink_new_images(sender, instance, **kwargs):
    """pre_save for every model: an image uploaded just now that is wider than 2000 px is resized before it is
    stored. Images already in storage are left alone."""
    for field in instance._meta.fields:
        if not isinstance(field, ImageField):
            continue
        file = getattr(instance, field.attname)
        if not file or getattr(file, "_committed", True):
            continue
        try:
            file.seek(0)
            image = Image.open(file)
            image.load()
        except Exception:  # noqa: S112 - not readable: the form's own image check reports it
            continue
        image_format = image.format
        icc_profile = image.info.get("icc_profile")
        # Phone photos store "turn me" in EXIF instead of turning the pixels. Apply it, so the saved copy (which has
        # no EXIF) and its width/height are the right way up.
        rotated = image.getexif().get(ORIENTATION, 1) != 1
        if image_format not in FORMATS or (image.width <= MAX_WIDTH and not rotated):
            file.seek(0)
            continue
        image = ImageOps.exif_transpose(image)
        image.thumbnail((MAX_WIDTH, MAX_WIDTH * 10))  # keeps the aspect ratio; only the width matters here
        buffer = BytesIO()
        extra = {"icc_profile": icc_profile} if icc_profile else {}
        image.save(buffer, format=image_format, quality=85, **extra)
        file.save(file.name, ContentFile(buffer.getvalue()), save=False)
        field.update_dimension_fields(instance, force=True)  # width/height of the smaller copy


def image_json(file, alt_bn, alt_en, width, height, language):
    """{url, alt, width, height} for the API, or None when no image is uploaded."""
    if not file:
        return None
    alt = alt_en if language == "en" and alt_en else alt_bn
    return {"url": file.url, "alt": alt or "", "width": width or 0, "height": height or 0}
