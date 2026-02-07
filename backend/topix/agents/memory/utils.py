"""Memory Search agent utilities."""

from topix.agents.datatypes.annotations import RefAnnotation
from topix.datatypes.file.chunk import Chunk
from topix.datatypes.resource import Resource


def resource_to_ref_annotation(res: Resource) -> RefAnnotation:
    """Convert a Resource to a RefAnnotation."""
    ref = RefAnnotation(
        ref_id=res.id,
        ref_type=res.type,
        label=res.label.markdown if res.label else None,
        content=res.content.markdown if res.content else None
    )

    # If the resource is a Chunk, set parent information
    if isinstance(res, Chunk):
        ref.parent_id = res.document_uid
        ref.parent_type = "document"

    return ref
