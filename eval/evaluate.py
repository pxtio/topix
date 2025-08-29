"""Evaluate an agent on a dataset."""

import asyncio

from typing import Any, Awaitable, Callable

import mlflow
import pandas as pd

from datasets import load_dataset

from topix.topix.agents.base import BaseAgent


class Evaluator:
    """Evaluate an agent on a dataset."""

    @classmethod
    async def evaluate(
        cls,
        agent: BaseAgent,
        prompt_uri: str,
        ds_name: str,
        run_name: str,
        run_func: Callable[[Any, dict], Awaitable[Any]],
        metrics: list,
        mlflow_tracking_uri: str,
    ):
        """Evaluate the agent on a dataset."""
        mlflow.set_tracking_uri(mlflow_tracking_uri)
        mlflow.set_experiment(agent.name)
        mlflow.openai.autolog()

        ds = load_dataset(ds_name, split="train")
        tasks = [asyncio.create_task(run_func(**data["inputs"])) for data in ds]
        predictions = await asyncio.gather(*tasks)

        ds = ds.add_column("predictions", predictions)
        mlflow_ds = mlflow.data.from_pandas(
            df=pd.DataFrame(ds),
            name=ds_name,
            targets="ground_truth",
            predictions="predictions",
        )

        params = agent.model_settings.to_json_dict()
        params = {k: v for k, v in params.items() if v is not None}
        params["model_name"] = agent.model
        params["prompt_uri"] = prompt_uri

        with mlflow.start_run(run_name=run_name):
            mlflow.log_params(params=params)
            mlflow.log_input(mlflow_ds)
            mlflow.evaluate(
                data=mlflow_ds,
                extra_metrics=metrics,
            )
