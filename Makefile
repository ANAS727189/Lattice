# Variables for Cloud Deployment
DOCKER_USERNAME ?= yourusername
IMAGE_TAG ?= v1.0.0
GO ?= /usr/local/go/bin/go

# .PHONY tells Make that these aren't real files
.PHONY: infra-up infra-down infra-clean run-all run-api run-doc run-sync run-worker run-frontend fmt tidy docker-build docker-push

# ==============================================================================
# Local Development (Fast Iteration)
# ==============================================================================

# Start databases in the background
infra-up:
	docker compose --env-file backend/.env -f backend/deployments/docker-compose.yaml up -d

infra-down:
	docker compose --env-file backend/.env -f backend/deployments/docker-compose.yaml down

infra-clean:
	docker compose --env-file backend/.env -f backend/deployments/docker-compose.yaml down -v --remove-orphans

# Run microservices with hot-reload (Air)
run-api:
	cd backend && air -c .air.api.toml

run-doc:
	cd backend && air -c .air.doc.toml

run-sync:
	cd backend && air -c .air.sync.toml

run-worker:
	cd backend && air -c .air.persist-worker.toml

run-frontend:
	cd frontend && npm run dev

# Run all backend services (requires Air configs)
run-all:
	$(MAKE) run-api &
	$(MAKE) run-doc &
	$(MAKE) run-sync &
	$(MAKE) run-worker

# ==============================================================================
# Cloud Deployment (Docker Builds & Push)
# ==============================================================================

# Build optimized production images for your Go microservices
docker-build:
	@echo "Building API Gateway Image..."
	docker build -t $(DOCKER_USERNAME)/docs-api:$(IMAGE_TAG) -f backend/deployments/Dockerfile.api ./backend
	@echo "Building Sync Service Image..."
	docker build -t $(DOCKER_USERNAME)/docs-sync:$(IMAGE_TAG) -f backend/deployments/Dockerfile.sync ./backend

# Push images to Docker Hub (or AWS ECR / GCP Artifact Registry)
docker-push:
	@echo "Pushing images to registry..."
	docker push $(DOCKER_USERNAME)/docs-api:$(IMAGE_TAG)
	docker push $(DOCKER_USERNAME)/docs-sync:$(IMAGE_TAG)

# Build and deploy everything in one command
release: docker-build docker-push
	@echo "Release $(IMAGE_TAG) complete!"

# ==============================================================================
# Utilities
# ==============================================================================

fmt:
	cd backend && $(GO) fmt ./...

tidy:
	cd backend && $(GO) mod tidy
