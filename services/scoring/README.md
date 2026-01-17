# PlayProof Scoring Service

Python FastAPI service for ML-based scoring of verification events.

## Setup

```bash
cd services/scoring
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Development

```bash
uvicorn main:app --reload
```

The service will be available at http://localhost:8000

## Endpoints

- `GET /health` - Health check
- `POST /score` - Score verification events (returns PASS/FAIL/REGENERATE/STEP_UP)

## API Docs

When running, visit:
- http://localhost:8000/docs - Swagger UI
- http://localhost:8000/redoc - ReDoc
