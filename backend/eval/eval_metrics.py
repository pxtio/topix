"""Evaluation metrics for evaluating the performance of the query rewriting model."""
import mlflow
from mlflow.metrics.genai import EvaluationExample

query_rewrite_examples = [
    EvaluationExample(
        output="What did Dan say about the incident?",
        grading_context={
            "ground_truth": "What did Dan Rather say about the incident where he was attacked?"  # noqa: E501
        },
        score=2,
        justification="The rewritten query miss the key information about the person involved in the incident (Dan Rather). and also the context of the incident is not clear enough. ",  # noqa: E501
    ),
    EvaluationExample(
        output="Who else did Paul Rudd co star with besides Jason Segel?",
        grading_context={
            "ground_truth": "Who else did Paul Rudd co-star with aside from Jason Segel in the movie"  # noqa: E501
        },
        score=5,
        justification="The rewritten query is clear and concise, preserving the original query's intent. ",  # noqa: E501
    ),
]

query_rewrite_metrics = mlflow.metrics.genai.make_genai_metric(
    name="query_rewrite_metrics",
    definition="""The query rewrite metrics for evaluating the performance of the query rewriting model.
    """,  # noqa: E501
    grading_prompt="""You are an expert in evaluating query rewriting. Your task is to evaluate the rewritten query based on the ground truth. "
    "Focus on information preservation, clearness, and relevance to the original query. "
    "Score the rewritten query from 1 to 5, where 1 is the worst and 5 is the best. "
    "Provide a justification for your score, explaining how the rewritten query compares to the ground truth. "
    """,  # noqa: E501
    examples=query_rewrite_examples,
    grading_context_columns=["ground_truth"],
    include_input=False,
)
