.PHONY: up down recreate clean

COMPOSE ?= docker compose

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

recreate:
	$(COMPOSE) up --build --force-recreate

clean:
	$(COMPOSE) down --volumes --rmi local --remove-orphans
