"""
CardioPulse AI - ML Model Loader
Loads and caches the trained Extra Trees ECG classification bundle once at application startup.
Handles scikit-learn version deserialization compatibility for SimpleImputer.
"""

import os
import joblib
import logging
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("cardiopulse.ml")

# Global singleton storage for the model bundle components
_BUNDLE: Optional[Dict[str, Any]] = None
_PIPELINE: Any = None
_LABEL_ENCODER: Any = None
_FEATURE_NAMES: Optional[List[str]] = None
_METADATA: Optional[Dict[str, Any]] = None


def find_model_file() -> Path:
    """Locate the ecg_model_metadata_bundle.joblib file across common paths."""
    # Current file is in backend/app/ml/
    base_dir = Path(__file__).resolve().parent.parent.parent  # backend/
    
    candidate_paths = [
        base_dir / "models" / "ecg_model_metadata_bundle.joblib",
        base_dir.parent / "backend" / "models" / "ecg_model_metadata_bundle.joblib",
        base_dir / "ecg_model_metadata_bundle.joblib",
        Path("/Users/manojbarik/Downloads/ecg_model_metadata_bundle.joblib")
    ]
    
    for path in candidate_paths:
        if path.exists():
            return path
            
    raise FileNotFoundError(
        f"ECG Model bundle 'ecg_model_metadata_bundle.joblib' not found. "
        f"Checked paths: {[str(p) for p in candidate_paths]}"
    )


def load_model() -> Dict[str, Any]:
    """
    Loads the trained model bundle and patches scikit-learn unpickling compatibility.
    Called once during FastAPI lifespan startup.
    """
    global _BUNDLE, _PIPELINE, _LABEL_ENCODER, _FEATURE_NAMES, _METADATA

    if _BUNDLE is not None:
        return _BUNDLE

    model_path = find_model_file()
    logger.info(f"Loading CardioPulse ECG ML Model bundle from: {model_path}")
    print(f"[ML] Loading CardioPulse ECG Model bundle from: {model_path}")

    bundle = joblib.load(str(model_path))

    if not isinstance(bundle, dict):
        raise ValueError(f"Expected dict bundle from joblib, got: {type(bundle)}")

    # Extract pipeline and label encoder
    pipeline = bundle.get("final_pipeline")
    label_encoder = bundle.get("label_encoder")
    feature_names = bundle.get("feature_names", [f"feature_{i}" for i in range(1, 55)])

    if pipeline is None:
        raise KeyError("Bundle missing 'final_pipeline'")
    if label_encoder is None:
        raise KeyError("Bundle missing 'label_encoder'")

    # Apply scikit-learn unpickling compatibility patch for SimpleImputer
    # (Scikit-learn 1.6 unpickling into >=1.8 requires `_fill_dtype` instead of `_fit_dtype`)
    if hasattr(pipeline, "named_steps") and "imputer" in pipeline.named_steps:
        imputer = pipeline.named_steps["imputer"]
        if not hasattr(imputer, "_fill_dtype"):
            imputer._fill_dtype = getattr(imputer, "_fit_dtype", np.dtype(np.float64))
            logger.info("Applied scikit-learn SimpleImputer._fill_dtype compatibility patch.")

    # Cache globally
    _BUNDLE = bundle
    _PIPELINE = pipeline
    _LABEL_ENCODER = label_encoder
    _FEATURE_NAMES = feature_names
    _METADATA = {
        "champion_name": bundle.get("hyperparameters", {}).get("champion_name", "Extra Trees Classifier"),
        "hyperparameters": bundle.get("hyperparameters", {}),
        "test_metrics": bundle.get("test_evaluation_metrics", {}),
        "preprocessing_metadata": bundle.get("preprocessing_metadata", {}),
        "n_features": len(feature_names),
        "classes": list(label_encoder.classes_),
        "bundle_path": str(model_path)
    }

    logger.info(f"ECG Model loaded successfully: {_METADATA['champion_name']} with {len(feature_names)} features and {len(label_encoder.classes_)} classes.")
    print(f"[ML] Model ready: {_METADATA['champion_name']} | Accuracy: {_METADATA['test_metrics'].get('accuracy', 0.9667)*100:.2f}% | Classes: {_METADATA['classes']}")

    return _BUNDLE


def get_model_bundle() -> Dict[str, Any]:
    if _BUNDLE is None:
        load_model()
    return _BUNDLE


def get_model_pipeline() -> Any:
    if _PIPELINE is None:
        load_model()
    return _PIPELINE


def get_label_encoder() -> Any:
    if _LABEL_ENCODER is None:
        load_model()
    return _LABEL_ENCODER


def get_feature_names() -> List[str]:
    if _FEATURE_NAMES is None:
        load_model()
    return _FEATURE_NAMES


def get_model_metadata() -> Dict[str, Any]:
    if _METADATA is None:
        load_model()
    return _METADATA


def is_model_loaded() -> bool:
    return _BUNDLE is not None
