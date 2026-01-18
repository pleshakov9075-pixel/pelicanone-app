from app.workers import tasks


def test_resolve_polling_settings_uses_preset_timeout():
    timeout_s, interval_s = tasks._resolve_polling_settings(
        "image", {"network_id": "gpt-image-1-5", "params": {}}
    )

    assert timeout_s == 600
    assert interval_s == 2.0
