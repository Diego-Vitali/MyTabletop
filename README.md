# MyTabletop

Virtual Tabletop RPG self-hosted, inspirado no Foundry VTT — sem custo de
hospedagem paga. Multiplayer em tempo real, mesas (tabletops) com Mestre(s) e
Jogadores, fichas por livro de regras (começando por Ordem Paranormal RPG
Clássico), uma VTT com mapas e tokens sincronizados via WebSocket, e um
Escudo do Mestre com notas em Markdown ao estilo Obsidian.

## Stack

- **Backend:** FastAPI + [Beanie](https://beanie-odm.dev/) (ODM Pydantic
  sobre MongoDB), autenticação via JWT (24h).
- **Frontend:** Next.js (App Router, TypeScript, Tailwind).
- **Banco:** MongoDB.
- **Deploy local:** docker-compose.

## Rodando localmente com Docker

```bash
cp .env.example .env
docker compose up --build
```

- Backend: http://localhost:8000 (docs em `/docs`)
- Frontend: http://localhost:3000
- Mongo: `localhost:27017`

## Desenvolvimento sem Docker

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
pytest
```

Requer um MongoDB local (`mongodb://localhost:27017` por padrão — configurável
via `.env`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Roadmap

- [x] **Fase 1 — Fundação:** cadastro de usuários, autenticação JWT, CRUD de
      mesas (tabletops) com papéis DM/Player.
- [ ] **Fase 2 — Fichas:** fichas de Personagem e NPC para Ordem Paranormal
      RPG (Clássico), com suporte para outros livros de regras no futuro.
- [ ] **Fase 3 — VTT:** mapas, tokens e sincronização em tempo real via
      WebSocket entre todos os conectados na mesma mesa.
- [ ] **Fase 4 — Escudo do Mestre:** notas em Markdown com grafos e links
      entre arquivos, ao estilo Obsidian.
