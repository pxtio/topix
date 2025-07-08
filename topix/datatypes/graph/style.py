"""Class representing the style of a node in a graph."""

from typing import Literal

from pydantic import BaseModel


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

    type: str = "rectangle"
    angle: float
    stroke_color: str
    background_color: str
    fill_style: str
    stroke_width: int
    stroke_style: Literal["solid", "dashed"] = "solid"
    roughness: float = 1.0
    opacity: int = 100
    group_ids: list[str] = []
    font_family: str
    text_align: Literal["left", "center", "right"] = "left"
    color: str | None = None
