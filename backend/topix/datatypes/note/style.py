"""Classes representing the style of a node in a graph."""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel


class NodeType(StrEnum):
    """Enumeration for node types."""

    RECTANGLE = "rectangle"
    ELLIPSE = "ellipse"
    DIAMOND = "diamond"
    SHEET = "sheet"
    TEXT = "text"
    IMAGE = "image"
    ICON = "icon"


class StrokeStyle(StrEnum):
    """Enumeration for stroke styles."""

    SOLID = "solid"
    DASHED = "dashed"
    DOTTED = "dotted"


class FillStyle(StrEnum):
    """Enumeration for fill styles."""

    SOLID = "solid"
    HACHURE = "hachure"
    CROSSHATCH = "cross-hatch"
    ZIGZAG = "zigzag"
    DOTS = "dots"


class TextAlign(StrEnum):
    """Enumeration for text alignment."""

    LEFT = "left"
    CENTER = "center"
    RIGHT = "right"


class FontSize(StrEnum):
    """Enumeration for font sizes."""

    S = "S"
    M = "M"
    L = "L"
    XL = "XL"


class FontFamily(StrEnum):
    """Enumeration for font families."""

    HANDWRITING = "handwriting"
    SANS_SERIF = "sans-serif"
    SERIF = "serif"
    MONOSPACE = "monospace"


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
        roundness (float): Roundness of the node's corners, between 0 and 2.
        opacity (int): Opacity of the node, default is 100%.
        group_ids (list[str]): List of group IDs this node belongs to.
        font_family (str): Font family used for text in the node.
        text_align (str): Text alignment within the node,
            can be "left", "center", or "right".
        color (str | None): Text color, if applicable.

    """

    type: NodeType = NodeType.RECTANGLE
    angle: float = 0.0
    stroke_color: str = "transparent"
    stroke_width: float = 0.75
    stroke_style: StrokeStyle = StrokeStyle.SOLID
    background_color: str = "#ffedd5"
    fill_style: FillStyle = FillStyle.SOLID
    roughness: float = 1.0
    roundness: float = 0.0
    opacity: float = 100
    group_ids: list[str] = []
    font_size: FontSize = FontSize.M
    font_family: FontFamily = FontFamily.HANDWRITING
    text_align: TextAlign = TextAlign.LEFT
    text_color: str = "#000000"
    text_style: str | None = None


class Arrowhead(StrEnum):
    """Enumeration for arrowhead types."""

    ARROW = "arrow"
    BARB = "barb"
    ARROW_FILLED = "arrow-filled"
    NONE = "none"


class PathStyle(StrEnum):
    """Enumeration for path styles."""

    BEZIER = "bezier"
    STRAIGHT = "straight"
    POLYLINE = "polyline"


class LinkStyle(Style):
    """Style for links in a graph."""

    type: Literal["arrow"] = "arrow"

    source_arrowhead: Arrowhead = Arrowhead.NONE
    target_arrowhead: Arrowhead = Arrowhead.ARROW

    path_style: PathStyle = PathStyle.BEZIER
