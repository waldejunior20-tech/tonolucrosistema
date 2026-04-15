

## Fix: Apenas cabeçalho e Nome em negrito

O problema: todas as células de dados ficaram em negrito. O usuário quer:
- **Cabeçalho** (NOME, CATEGORIA, etc.) → negrito (já está OK via `TableHead`)
- **Coluna Nome** (dados) → negrito e cor escura `#1A1A1A`
- **Demais colunas** (dados) → peso normal, sem negrito

### Alteração em `src/pages/InsumosComprados.tsx`

Remover `font-bold text-[#1A1A1A]` de todas as `TableCell` exceto a do Nome. Manter `tabular-nums` e `text-right` nos campos numéricos.

