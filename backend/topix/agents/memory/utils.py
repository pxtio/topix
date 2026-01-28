"""Memory Search agent utilities."""

from topix.agents.datatypes.annotations import RefAnnotation
from topix.datatypes.resource import Resource


def resource_to_ref_annotation(res: Resource) -> RefAnnotation:
    """Convert a Resource to a RefAnnotation."""
    return RefAnnotation(
        ref_id=res.id,
        ref_type=res.type,
        label=res.label.markdown if res.label else None,
        content=res.content.markdown if res.content else None,
    )
