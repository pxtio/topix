"""IGraph-based graph layout utilities."""

from enum import StrEnum
from typing import Annotated

from igraph import Graph
from pydantic import Field

from topix.datatypes.file.document import Document
from topix.datatypes.note.note import Note
from topix.datatypes.property import PositionProperty, SizeProperty

type GraphNode = Annotated[
    Note | Document,
    Field(discriminator="type")
]


def _node_position(node: GraphNode) -> PositionProperty.Position:
    """Return a safe node position, falling back to (0, 0)."""
    pos = node.properties.node_position.position
    if pos is None:
        return PositionProperty.Position(x=0, y=0)
    return pos


def _node_size(node: GraphNode) -> SizeProperty.Size:
    """Return a safe node size, falling back to (0, 0)."""
    size = node.properties.node_size.size
    if size is None:
        return SizeProperty.Size(width=0, height=0)
    return size


def get_bounds(nodes: list[GraphNode]) -> dict[str, float]:
    """Calculate bounding box and centroid of a node set.

    Args:
        nodes (list[GraphNode]): Nodes to calculate bounds for.

    Returns:
        dict[str, float]: minX, minY, maxX, maxY, centerX, centerY.

    """
    if not nodes:
        return {
            "minX": 0.0,
            "minY": 0.0,
            "maxX": 0.0,
            "maxY": 0.0,
            "centerX": 0.0,
            "centerY": 0.0,
        }

    min_x = min(_node_position(n).x for n in nodes)
    min_y = min(_node_position(n).y for n in nodes)
    max_x = max(
        _node_position(n).x + _node_size(n).width for n in nodes
    )
    max_y = max(
        _node_position(n).y + _node_size(n).height for n in nodes
    )

    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2

    return {
        "minX": min_x,
        "minY": min_y,
        "maxX": max_x,
        "maxY": max_y,
        "centerX": center_x,
        "centerY": center_y,
    }


def displace_nodes(
    group1: list[GraphNode],
    group2: list[GraphNode],
    gap: float = 100.0,
) -> list[GraphNode]:
    """Displace a group of nodes below another group.

    Args:
        group1 (list[GraphNode]): Anchor group (stays in place).
        group2 (list[GraphNode]): Nodes to displace.
        gap (float): Vertical gap between groups.

    Returns:
        list[GraphNode]: New list of displaced nodes.

    """
    bounds1 = get_bounds(group1)
    bounds2 = get_bounds(group2)

    delta_y = bounds1["minY"] - bounds2["maxY"] - gap
    delta_x = bounds1["centerX"] - bounds2["centerX"]

    displaced = []
    for node in group2:
        updated = node.model_copy(deep=True)
        pos = _node_position(updated)
        updated_x = pos.x + delta_x
        updated_y = pos.y + delta_y

        if updated.properties.node_position.position is None:
            updated.properties.node_position.position = PositionProperty.Position(
                x=updated_x,
                y=updated_y,
            )
        else:
            updated.properties.node_position.position.x = updated_x
            updated.properties.node_position.position.y = updated_y

        displaced.append(updated)

    return displaced


class LayoutDirection(StrEnum):
    """Layout direction enum."""

    TOP_BOTTOM = "TB"
    BOTTOM_TOP = "BT"
    LEFT_RIGHT = "LR"
    RIGHT_LEFT = "RL"


def layout_directed(
    nodes: list[str],
    edges: list[list[str]],
    direction: LayoutDirection = LayoutDirection.LEFT_RIGHT,
    hgap: float = 75,
    vgap: float = 150,
) -> dict[str, tuple[float, float]]:
    """Compute a Dagre-like hierarchical layout using igraph.

    Args:
        nodes (list[str]): List of node identifiers.
        edges (list[list[str]]): List of edges as (source, target) pairs.
        direction (str): Direction of the layout. One of "TB", "BT", "LR", "RL".
        hgap (float): Horizontal gap between nodes.
        vgap (float): Vertical gap between nodes.

    Returns:
        dict[str, tuple[float, float]]: Mapping from node id to (x, y) position.

    """
    # Build index lookup
    index = {node: i for i, node in enumerate(nodes)}

    # Convert edges to index pairs
    edge_indices = []
    for src, dst in edges:
        if src not in index or dst not in index:
            raise ValueError(f"Edge ({src} -> {dst}) references unknown node")
        edge_indices.append((index[src], index[dst]))

    # Build igraph graph
    g = Graph(n=len(nodes), edges=edge_indices, directed=True)
    g.vs["name"] = nodes

    # Sugiyama (hierarchical) layout
    layout = g.layout_sugiyama(hgap=hgap, vgap=vgap)
    coords = layout.coords  # list[(x, y)]

    # Apply Dagre-style direction transform
    if direction == LayoutDirection.TOP_BOTTOM:
        pass
    elif direction == LayoutDirection.BOTTOM_TOP:
        coords = [(x, -y) for x, y in coords]
    elif direction == LayoutDirection.LEFT_RIGHT:
        coords = [(y, x) for x, y in coords]
    elif direction == LayoutDirection.RIGHT_LEFT:
        coords = [(-y, x) for x, y in coords]
    else:
        raise ValueError("direction must be one of: TB, BT, LR, RL")

    # Map node id -> position
    return {
        nodes[i]: (coords[i][0], coords[i][1])
        for i in range(len(nodes))
    }
