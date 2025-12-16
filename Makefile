.PHONY: build up down logs restart clean

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

# Backup data
backup:
	@mkdir -p backups
	@cp data/data.json backups/data-$$(date +%Y%m%d-%H%M%S).json
	@echo "Backup created in backups/"
