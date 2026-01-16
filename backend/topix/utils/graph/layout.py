"""IGraph-based graph layout utilities."""

from igraph import Graph


def layout_directed(
    nodes: list[str],
    edges: list[list[str]],
    direction: str = "TB",
    hgap: float = 1.0,
    vgap: float = 1.0,
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
    if direction == "TB":
        pass
    elif direction == "BT":
        coords = [(x, -y) for x, y in coords]
    elif direction == "LR":
        coords = [(y, x) for x, y in coords]
    elif direction == "RL":
        coords = [(-y, x) for x, y in coords]
    else:
        raise ValueError("direction must be one of: TB, BT, LR, RL")

    # Map node id -> position
    return {
        nodes[i]: (coords[i][0], coords[i][1])
        for i in range(len(nodes))
    }
