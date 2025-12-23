"""Memory Search agent utilities."""

from topix.agents.datatypes.annotations import RefAnnotation
from topix.datatypes.resource import Resource


def resource_to_ref_annotation(res: Resource) -> RefAnnotation:
    """Convert a Resource to a RefAnnotation."""
    return RefAnnotation(
        ref_id=res.id,
        ref_type=res.type,
        label=res.get_property("label").get("markdown") if res.get_property("label") else None,
        content=res.get_property("content").get("markdown") if res.get_property("content") else None,
    )
