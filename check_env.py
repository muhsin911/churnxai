import numpy
import pandas
import scipy
import sklearn
import xgboost
import torch
import shap
import mlflow
import imblearn

libs = {
    'numpy': numpy,
    'pandas': pandas,
    'scipy': scipy,
    'scikit-learn': sklearn,
    'imbalanced-learn': imblearn,
    'xgboost': xgboost,
    'torch': torch,
    'shap': shap,
    'mlflow': mlflow
}

print("✅ Library Versions:")
for name, mod in libs.items():
    print(f"  {name:20} {mod.__version__}")

print("\n🎉 All libraries imported successfully! You are ready to proceed.")