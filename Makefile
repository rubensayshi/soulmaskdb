.PHONY: dev build db sqlc translate test clean

db:
	python3 pipeline/build_db.py

translate:
	python3 pipeline/generate_translations.py

sqlc:
	cd backend && sqlc generate

test:
	cd backend && go test ./...
	cd web && pnpm test -- --run
	pytest pipeline/

build: sqlc
	cd web && pnpm install && pnpm build
	rm -rf backend/internal/spa/dist
	cp -r web/dist backend/internal/spa/dist
	cd backend && go build -o bin/server ./cmd/server

dev:
	@echo "Start backend:  cd backend && go run ./cmd/server -dev"
	@echo "Start web:      cd web && pnpm dev"
	@echo "Rebuild db:     make db"

clean:
	rm -rf backend/bin backend/internal/spa/dist/* web/dist web/node_modules data/app.db
	touch backend/internal/spa/dist/.gitkeep
