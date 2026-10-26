# Provas

Conferências automáticas das regras de cálculo do Compass One. Cada
`provaNN.ts` monta um cenário, chama as funções de `src/utils` e confere o
resultado; no fim imprime `provaNN: X ok, Y falhas`.

```bash
npm run provas
```

Rodam sozinhas antes de cada publicação na Vercel (`buildCommand` no
`vercel.json`) e a cada push no GitHub (`.github/workflows/verificacao.yml`).
Se uma falhar, a publicação para e o site continua na versão anterior.

**Prova nova fica aqui, no repositório** (25/10/2026). Até então as provas
viviam na pasta temporária de cada sessão e se perdiam: das ~95 citadas no
CLAUDE.md, só estas cinco sobreviveram. Quando uma regra muda de propósito,
a prova muda junto, com um comentário dizendo quando e por quê.
