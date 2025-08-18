"""Utility functions for converting mind map data types to graph representations."""

from topix.agents.mindmap.datatypes import SimpleNode
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Content, Note
from topix.datatypes.property import IconProperty, Prop


def convert_root_to_graph(root: SimpleNode) -> tuple[list[Note], list[Link]]:
    """Convert a SimpleNode to a graph representation."""
    nodes = []
    links = []

    def traverse(node: SimpleNode, parent_id: str | None = None):
        """Recursively traverse the SimpleNode and build notes and links."""
        note = Note(
            properties={
                "emoji": Prop(
                    prop=IconProperty(
                        icon=IconProperty.Emoji(
                            emoji=node.emoji
                        )
                    )
                )
            },
            label=node.label,
            content=Content(
                markdown=node.note
            )
        )
        nodes.append(note)
        if parent_id:
            links.append(Link(
                source=parent_id,
                target=note.id
            ))
        for child in node.children:
            traverse(child, note.id)

    traverse(root)

    return nodes, links
