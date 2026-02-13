.PHONY: build up down logs restart clean test test-backend test-frontend test-unit test-api test-component \
       deploy-server deploy-backup deploy-status deploy-logs deploy-rollback

# Check lint & format
check-code:
	npm run lint && npm run format
	npm run lint && npm run format

# Fix lint & format
fix-code:
	npm run lint:fix && npm run format:fix
	npm run lint:fix && npm run format:fix

# Run all tests
test:
	cd backend && npm test
	cd frontend && npm test

# Run backend tests only
test-backend:
	cd backend && npm test

# Run frontend tests only
test-frontend:
	cd frontend && npm test

# Run backend unit tests (excludes API integration tests)
test-unit:
	cd backend && npm run test:unit

# Run backend API integration tests only
test-api:
	cd backend && npm run test:api

# Run frontend component tests only
test-component:
	cd frontend && npm run test:component

# Build all containers
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Restart services
restart:
	docker-compose restart

# Clean up (remove containers and volumes)
clean:
	docker-compose down -v
	docker system prune -f

# Build and start
deploy: build up

# Backup data (local)
backup:
	@mkdir -p backups
	@cp data/data.json backups/data-$$(date +%Y%m%d-%H%M%S).json
	@echo "Backup created in backups/"

# ──────────────────────────── Server deployment ────────────────────────────────────
# Usage:
#   make deploy-server          		 # Run tests, backup data, pull, rebuild, restart
#   make deploy-server SKIP_TESTS=1  # Skip tests, just deploy
#   make deploy-backup          		 # Backup server data only
#   make deploy-status          		 # Check container health
#   make deploy-logs            		 # Tail server logs
#   make deploy-rollback        		 # Restore most recent backup
#
# Load .env file for deployment vars only
-include .env
export DEPLOY_HOST
export DEPLOY_PASS
export DEPLOY_REPO
export DEPLOY_DATA_DIR

SSH := sshpass -p $(DEPLOY_PASS) ssh -o StrictHostKeyChecking=no $(DEPLOY_HOST)

# Full deploy: test locally, then backup + pull + rebuild on server
deploy-server:
ifndef SKIP_TESTS
	@echo "==> Running tests locally..."
	@cd backend && npm test
	@cd frontend && npm test
endif
	@echo "==> Deploying to $(DEPLOY_HOST)..."
	@$(SSH) '\
		set -e && \
		echo "==> Backing up data..." && \
		if [ -f $(DEPLOY_DATA_DIR)/data.json ]; then \
			mkdir -p $(DEPLOY_DATA_DIR)/backups && \
			cp $(DEPLOY_DATA_DIR)/data.json "$(DEPLOY_DATA_DIR)/backups/data-$$(date +%Y%m%d-%H%M%S).json" && \
			echo "    Backup saved to $(DEPLOY_DATA_DIR)/backups/"; \
		else \
			echo "    No data.json found, skipping backup"; \
		fi && \
		echo "==> Pulling latest code..." && \
		cd $(DEPLOY_REPO) && \
		git pull && \
		echo "==> Rebuilding and restarting containers..." && \
		docker compose up -d --build && \
		echo "==> Waiting for health checks..." && \
		sleep 10 && \
		docker compose ps && \
		echo "" && \
		echo "==> Deploy complete!"'

# Backup server data only
deploy-backup:
	@echo "==> Backing up server data..."
	@$(SSH) '\
		if [ -f $(DEPLOY_DATA_DIR)/data.json ]; then \
			mkdir -p $(DEPLOY_DATA_DIR)/backups && \
			cp $(DEPLOY_DATA_DIR)/data.json "$(DEPLOY_DATA_DIR)/backups/data-$$(date +%Y%m%d-%H%M%S).json" && \
			echo "Backup saved to $(DEPLOY_DATA_DIR)/backups/"; \
		else \
			echo "No data.json found at $(DEPLOY_DATA_DIR)"; \
		fi'

# Check server container status
deploy-status:
	@$(SSH) 'cd $(DEPLOY_REPO) && docker compose ps'

# Tail server logs (Ctrl+C to stop)
deploy-logs:
	@$(SSH) 'cd $(DEPLOY_REPO) && docker compose logs -f --tail=50'

# Restore most recent backup on server
deploy-rollback:
	@echo "==> Restoring most recent backup..."
	@$(SSH) '\
		set -e && \
		LATEST=$$(ls -t $(DEPLOY_DATA_DIR)/backups/data-*.json 2>/dev/null | head -1) && \
		if [ -z "$$LATEST" ]; then \
			echo "No backups found in $(DEPLOY_DATA_DIR)/backups/"; \
			exit 1; \
		fi && \
		echo "    Restoring: $$LATEST" && \
		cd $(DEPLOY_REPO) && \
		docker compose stop backend && \
		cp "$$LATEST" $(DEPLOY_DATA_DIR)/data.json && \
		docker compose start backend && \
		echo "==> Rollback complete. Restored from $$LATEST"'
