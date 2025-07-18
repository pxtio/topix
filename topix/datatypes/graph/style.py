"""Classes representing the style of a node in a graph."""

from pydantic import BaseModel

from topix.datatypes.enum import CustomEnum


class NodeType(str, CustomEnum):
    """Enumeration for node types."""

    RECTANGLE = "rectangle"


class StrokeStyle(str, CustomEnum):
    """Enumeration for stroke styles."""

    SOLID = "solid"
    DASHED = "dashed"


class FillStyle(str, CustomEnum):
    """Enumeration for fill styles."""

    SOLID = "solid"


class TextAlign(str, CustomEnum):
    """Enumeration for text alignment."""

    LEFT = "left"
    CENTER = "center"
    RIGHT = "right"


class Style(BaseModel):
    """Style of a node in a graph.

    Attributes:
        type (str): Type of the node, default is "rectangle".
        angle (float): Rotation angle of the node in degrees.
        stroke_color (str): Color of the node's border.
        background_color (str): Background color of the node.
        fill_style (str): Fill style of the node, e.g., "solid"
        stroke_width (int): Width of the node's border.
        stroke_style (str): Style of the node's border, can be "solid" or "dashed".
        roughness (float): Roughness of the node, between 0 and 2.
        opacity (int): Opacity of the node, default is 100%.
        group_ids (list[str]): List of group IDs this node belongs to.
        font_family (str): Font family used for text in the node.
        text_align (str): Text alignment within the node,
            can be "left", "center", or "right".
        color (str | None): Text color, if applicable.

    """

    type: NodeType = NodeType.RECTANGLE
    angle: float = 0.0
    stroke_color: str | None = None
    stroke_width: int = 1
    stroke_style: StrokeStyle = StrokeStyle.SOLID
    background_color: str | None = None
    fill_style: FillStyle = FillStyle.SOLID
    roughness: float = 1.0
    opacity: int = 100
    group_ids: list[str] = []
    font_family: str | None = None
    text_align: TextAlign = TextAlign.LEFT
    color: str | None = None
