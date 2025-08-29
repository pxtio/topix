"""Mime Type Enum for Media Types."""

from src.datatypes.enum import CustomEnum


class MimeTypeEnum(str, CustomEnum):
    """Enum for the different types of media."""

    PDF = 'application/pdf'
    VIDEO = 'video/mp4'
    AUDIO = 'audio/mp3'
    PPT = 'application/vnd.ms-powerpoint'
    PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    HTML = 'text/html'
    MARKDOWN = 'text/markdown'
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    XLS = 'application/vnd.ms-excel'
    CSV = 'text/csv'
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    PNG = 'image/png'
    JSON = 'application/json'

    def is_media(self) -> bool:
        """Check if the mime type is a media type."""
        return self in [MimeTypeEnum.VIDEO, MimeTypeEnum.AUDIO]
