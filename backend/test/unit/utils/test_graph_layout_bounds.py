"""Unit tests for graph layout bounds and displacement utilities."""

from __future__ import annotations

from topix.datatypes.file.document import Document
from topix.datatypes.note.note import Note
from topix.datatypes.property import PositionProperty, SizeProperty
from topix.utils.graph.layout import displace_nodes, get_bounds


def _note_with_geom(x: float, y: float, w: float, h: float) -> Note:
    note = Note()
    note.properties.node_position.position = PositionProperty.Position(x=x, y=y)
    note.properties.node_size.size = SizeProperty.Size(width=w, height=h)
    return note


def _doc_with_geom(x: float, y: float, w: float, h: float) -> Document:
    doc = Document()
    doc.properties.node_position.position = PositionProperty.Position(x=x, y=y)
    doc.properties.node_size.size = SizeProperty.Size(width=w, height=h)
    return doc


def test_get_bounds_empty_nodes():
    """Empty input returns zeroed bounds."""
    assert get_bounds([]) == {
        "minX": 0.0,
        "minY": 0.0,
        "maxX": 0.0,
        "maxY": 0.0,
        "centerX": 0.0,
        "centerY": 0.0,
    }


def test_get_bounds_mixed_nodes():
    """Bounds use node positions and sizes across notes/documents."""
    note = _note_with_geom(x=10, y=20, w=30, h=40)
    doc = _doc_with_geom(x=-5, y=5, w=10, h=15)

    bounds = get_bounds([note, doc])

    assert bounds == {
        "minX": -5.0,
        "minY": 5.0,
        "maxX": 40.0,
        "maxY": 60.0,
        "centerX": 17.5,
        "centerY": 32.5,
    }


def test_displace_nodes_offsets_and_copies():
    """Displacement shifts group2 and keeps group1 unchanged."""
    anchor = _note_with_geom(x=0, y=0, w=100, h=50)
    mover = _doc_with_geom(x=10, y=100, w=20, h=30)

    displaced = displace_nodes([anchor], [mover], gap=10)

    assert displaced[0].properties.node_position.position is not None
    assert displaced[0].properties.node_position.position.x == 40.0
    assert displaced[0].properties.node_position.position.y == -40.0

    # Original remains unchanged.
    assert mover.properties.node_position.position is not None
    assert mover.properties.node_position.position.x == 10
    assert mover.properties.node_position.position.y == 100


def test_displace_nodes_handles_missing_positions():
    """Displacement populates missing positions using defaults."""
    anchor = _note_with_geom(x=0, y=0, w=10, h=10)
    mover = _doc_with_geom(x=0, y=0, w=10, h=10)
    mover.properties.node_position.position = None

    displaced = displace_nodes([anchor], [mover], gap=0)

    assert displaced[0].properties.node_position.position is not None
    assert displaced[0].properties.node_position.position.x == 0.0
    assert displaced[0].properties.node_position.position.y == -10.0
