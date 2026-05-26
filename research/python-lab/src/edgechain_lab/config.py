"""Shared configuration values."""

from pydantic import BaseModel, Field


class ReliabilityConfig(BaseModel):
    """Reliability parameters for synthetic field data generation."""

    lora_delivery_rate: float = Field(default=1.0, ge=0.0, le=1.0)
    outage_probability: float = Field(default=0.0, ge=0.0, le=1.0)
    max_consecutive_outage_rounds: int = Field(default=2, ge=0)
    whatsapp_delay_hours: int = Field(default=0, ge=0)
    battery_low_dropout_probability: float = Field(default=0.0, ge=0.0, le=1.0)

