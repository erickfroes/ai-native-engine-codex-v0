# Runtime do engine

Estrutura recomendada:

- `core/`
- `math/`
- `ecs/`
- `scene/`
- `render/`
- `input/`
- `audio/`
- `physics_lite/`
- `ui/`
- `networking/`
- `save/`

Cada módulo deve ter:

- responsabilidade única
- README curto
- interfaces públicas explícitas
- testes locais
- exemplos mínimos

## Convenções

- Componentes = dados
- Sistemas = comportamento
- Formatos = schema-validáveis
- Perf = mensurável
- Diffs = pequenos
