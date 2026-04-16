set shell := ["bash", "-cu"]

install:
    python -m pip install -r requirements.txt
    npm install --prefix frontend

test:
    python -m unittest discover -s tests
    npm test --prefix frontend

test-cli:
    # python -m unittest tests.test_combined_runtime tests.test_cli -v
    if command -v python >/dev/null 2>&1; then python -m unittest tests.test_combined_runtime tests.test_cli -v; else python3 -m unittest tests.test_combined_runtime tests.test_cli -v; fi

frontend-build:
    npm run build --prefix frontend

run-once:
    python main.py --once

dry-run:
    python main.py --once --dry-run

daemon:
    python main.py

docker-build:
    docker build -t cpacodexkeeper .

docker-up:
    docker compose up -d --build

docker-down:
    docker compose down
