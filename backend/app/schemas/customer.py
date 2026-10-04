"""
Pydantic schemas for customer input data.
Defines the exact contract for what the API expects from the frontend.
"""
from pydantic import BaseModel, Field


class CustomerInput(BaseModel):
    """
    Input schema for a single customer prediction.
    All fields match the Telco Customer Churn dataset exactly.
    """
    gender: str = Field(..., description="Customer gender", example="Female")
    SeniorCitizen: str = Field(..., description="Is the customer a senior citizen?", example="No")
    Partner: str = Field(..., description="Does the customer have a partner?", example="Yes")
    Dependents: str = Field(..., description="Does the customer have dependents?", example="No")
    tenure: int = Field(..., ge=0, le=72, description="Number of months with the company", example=12)
    PhoneService: str = Field(..., description="Does the customer have phone service?", example="Yes")
    MultipleLines: str = Field(..., description="Does the customer have multiple lines?", example="No")
    InternetService: str = Field(..., description="Type of internet service", example="DSL")
    OnlineSecurity: str = Field(..., description="Does the customer have online security?", example="No")
    OnlineBackup: str = Field(..., description="Does the customer have online backup?", example="Yes")
    DeviceProtection: str = Field(..., description="Does the customer have device protection?", example="No")
    TechSupport: str = Field(..., description="Does the customer have tech support?", example="No")
    StreamingTV: str = Field(..., description="Does the customer have streaming TV?", example="No")
    StreamingMovies: str = Field(..., description="Does the customer have streaming movies?", example="No")
    Contract: str = Field(..., description="Type of contract", example="Month-to-month")
    PaperlessBilling: str = Field(..., description="Does the customer have paperless billing?", example="Yes")
    PaymentMethod: str = Field(..., description="Payment method", example="Electronic check")
    MonthlyCharges: float = Field(..., ge=0.0, description="Monthly charges in dollars", example=85.70)
    TotalCharges: float = Field(..., ge=0.0, description="Total charges in dollars", example=1020.00)

    class Config:
        # Allow the schema to be used in FastAPI's OpenAPI schema generation
        json_schema_extra = {
            "example": {
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
                "MonthlyCharges": 85.70,
                "TotalCharges": 171.40,
            }
        }