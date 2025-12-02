param(
  [string]$Port = "8001"
)

Set-Location $PSScriptRoot
$env:PYTHONUNBUFFERED = "1"
python -m uvicorn app:app --host 0.0.0.0 --port $Port --reload
