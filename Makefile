# -------- Settings (tweak if needed) --------
PROFILE ?= dev                 # dev | local
ENVFILE ?= .env                # path to your env file (repo root by default)
COMPOSE := docker compose --env-file $(ENVFILE) -f build/docker-compose.yml

# Allow: make VAR=value ...
# Ex: make up PROFILE=local API_PORT=9090 API_HOST_PORT=9090 API_ORIGIN=http://localhost:9090

# -------- Meta --------
.PHONY: help
help: ## Show this help
	@awk 'BEGIN{FS=":.*##"; printf "\nTargets:\n"} /^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# -------- Core lifecycle --------
.PHONY: up
up: ## Build (if needed) + start all services for $(PROFILE)
	$(COMPOSE) --profile $(PROFILE) up -d

.PHONY: up-build
up-build: ## Force rebuild images, then start all services for $(PROFILE)
	$(COMPOSE) --profile $(PROFILE) up -d --build

.PHONY: build
build: ## Just (re)build images (no start)
	$(COMPOSE) --profile $(PROFILE) build

.PHONY: rebuild
rebuild: ## Rebuild without cache (no start)
	$(COMPOSE) --profile $(PROFILE) build --no-cache

.PHONY: down
down: ## Stop and remove containers (keep images & volumes)
	$(COMPOSE) --profile $(PROFILE) down --remove-orphans

.PHONY: kill
kill: ## Stop and remove containers, images, and volumes (⚠ wipes DB data)
	$(COMPOSE) --profile $(PROFILE) down --rmi all --volumes --remove-orphans

# -------- Visibility & debugging --------
.PHONY: ps
ps: ## Show containers status for $(PROFILE)
	$(COMPOSE) --profile $(PROFILE) ps

.PHONY: logs
logs: ## Tail logs for all $(PROFILE) services
	$(COMPOSE) --profile $(PROFILE) logs -f --tail=200

# Ex: make logs-s backend-dev
.PHONY: logs-s
logs-s: ## Tail logs for a single service: make logs-s SERVICE=backend-dev
	@test -n "$(SERVICE)" || (echo "Set SERVICE=..." && exit 1)
	$(COMPOSE) logs -f --tail=200 $(SERVICE)

# -------- Service-level controls --------
# Ex: make up-s SERVICE=backend-dev
.PHONY: up-s
up-s: ## Start one service (inherits $(PROFILE)); add --no-deps with NODEPS=1
	@test -n "$(SERVICE)" || (echo "Set SERVICE=..." && exit 1)
	$(COMPOSE) up -d $(if $(NODEPS),--no-deps,) $(SERVICE)

.PHONY: build-s
build-s: ## Build one service: make build-s SERVICE=webui-dev
	@test -n "$(SERVICE)" || (echo "Set SERVICE=..." && exit 1)
	$(COMPOSE) build $(SERVICE)

.PHONY: restart-s
restart-s: ## Restart one service: make restart-s SERVICE=backend-dev
	@test -n "$(SERVICE)" || (echo "Set SERVICE=..." && exit 1)
	$(COMPOSE) up -d --build $(SERVICE)

.PHONY: exec
exec: ## Exec into service shell: make exec SERVICE=backend-dev [CMD="bash"]
	@test -n "$(SERVICE)" || (echo "Set SERVICE=..." && exit 1)
	$(COMPOSE) exec $(SERVICE) $(if $(CMD),$(CMD),sh)

# -------- Handy shortcuts --------
.PHONY: up-backend
up-backend: ## Start only backend (no deps): make up-backend SERVICE=backend-dev
	@$(MAKE) up-s SERVICE=$(if $(SERVICE),$(SERVICE),backend-$(PROFILE)) NODEPS=1

.PHONY: up-webui
up-webui: ## Start only webui (no deps): make up-webui SERVICE=webui-dev
	@$(MAKE) up-s SERVICE=$(if $(SERVICE),$(SERVICE),webui-$(PROFILE)) NODEPS=1

.PHONY: up-db
up-db: ## Start only databases for $(PROFILE)
	$(COMPOSE) --profile $(PROFILE) up -d postgres-$(PROFILE) qdrant-$(PROFILE)

.PHONY: down-db
down-db: ## Stop DBs for $(PROFILE)
	$(COMPOSE) --profile $(PROFILE) stop postgres-$(PROFILE) qdrant-$(PROFILE)

# -------- Diagnostics --------
.PHONY: config
config: ## Show fully-resolved compose config (confirms env expansion)
	$(COMPOSE) config

.PHONY: prune
prune: ## Docker-wide cleanup (stopped containers, dangling images) - global
	docker system prune -f