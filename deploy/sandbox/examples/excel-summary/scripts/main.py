import os
from pathlib import Path
import pandas as pd

inputs = list(Path(os.environ["MSSCLAW_INPUT_DIR"]).glob("*.xlsx"))
if len(inputs) != 1:
    raise ValueError("Exactly one xlsx input is required")
frame = pd.read_excel(inputs[0])
output = Path(os.environ["MSSCLAW_OUTPUT_DIR"])
summary = frame.describe(include="all").transpose()
summary.to_excel(output / "summary.xlsx", engine="openpyxl")
(output / "summary.md").write_text(
    f"# 数据汇总\n\n输入共 {len(frame)} 行、{len(frame.columns)} 列。\n", encoding="utf-8"
)
print(f"Summarized {len(frame)} rows")
