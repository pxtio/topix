"""Utility functions for converting mind map data types to graph representations."""

from topix.agents.mindmap.datatypes import SimpleNode
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Content, Note
from topix.datatypes.note.property import IconProperty, PropertyTypeEnum


def convert_root_to_graph(root: SimpleNode) -> tuple[list[Note], list[Link]]:
    """Convert a SimpleNode to a graph representation."""
    nodes = []
    links = []

    def traverse(node: SimpleNode, parent_id: str | None = None):
        node_id = node.label  # Use label as a unique identifier
        nodes.append(Note(
            properties={
                "emoji": IconProperty(
                    type=PropertyTypeEnum(
                        value=node.emoji
                    )
                )
            },
            label=node.label,
            content=Content(
                markdown=node.note
            )
        ))
        if parent_id:
            links.append(Link(
                source=parent_id,
                target=node_id
            ))
        for child in node.children:
            traverse(child, node_id)

    traverse(root)

    return nodes, links
