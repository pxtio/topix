"""Image generation tool using OpenRouter API."""
import logging
import os

import httpx

from agents import RunContextWrapper

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.outputs import ImageGenerationOutput
from topix.agents.datatypes.tools import AgentToolName, tool_descriptions
from topix.agents.tool_handler import ToolHandler
from topix.utils.common import gen_uid
from topix.utils.file import save_base64_image_url

logger = logging.getLogger(__name__)

API_URL = "https://openrouter.ai/api/v1/chat/completions"
API_KEY = os.getenv("OPENROUTER_API_KEY")

aspect_ratio = "1:1"  # 1:1 => 1024 x 1024, 4:3 => 1024 x 768, 16:9 => 1024 x 576


async def generate_image(
    wrapper: RunContextWrapper[Context],
    prompt: str
) -> ImageGenerationOutput:
    """Generate an image based on the given prompt.

    Args:
        wrapper (RunContextWrapper[Context]): The context wrapper for the run.
        prompt (str): The prompt describing the desired image.

    Returns:
        ImageGenerationOutput: The output object containing generated image URLs.

    """
    if not API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "google/gemini-2.5-flash-image",
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
        "modalities": ["image", "text"],
        "image_config": {
            "aspect_ratio": aspect_ratio,  # 1:1 => 1024 x 1024
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(API_URL, headers=headers, json=payload)
        resp.raise_for_status()
        result = resp.json()

    output = ImageGenerationOutput()
    if not result.get("choices"):
        logger.warning("No choices in response:", result)
        return output

    message = result["choices"][0]["message"]
    images = message.get("images") or []
    if not images:
        logger.warning("No images in response:", result)
        return output

    for img in images:
        image_url = img["image_url"]["url"]  # data:image/png;base64,...
        fn = f"{gen_uid()}.png"
        saved_path = save_base64_image_url(
            filename=fn,
            url=image_url,
            cat="images",
        )
        output.image_urls.append(saved_path)

    return output


generate_image_tool = ToolHandler.convert_function_to_tool(
    func=generate_image,
    tool_name=AgentToolName.IMAGE_GENERATION,
    tool_description=tool_descriptions.get(AgentToolName.IMAGE_GENERATION, ""),
)
