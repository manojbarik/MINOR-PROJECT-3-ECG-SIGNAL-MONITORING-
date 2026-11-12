import sys, os
sys.path.append(os.path.abspath('backend'))
from app.ml.model_loader import load_model, get_model_metadata
bundle = load_model()
metadata = get_model_metadata()
print('Model loaded, classes:', metadata.get('classes'))

