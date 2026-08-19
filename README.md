# 🏄 Surfboard

Dashboard surf self-hosté — conditions en temps réel sur la côte atlantique.

Surfboard affiche les conditions de surf (houle, période, vent, marées, météo) pour les spots girondins avec des données actualisées toutes les 15 minutes, des webcams live et un score de surf calculé automatiquement.

## Fonctionnalités

- **Vue d ensemble** — Score surf, météo, conditions de houle, boussole de vent, graphe 24h
- **Multi-spots** — Lacanau, Le Porge, Hourtin, Montalivet, Cap Ferret
- **Prévisions** — Tableau heure par heure : météo, vagues, période, vent
- **Carte des vents** — Carte Windy.com intégrée
- **Webcams** — Flux en direct des plages
- **Marées** — État actuel, heures pleine/basse mer, courbe de marée
- **Score surf** — Algorithme maison (houle, période, vent, rafales)
- **PWA** — Installable sur téléphone
- **Dark mode** — Interface sombre

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | SvelteKit 2 + Svelte 5 |
| Données météo | Open-Meteo API (gratuit, sans clé) |
| Données marines | Open-Meteo Marine API |
| Carte vent | Windy.com (embed) |
| Webcams | Viewsurf via proxy Puppeteer |
| Backend | Docker (InfluxDB + Mosquitto + Fetcher Python) |
| Hébergement | Self-hosté sur Proxmox |
| Accès distant | Cloudflare Tunnel |

## Installation

Prérequis : Linux, Docker, Node.js 18+

    git clone https://github.com/Androxe/Surfboard.git
    cd Surfboard
    npm install
    npm run dev

Dashboard accessible sur http://localhost:5173

## Score surf

Le score est calculé sur 10 :

| Critère | Idéal | Bonus | Malus |
|---------|-------|-------|-------|
| Houle | 0.5-1.5m | +2 | -2 si flat ou > 3m |
| Période | 12s+ | +1.5 | -1 si < 6s |
| Vent | Offshore (Est) | +1.5 | -2 si onshore fort |
| Rafales | < 8 kn | +0.5 | -1.5 si > 30 kn |

Ajuste surfScore() dans src/lib/api.js selon ton niveau.

## APIs utilisées

- Open-Meteo (https://open-meteo.com/) — Météo et données marines
- Windy.com — Carte des vents
- Viewsurf — Webcams surf

## Licence

MIT
