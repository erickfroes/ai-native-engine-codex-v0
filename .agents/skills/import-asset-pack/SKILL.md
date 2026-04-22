---
name: import-asset-pack
description: Use esta skill quando a tarefa envolver entrada de sprites, texturas, sons, modelos, atlas, materiais, prefabs iniciais ou reconstrução do índice de assets.
---

Objetivo: importar assets com previsibilidade, rastreabilidade e baixa chance de quebrar cenas.

Passos:

1. Classifique o tipo de asset e o destino no projeto.
2. Gere ou atualize o manifesto do pack.
3. Valide nomes, caminhos e referências.
4. Gere prefabs/templates mínimos quando apropriado.
5. Atualize cena de exemplo ou catálogo de preview.
6. Rebuild do índice de assets.
7. Verifique diffs de manifesto e referências órfãs.

Checklist final:

- assets têm nomes consistentes
- manifesto está atualizado
- cenas/prefabs não ficaram com referências quebradas
- fluxo pode ser repetido via CLI/MCP
