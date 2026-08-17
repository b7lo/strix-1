#!/usr/bin/env python3
"""Evaluate a Strix impact model on a frozen, verified JSONL test split."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not rows:
        raise ValueError("EMPTY_TEST_DATASET")
    if any(row.get("labelVerified") is not True for row in rows):
        raise ValueError("UNVERIFIED_LABEL_IN_TEST_DATASET")
    return rows


def finite_number(value: Any) -> float:
    if value is None:
        return 0.0
    number = float(value)
    return number if math.isfinite(number) else 0.0


def softmax(logits: list[float]) -> list[float]:
    maximum = max(logits)
    values = [math.exp(min(60.0, value - maximum)) for value in logits]
    total = sum(values)
    return [value / total for value in values]


def predict(model: dict[str, Any], row: dict[str, Any]) -> list[float]:
    features = model["features"]
    sample = [
        (finite_number(row.get(feature)) - float(model["means"][index])) / max(float(model["scales"][index]), 1e-9)
        for index, feature in enumerate(features)
    ]
    logits = [
        float(model["intercepts"][class_index])
        + sum(float(weight) * value for weight, value in zip(model["coefficients"][class_index], sample))
        for class_index in range(len(model["classes"]))
    ]
    return softmax(logits)


def safe_ratio(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def evaluate(model: dict[str, Any], rows: list[dict[str, Any]], bins: int = 10) -> dict[str, Any]:
    classes = [str(value) for value in model["classes"]]
    matrix = {actual: {predicted: 0 for predicted in classes} for actual in classes}
    probabilities: list[list[float]] = []
    targets: list[int] = []

    for row in rows:
        actual = str(row["label"])
        if actual not in matrix:
            raise ValueError(f"UNKNOWN_TEST_CLASS:{actual}")
        probs = predict(model, row)
        predicted = classes[max(range(len(classes)), key=lambda index: probs[index])]
        matrix[actual][predicted] += 1
        probabilities.append(probs)
        targets.append(classes.index(actual))

    per_class = {}
    f1_values = []
    for label in classes:
        true_positive = matrix[label][label]
        false_positive = sum(matrix[actual][label] for actual in classes if actual != label)
        false_negative = sum(matrix[label][predicted] for predicted in classes if predicted != label)
        precision = safe_ratio(true_positive, true_positive + false_positive)
        recall = safe_ratio(true_positive, true_positive + false_negative)
        f1 = safe_ratio(2 * precision * recall, precision + recall)
        per_class[label] = {"precision": precision, "recall": recall, "f1": f1, "support": sum(matrix[label].values())}
        f1_values.append(f1)

    brier = sum(
        sum((probability - (1.0 if index == target else 0.0)) ** 2 for index, probability in enumerate(probs))
        for probs, target in zip(probabilities, targets)
    ) / len(rows)

    calibration_bins = [{"count": 0, "confidence": 0.0, "accuracy": 0.0} for _ in range(max(1, bins))]
    for probs, target in zip(probabilities, targets):
        predicted = max(range(len(classes)), key=lambda index: probs[index])
        confidence = probs[predicted]
        index = min(len(calibration_bins) - 1, int(confidence * len(calibration_bins)))
        bucket = calibration_bins[index]
        bucket["count"] += 1
        bucket["confidence"] += confidence
        bucket["accuracy"] += 1.0 if predicted == target else 0.0

    ece = 0.0
    rendered_bins = []
    for bucket in calibration_bins:
        if bucket["count"] == 0:
            continue
        confidence = bucket["confidence"] / bucket["count"]
        accuracy = bucket["accuracy"] / bucket["count"]
        ece += bucket["count"] / len(rows) * abs(accuracy - confidence)
        rendered_bins.append({"count": bucket["count"], "meanConfidence": confidence, "accuracy": accuracy})

    return {
        "schemaVersion": 1,
        "modelVersion": model["modelVersion"],
        "testRows": len(rows),
        "testGroups": len({str(row.get("groupId", "")) for row in rows}),
        "classes": classes,
        "confusionMatrix": matrix,
        "perClass": per_class,
        "macroF1": sum(f1_values) / len(f1_values),
        "brierScore": brier,
        "ece": ece,
        "calibrationBins": rendered_bins,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--test", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--bins", type=int, default=10)
    args = parser.parse_args()

    model = json.loads(args.model.read_text(encoding="utf-8"))
    report = evaluate(model, read_jsonl(args.test), args.bins)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"modelVersion": report["modelVersion"], "testRows": report["testRows"], "output": str(args.output)}))


if __name__ == "__main__":
    main()
