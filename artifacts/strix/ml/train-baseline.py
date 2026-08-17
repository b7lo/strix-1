#!/usr/bin/env python3
"""Train a deterministic, interpretable multinomial linear baseline.

This script intentionally uses only the Python standard library so training can
run in an isolated review environment. It refuses unverified labels and writes
a portable JSON model consumed by the TypeScript shadow adapter.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

FEATURES = (
    "sampleRateHz",
    "durationMs",
    "peakG",
    "peakJerk",
    "impulseMs",
    "horizontalEnergy",
    "verticalEnergy",
    "rotationPeakDegS",
    "speedBeforeKmh",
    "speedDeltaKmh",
    "dataQualityScore",
    "gapCount",
)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not rows:
        raise ValueError("EMPTY_TRAINING_DATASET")
    if any(row.get("labelVerified") is not True for row in rows):
        raise ValueError("UNVERIFIED_LABEL_IN_TRAINING_DATASET")
    return rows


def finite_number(value: Any) -> float:
    if value is None:
        return 0.0
    number = float(value)
    return number if math.isfinite(number) else 0.0


def softmax(logits: list[float]) -> list[float]:
    maximum = max(logits)
    exponents = [math.exp(min(60.0, value - maximum)) for value in logits]
    total = sum(exponents)
    return [value / total for value in exponents]


def train(rows: list[dict[str, Any]], epochs: int, learning_rate: float, l2: float) -> dict[str, Any]:
    classes = sorted({str(row["label"]) for row in rows})
    if len(classes) < 2:
        raise ValueError("TRAINING_REQUIRES_AT_LEAST_TWO_CLASSES")

    raw = [[finite_number(row.get(feature)) for feature in FEATURES] for row in rows]
    means = [sum(values) / len(values) for values in zip(*raw)]
    scales = []
    for index, mean in enumerate(means):
        variance = sum((values[index] - mean) ** 2 for values in raw) / len(raw)
        scales.append(max(math.sqrt(variance), 1e-9))
    samples = [[(value - means[index]) / scales[index] for index, value in enumerate(values)] for values in raw]
    targets = [classes.index(str(row["label"])) for row in rows]

    weights = [[0.0 for _ in FEATURES] for _ in classes]
    intercepts = [0.0 for _ in classes]
    count = float(len(rows))
    for _ in range(max(1, epochs)):
        weight_gradient = [[0.0 for _ in FEATURES] for _ in classes]
        intercept_gradient = [0.0 for _ in classes]
        for sample, target in zip(samples, targets):
            probabilities = softmax([
                intercepts[class_index] + sum(weight * value for weight, value in zip(weights[class_index], sample))
                for class_index in range(len(classes))
            ])
            for class_index, probability in enumerate(probabilities):
                error = probability - (1.0 if class_index == target else 0.0)
                intercept_gradient[class_index] += error
                for feature_index, value in enumerate(sample):
                    weight_gradient[class_index][feature_index] += error * value
        for class_index in range(len(classes)):
            intercepts[class_index] -= learning_rate * intercept_gradient[class_index] / count
            for feature_index in range(len(FEATURES)):
                gradient = weight_gradient[class_index][feature_index] / count + l2 * weights[class_index][feature_index]
                weights[class_index][feature_index] -= learning_rate * gradient

    digest_source = "\n".join(json.dumps(row, sort_keys=True, separators=(",", ":")) for row in rows)
    digest = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()
    interpretation = {}
    for class_index, label in enumerate(classes):
        ranked = sorted(
            zip(FEATURES, weights[class_index]),
            key=lambda item: abs(item[1]),
            reverse=True,
        )[:5]
        interpretation[label] = [{"feature": feature, "coefficient": coefficient} for feature, coefficient in ranked]

    return {
        "schemaVersion": 1,
        "modelType": "multinomial-linear-softmax",
        "modelVersion": f"impact-linear-{digest[:12]}",
        "featureSchemaVersion": 1,
        "features": list(FEATURES),
        "classes": classes,
        "means": means,
        "scales": scales,
        "coefficients": weights,
        "intercepts": intercepts,
        "training": {
            "rowCount": len(rows),
            "groupCount": len({str(row.get("groupId", "")) for row in rows}),
            "datasetSha256": digest,
            "epochs": max(1, epochs),
            "learningRate": learning_rate,
            "l2": l2,
        },
        "interpretation": interpretation,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", required=True, type=Path, help="Verified training JSONL")
    parser.add_argument("--output", required=True, type=Path, help="Output model JSON")
    parser.add_argument("--epochs", type=int, default=800)
    parser.add_argument("--learning-rate", type=float, default=0.05)
    parser.add_argument("--l2", type=float, default=0.01)
    args = parser.parse_args()

    model = train(read_jsonl(args.train), args.epochs, args.learning_rate, args.l2)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"modelVersion": model["modelVersion"], "rows": model["training"]["rowCount"], "output": str(args.output)}))


if __name__ == "__main__":
    main()
