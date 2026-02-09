"""Unit tests for graph layout utilities."""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from igraph import Graph

from topix.utils.graph.layout import layout_directed


@dataclass
class _DummyLayout:
    """Simple layout container to mimic igraph's layout object."""

    coords: list[tuple[float, float]]


def _install_layout_stub(monkeypatch, coords, called=None):
    """Patch igraph's layout_sugiyama to return deterministic coordinates."""

    def _fake_layout(self, hgap, vgap):  # noqa: ANN001
        if called is not None:
            called["hgap"] = hgap
            called["vgap"] = vgap
        return _DummyLayout(coords=coords)

    monkeypatch.setattr(Graph, "layout_sugiyama", _fake_layout, raising=True)


@pytest.mark.parametrize(
    ("direction", "expected"),
    [
        ("TB", {"A": (0.0, 1.0), "B": (2.0, 3.0)}),
        ("BT", {"A": (0.0, -1.0), "B": (2.0, -3.0)}),
        ("LR", {"A": (1.0, 0.0), "B": (3.0, 2.0)}),
        ("RL", {"A": (-1.0, 0.0), "B": (-3.0, 2.0)}),
    ],
)
def test_layout_directed_transforms_coordinates(
    monkeypatch, direction, expected
):
    """Transformations match Dagre-style direction rules."""
    coords = [(0.0, 1.0), (2.0, 3.0)]
    _install_layout_stub(monkeypatch, coords)

    result = layout_directed(
        nodes=["A", "B"],
        edges=[["A", "B"]],
        direction=direction,
    )

    assert result == expected


def test_layout_directed_passes_gap_parameters(monkeypatch):
    """Horizontal/vertical gap arguments are forwarded to igraph."""
    called: dict[str, float] = {}
    _install_layout_stub(monkeypatch, coords=[(0.0, 0.0)], called=called)

    layout_directed(
        nodes=["A"],
        edges=[],
        hgap=2.5,
        vgap=3.5,
    )

    assert called == {"hgap": 2.5, "vgap": 3.5}


def test_layout_directed_rejects_unknown_nodes():
    """Edges referencing missing nodes should raise a ValueError."""
    with pytest.raises(ValueError, match="references unknown node"):
        layout_directed(nodes=["A"], edges=[["A", "B"]])


def test_layout_directed_rejects_invalid_direction(monkeypatch):
    """Invalid direction values should raise a ValueError."""
    _install_layout_stub(monkeypatch, coords=[(0.0, 0.0)])

    with pytest.raises(ValueError, match="direction must be one of"):
        layout_directed(nodes=["A"], edges=[], direction="BAD")
