"""
CardioPulse AI - ECG Feature Validator
Validates numerical ECG features prior to machine learning inference.
Enforces strict 54-feature schema, order preservation, and data integrity.
"""

import math
import numpy as np
import pandas as pd
from typing import Dict, List, Union, Tuple, Any
from app.ml.model_loader import get_feature_names

EXPECTED_FEATURE_COUNT = 54


class FeatureValidationError(ValueError):
    """Raised when ECG feature inputs fail clinical or structural validation."""
    pass


def validate_single_feature_vector(
    features: Union[Dict[str, Any], List[Any], np.ndarray]
) -> Tuple[np.ndarray, Dict[str, float]]:
    """
    Validates a single sample of 54 ECG numerical features.
    
    Returns:
        (X, feature_dict):
            X: np.ndarray of shape (1, 54), dtype float64
            feature_dict: ordered dict of {'feature_1': val, ..., 'feature_54': val}
    
    Raises:
        FeatureValidationError if feature count != 54, values are missing, NaN, Inf, or non-numeric.
    """
    expected_names = get_feature_names()
    ordered_values: List[float] = []
    feature_dict: Dict[str, float] = {}

    if isinstance(features, dict):
        # Case A: Dictionary input
        missing_keys = [name for name in expected_names if name not in features]
        if missing_keys:
            # Check if dict uses 1-based or 0-based indices as keys
            # e.g., '1'..'54' or 0..53
            alt_keys = [str(i) for i in range(1, EXPECTED_FEATURE_COUNT + 1)]
            alt_missing = [k for k in alt_keys if k not in features]
            if not alt_missing:
                # Map '1'..'54' to 'feature_1'..'feature_54'
                features = {f"feature_{i}": features[str(i)] for i in range(1, EXPECTED_FEATURE_COUNT + 1)}
                missing_keys = []

        if missing_keys:
            preview = missing_keys[:5]
            raise FeatureValidationError(
                f"Missing {len(missing_keys)} required ECG feature(s): {preview}"
                f"{'...' if len(missing_keys) > 5 else ''}. Exactly 54 features required."
            )

        for name in expected_names:
            raw_val = features[name]
            clean_val = _clean_float_value(raw_val, name)
            ordered_values.append(clean_val)
            feature_dict[name] = clean_val

    elif isinstance(features, (list, tuple, np.ndarray)):
        # Case B: List or array input
        val_list = list(features)
        if len(val_list) != EXPECTED_FEATURE_COUNT:
            raise FeatureValidationError(
                f"Incorrect feature count: expected {EXPECTED_FEATURE_COUNT} features, "
                f"received {len(val_list)}."
            )

        for idx, (name, raw_val) in enumerate(zip(expected_names, val_list)):
            clean_val = _clean_float_value(raw_val, f"{name} (index {idx})")
            ordered_values.append(clean_val)
            feature_dict[name] = clean_val

    else:
        raise FeatureValidationError(
            f"Unsupported feature input type '{type(features).__name__}'. "
            f"Expected dict with 54 features or list of 54 numerical values."
        )

    # Convert to 2D numpy array (1, 54)
    X = np.array(ordered_values, dtype=np.float64).reshape(1, -1)
    
    # Final assertion check
    if X.shape != (1, EXPECTED_FEATURE_COUNT):
        raise FeatureValidationError(f"Internal tensor shape mismatch: expected (1, 54), got {X.shape}")

    return X, feature_dict


def parse_ecg_csv(
    file_content: Union[str, bytes]
) -> List[Dict[str, Any]]:
    """
    Parses an uploaded CSV file containing ECG features.
    Supports:
      1. Clean CSVs with 54 feature columns (with or without header)
      2. Full dataset CSVs (Col 0: ID, Cols 1..54: features, optional Col 55: label)
    
    Returns a list of parsed row records ready for inspection or batch prediction.
    """
    import io
    if isinstance(file_content, bytes):
        stream = io.BytesIO(file_content)
    else:
        stream = io.StringIO(file_content)

    # Read CSV without assuming header first
    df = pd.read_csv(stream, header=None)
    
    if df.empty:
        raise FeatureValidationError("Uploaded CSV file is empty.")

    # Check if first row is header text (strings like 'feature_1' or 'feature')
    first_row_strings = sum(1 for val in df.iloc[0].values if isinstance(val, str) and not _is_float(val))
    has_header = first_row_strings > (df.shape[1] // 2)

    if has_header:
        stream.seek(0)
        df = pd.read_csv(stream, header=0)

    n_cols = df.shape[1]
    parsed_samples = []

    # Case 1: Exactly 54 columns -> pure features
    if n_cols == 54:
        for row_idx, row in df.iterrows():
            features_dict = {f"feature_{i}": float(row.iloc[i-1]) for i in range(1, 55)}
            parsed_samples.append({
                "sample_index": int(row_idx) + 1,
                "label": None,
                "features": features_dict
            })

    # Case 2: 55 or 56 columns -> Col 0 is ID, Cols 1..54 are features, optional Col 55 is label
    elif n_cols in (55, 56):
        for row_idx, row in df.iterrows():
            features_dict = {f"feature_{i}": float(row.iloc[i]) for i in range(1, 55)}
            ground_truth = str(row.iloc[55]) if n_cols == 56 else None
            parsed_samples.append({
                "sample_index": int(row.iloc[0]) if _is_int(row.iloc[0]) else int(row_idx) + 1,
                "label": ground_truth,
                "features": features_dict
            })
    else:
        raise FeatureValidationError(
            f"CSV column count mismatch. Expected 54 columns (features) or 56 columns (ID + 54 features + label). "
            f"Received {n_cols} columns."
        )

    return parsed_samples


def _clean_float_value(val: Any, field_name: str) -> float:
    """Helper to convert and validate a single scalar float."""
    if val is None or val == "":
        raise FeatureValidationError(f"Missing value for field '{field_name}'. Value cannot be null or empty.")

    try:
        f_val = float(val)
    except (ValueError, TypeError):
        raise FeatureValidationError(
            f"Invalid non-numerical value '{val}' for field '{field_name}'. Must be a valid real number."
        )

    if math.isnan(f_val):
        raise FeatureValidationError(f"Invalid NaN (Not a Number) value in field '{field_name}'.")

    if math.isinf(f_val):
        raise FeatureValidationError(f"Invalid Infinite value in field '{field_name}'.")

    return f_val


def _is_float(val: Any) -> bool:
    try:
        float(val)
        return True
    except (ValueError, TypeError):
        return False


def _is_int(val: Any) -> bool:
    try:
        int(val)
        return True
    except (ValueError, TypeError):
        return False
