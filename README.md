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

- Backend: http://localhost:8042 (docs em `/docs`)
- Frontend: http://localhost:3000
- Mongo: `localhost:27017`

As portas expostas no host podem ser trocadas via `BACKEND_PORT`,
`FRONTEND_PORT` e `MONGO_PORT` no `.env`, caso alguma já esteja em uso na
sua máquina.

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
- [ ] **Fase 2 — Fichas** (em andamento, construída aos poucos): esqueleto
      genérico de ficha (Personagem/NPC) + atributos de Ordem Paranormal
      (FOR/AGI/INT/VIG/PRE) já implementados. Ainda faltam NEX, perícias,
      stats derivados (PV/PE/Sanidade/Defesa) e rituais.
- [ ] **Fase 3 — VTT** (em andamento, construída aos poucos): tela cheia com
      a cena (imagem de fundo) definida pelo Mestre — fixa, sem biblioteca,
      sem exclusão — que todos os membros podem posicionar e dar zoom
      independentemente. Tokens podem ser adicionados por qualquer membro e
      arrastados em tempo real (Mestre move qualquer um, jogador só os seus).
      Cada troca de mapa arquiva o anterior e a posição de seus tokens num
      histórico permanente. Tudo sincronizado via WebSocket.
- [ ] **Fase 4 — Escudo do Mestre:** notas em Markdown com grafos e links
      entre arquivos, ao estilo Obsidian.
