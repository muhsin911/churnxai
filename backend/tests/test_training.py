"""Tests for real-data cleaning and training safeguards."""
import pandas as pd
import pytest

from train_model import load_and_clean_data


def _customer_rows(tenure_values, total_charges_values):
    row_count = len(tenure_values)
    return pd.DataFrame({
        "customerID": [f"customer-{index}" for index in range(row_count)],
        "gender": ["Female"] * row_count,
        "SeniorCitizen": [0] * row_count,
        "Partner": ["No"] * row_count,
        "Dependents": ["No"] * row_count,
        "tenure": tenure_values,
        "PhoneService": ["Yes"] * row_count,
        "MultipleLines": ["No"] * row_count,
        "InternetService": ["DSL"] * row_count,
        "OnlineSecurity": ["No"] * row_count,
        "OnlineBackup": ["No"] * row_count,
        "DeviceProtection": ["No"] * row_count,
        "TechSupport": ["No"] * row_count,
        "StreamingTV": ["No"] * row_count,
        "StreamingMovies": ["No"] * row_count,
        "Contract": ["Month-to-month"] * row_count,
        "PaperlessBilling": ["Yes"] * row_count,
        "PaymentMethod": ["Electronic check"] * row_count,
        "MonthlyCharges": [50.0] * row_count,
        "TotalCharges": total_charges_values,
        "Churn": ["No", "Yes"][:row_count],
    })


def test_clean_data_converts_zero_tenure_blank_charge_and_target(tmp_path):
    source = tmp_path / "customers.csv"
    _customer_rows([0, 2], [" ", "100.00"]).to_csv(source, index=False)

    cleaned, audit = load_and_clean_data(source)

    assert cleaned["TotalCharges"].tolist() == [0.0, 100.0]
    assert cleaned["SeniorCitizen"].tolist() == ["No", "No"]
    assert cleaned["Churn"].tolist() == [0, 1]
    assert audit["whitespace_total_charges"] == 1
    assert audit["blank_charge_rows_with_zero_tenure"] == 1


def test_clean_data_rejects_blank_charge_for_nonzero_tenure(tmp_path):
    source = tmp_path / "invalid_customers.csv"
    _customer_rows([1], [" "]).to_csv(source, index=False)

    with pytest.raises(ValueError, match="tenure is 0"):
        load_and_clean_data(source)