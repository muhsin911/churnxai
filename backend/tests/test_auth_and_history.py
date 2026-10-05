"""Role-based authentication and PostgreSQL-backed prediction history tests."""
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import UUID

from app.db.models import PredictionRecord, User

VALID_CUSTOMER = {
    "gender": "Female",
    "SeniorCitizen": "No",
    "Partner": "Yes",
    "Dependents": "No",
    "tenure": 2,
    "PhoneService": "Yes",
    "MultipleLines": "No",
    "InternetService": "DSL",
    "OnlineSecurity": "No",
    "OnlineBackup": "Yes",
    "DeviceProtection": "No",
    "TechSupport": "No",
    "StreamingTV": "No",
    "StreamingMovies": "No",
    "Contract": "Month-to-month",
    "PaperlessBilling": "Yes",
    "PaymentMethod": "Electronic check",
    "MonthlyCharges": 85.7,
    "TotalCharges": 171.4,
}

PREDICTION = {
    "churn_probability": 0.85,
    "churn_risk": "Critical",
    "predicted_class": 1,
    "confidence": "High",
    "model_used": "XGBoost",
    "threshold_used": 0.335,
}

EXPLANATION = {
    "churn_probability": 0.85,
    "base_value_logodds": -0.5,
    "base_value_probability": 0.38,
    "shap_values": {"Contract_Month-to-month": 0.7},
    "top_positive_drivers": [
        {"feature": "Contract_Month-to-month", "shap_value": 0.7, "direction": "Increases churn risk"}
    ],
    "top_negative_drivers": [],
    "waterfall_image_base64": "ZmFrZQ==",
    "interpretation": "Example explanation.",
}


def test_login_sets_http_only_session_cookie(client, database_seed):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "STAFF_TEST", "password": "testing-password-123"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "staff"
    assert "password_hash" not in response.json()
    cookie = response.headers["set-cookie"]
    assert "httponly" in cookie.lower()
    assert "samesite=strict" in cookie.lower()


def test_login_uses_generic_error_for_unknown_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "unknown", "password": "testing-password-123"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."


def test_authentication_is_required_for_model_routes(client):
    response = client.post("/api/v1/predict", json=VALID_CUSTOMER)

    assert response.status_code == 401


def test_professor_can_run_predictions(client, database_seed, authenticate):
    authenticate(client, database_seed["professor"])

    with (
        patch("app.ml.predictor.predictor._is_loaded", True),
        patch("app.ml.predictor.predictor.predict", return_value=PREDICTION),
    ):
        response = client.post("/api/v1/predict", json=VALID_CUSTOMER)

    assert response.status_code == 200


def test_combined_prediction_persists_result_and_explanation(
    client, database_seed, authenticate, db_session
):
    authenticate(client, database_seed["staff"])
    with (
        patch("app.ml.predictor.predictor._is_loaded", True),
        patch("app.ml.predictor.predictor._pipeline", object()),
        patch("app.ml.predictor.predictor._metadata", {"model_status": "real_trained"}),
        patch("app.ml.predictor.predictor.predict", return_value=PREDICTION),
        patch("app.api.predictions.get_explainer") as get_explainer,
    ):
        get_explainer.return_value.explain.return_value = EXPLANATION
        response = client.post("/api/v1/predict-and-explain", json=VALID_CUSTOMER)

    assert response.status_code == 200
    result = response.json()
    assert result["prediction"]["prediction_id"] == result["prediction_id"]
    assert result["explanation"]["top_positive_drivers"][0]["feature"] == "Contract_Month-to-month"
    record = db_session.get(PredictionRecord, UUID(result["prediction_id"]))
    assert record is not None
    assert record.user_id == database_seed["staff"].id
    assert record.input_features["tenure"] == 2
    assert record.explanation["shap_values"]["Contract_Month-to-month"] == 0.7


def _record(owner: User, customer: dict[str, object]) -> PredictionRecord:
    return PredictionRecord(
        user_id=owner.id,
        created_at=datetime.now(timezone.utc),
        model_name="XGBoost",
        model_status="real_trained",
        churn_probability=0.6,
        churn_risk="High",
        predicted_class=True,
        decision_threshold=0.335,
        input_features=customer,
        explanation={"top_positive_drivers": [], "top_negative_drivers": []},
    )


def test_staff_history_is_scoped_and_does_not_return_customer_features(
    client, database_seed, authenticate, db_session
):
    own = _record(database_seed["staff"], VALID_CUSTOMER)
    other = _record(database_seed["manager"], VALID_CUSTOMER)
    db_session.add_all([own, other])
    db_session.commit()
    authenticate(client, database_seed["staff"])

    response = client.get("/api/v1/predictions")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    item = response.json()["items"][0]
    assert item["id"] == str(own.id)
    assert "input_features" not in item
    assert "username" not in item


def test_manager_can_review_all_account_prediction_history(
    client, database_seed, authenticate, db_session
):
    db_session.add_all([
        _record(database_seed["staff"], VALID_CUSTOMER),
        _record(database_seed["manager"], VALID_CUSTOMER),
        _record(database_seed["professor"], VALID_CUSTOMER),
    ])
    db_session.commit()
    authenticate(client, database_seed["manager"])

    response = client.get("/api/v1/predictions")

    assert response.status_code == 200
    assert response.json()["total"] == 3
    assert {item["username"] for item in response.json()["items"]} == {
        "staff_test",
        "manager_test",
        "professor_test",
    }


def test_professor_can_review_complete_prediction_history(
    client, database_seed, authenticate, db_session
):
    db_session.add_all([
        _record(database_seed["staff"], VALID_CUSTOMER),
        _record(database_seed["manager"], VALID_CUSTOMER),
        _record(database_seed["professor"], VALID_CUSTOMER),
    ])
    db_session.commit()
    authenticate(client, database_seed["professor"])

    response = client.get("/api/v1/predictions")

    assert response.status_code == 200
    assert response.json()["total"] == 3
    assert {item["username"] for item in response.json()["items"]} == {
        "staff_test",
        "manager_test",
        "professor_test",
    }


def test_staff_cannot_open_another_users_prediction_detail(
    client, database_seed, authenticate, db_session
):
    other_record = _record(database_seed["manager"], VALID_CUSTOMER)
    db_session.add(other_record)
    db_session.commit()
    authenticate(client, database_seed["staff"])

    response = client.get(f"/api/v1/predictions/{other_record.id}")

    assert response.status_code == 404


def test_manager_can_create_each_account_role(client, database_seed, authenticate):
    authenticate(client, database_seed["manager"])

    for role in ("staff", "manager", "professor"):
        response = client.post(
            "/api/v1/auth/users",
            json={
                "username": f"new_{role}",
                "password": "a-long-demo-password",
                "role": role,
            },
        )
        assert response.status_code == 201
        assert response.json()["username"] == f"new_{role}"
        assert response.json()["role"] == role
        assert "password_hash" not in response.json()


def test_only_managers_can_create_users(client, database_seed, authenticate):
    for role in ("staff", "professor"):
        authenticate(client, database_seed[role])
        response = client.post(
            "/api/v1/auth/users",
            json={
                "username": f"blocked_{role}",
                "password": "a-long-demo-password",
                "role": "manager",
            },
        )
        assert response.status_code == 403


def test_manager_can_list_accounts_and_counts_without_sensitive_fields(
    client, database_seed, authenticate, db_session
):
    db_session.get(User, database_seed["staff"].id).is_active = False
    db_session.commit()
    authenticate(client, database_seed["manager"])

    response = client.get("/api/v1/auth/users")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["active_total"] == 2
    assert {account["username"] for account in body["items"]} == {
        "staff_test",
        "manager_test",
        "professor_test",
    }
    staff = next(account for account in body["items"] if account["username"] == "staff_test")
    assert staff["is_active"] is False
    assert set(staff) == {"id", "username", "role", "is_active", "created_at"}
    assert "password_hash" not in body


def test_only_managers_can_list_accounts(client, database_seed, authenticate):
    for role in ("staff", "professor"):
        authenticate(client, database_seed[role])
        response = client.get("/api/v1/auth/users")
        assert response.status_code == 403


def test_manager_deactivation_preserves_prediction_history_and_blocks_login(
    client, database_seed, authenticate, db_session
):
    record = _record(database_seed["staff"], VALID_CUSTOMER)
    db_session.add(record)
    db_session.commit()
    authenticate(client, database_seed["manager"])

    response = client.delete(f"/api/v1/auth/users/{database_seed['staff'].id}")

    assert response.status_code == 204
    db_session.expire_all()
    assert db_session.get(PredictionRecord, record.id) is not None
    inactive_staff = db_session.get(User, database_seed["staff"].id)
    assert inactive_staff is not None
    assert inactive_staff.is_active is False

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "staff_test", "password": "testing-password-123"},
    )
    assert login_response.status_code == 401


def test_manager_cannot_deactivate_own_account(client, database_seed, authenticate):
    authenticate(client, database_seed["manager"])

    response = client.delete(f"/api/v1/auth/users/{database_seed['manager'].id}")

    assert response.status_code == 409
    assert "own manager account" in response.json()["detail"]


def test_manager_can_deactivate_another_manager_without_deactivating_self(
    client, database_seed, authenticate, db_session
):
    authenticate(client, database_seed["manager"])
    response = client.post(
        "/api/v1/auth/users",
        json={
            "username": "manager_two",
            "password": "a-long-demo-password",
            "role": "manager",
        },
    )
    assert response.status_code == 201

    deactivation = client.delete(f"/api/v1/auth/users/{response.json()['id']}")

    assert deactivation.status_code == 204
    db_session.expire_all()
    caller = db_session.get(User, database_seed["manager"].id)
    other_manager = db_session.get(User, UUID(response.json()["id"]))
    assert caller is not None and caller.is_active is True
    assert other_manager is not None and other_manager.is_active is False


def test_deactivating_unknown_account_returns_not_found(client, database_seed, authenticate):
    authenticate(client, database_seed["manager"])

    response = client.delete("/api/v1/auth/users/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
