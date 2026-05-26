"""Anthropic monitor wrapper for optional live LLM oversight runs."""

from __future__ import annotations

import json
import os
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field

from edgechain_lab.data.schemas import LLMProvider, LLMRunMetadata, OversightCase, OversightLabel
from edgechain_lab.oversight.prompts import SYSTEM_PROMPT, prompt_hash, render_oversight_prompt


class LLMMonitorResult(BaseModel):
    """Parsed monitor result."""

    label: OversightLabel
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str
    recommended_action: str
    metadata: LLMRunMetadata | None = None
    raw_text: str = ""


def dry_run_monitor(case: OversightCase) -> LLMMonitorResult:
    """Return a deterministic placeholder without calling an API."""

    prompt = render_oversight_prompt(case)
    return LLMMonitorResult(
        label=OversightLabel.SUSPICIOUS,
        confidence=0.0,
        rationale="Dry run placeholder; no live model called.",
        recommended_action="review",
        metadata=LLMRunMetadata(
            provider=LLMProvider.ANTHROPIC,
            model="dry-run-20260526",
            temperature=0.0,
            max_tokens=0,
            prompt_hash=prompt_hash(SYSTEM_PROMPT, prompt),
            date=datetime.now(UTC).date().isoformat(),
        ),
        raw_text="",
    )


def run_anthropic_monitor(
    case: OversightCase,
    *,
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 1024,
    temperature: float = 0.0,
) -> LLMMonitorResult:
    """Run the live Anthropic monitor if explicitly enabled."""

    if os.environ.get("EDGECHAIN_LIVE_LLM") != "1":
        return dry_run_monitor(case)

    try:
        import anthropic
    except ModuleNotFoundError as exc:
        raise RuntimeError("Install the 'llm' extra to run live Anthropic calls") from exc

    prompt = render_oversight_prompt(case)
    client = anthropic.Anthropic()
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    raw_text = _extract_text_content(message.content)
    parsed = _parse_json_result(raw_text)
    parsed.metadata = LLMRunMetadata(
        provider=LLMProvider.ANTHROPIC,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        prompt_hash=prompt_hash(SYSTEM_PROMPT, prompt),
        date=datetime.now(UTC).date().isoformat(),
    )
    parsed.raw_text = raw_text
    return parsed


def _extract_text_content(content_blocks: Iterable[Any]) -> str:
    """Extract text from Anthropic content blocks without assuming block shape."""

    text_parts: list[str] = []
    for block in content_blocks:
        if getattr(block, "type", None) == "text":
            text_parts.append(str(getattr(block, "text", "")))
    raw_text = "\n".join(text_parts).strip()
    if not raw_text:
        raise RuntimeError("Anthropic response did not include a text content block")
    return raw_text


def _parse_json_result(raw_text: str) -> LLMMonitorResult:
    payload = json.loads(raw_text)
    return LLMMonitorResult(
        label=OversightLabel(payload["label"]),
        confidence=float(payload["confidence"]),
        rationale=str(payload["rationale"]),
        recommended_action=str(payload["recommended_action"]),
        raw_text=raw_text,
    )
