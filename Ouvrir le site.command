#!/bin/bash
# Double-clic : lance le site en local et l’ouvre dans le navigateur.
cd "$(dirname "$0")"
(sleep 1; open "http://localhost:8000") &
python3 -m http.server 8000
