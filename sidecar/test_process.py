import json, subprocess, sys, os, tempfile
import numpy as np
import cv2

SIDECAR_DIR = os.path.dirname(__file__)
ATLAS_DIR = os.path.join(SIDECAR_DIR, "..", "assets", "atlas")


def test_process_invalid_path():
    result = subprocess.run(
        [sys.executable, os.path.join(SIDECAR_DIR, "process.py"), "/nonexistent.png"],
        capture_output=True, text=True
    )
    assert result.returncode != 0
    output = json.loads(result.stdout)
    assert "error" in output


def test_process_output_schema():
    img = np.zeros((600, 800, 3), dtype=np.uint8)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        cv2.imwrite(f.name, img)
        tmp_path = f.name
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(SIDECAR_DIR, "process.py"), tmp_path,
             "--atlas", ATLAS_DIR],
            capture_output=True, text=True
        )
        assert result.returncode == 0, f"stderr: {result.stderr}"
        output = json.loads(result.stdout)
        assert "tribesmen" in output
        assert isinstance(output["tribesmen"], list)
    finally:
        os.unlink(tmp_path)
