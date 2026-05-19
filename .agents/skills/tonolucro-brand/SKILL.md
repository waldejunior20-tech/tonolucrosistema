---
name: tonolucro-brand
description: Gerencia e aplica as diretrizes de identidade visual da marca "tôno lucro". Use para gerar variações do logotipo, consultar a paleta de cores, tipografia e elementos visuais da marca.
---

# tôno lucro Brand

## Visão Geral

Esta skill encapsula as diretrizes de identidade visual da marca **tôno lucro**, permitindo a consulta rápida de seus elementos e a geração de variações do logotipo para diferentes contextos de aplicação.

## Diretrizes da Marca

Para detalhes completos sobre a paleta de cores, tipografia, elementos visuais e aplicações da marca, consulte o arquivo de referência:

- [Diretrizes de Marca](references/brand_guidelines.md)

## Geração de Variações do Logotipo

É possível gerar variações do logotipo "tôno lucro" utilizando o script `generate_variant.py`.

### Uso do Script `generate_variant.py`

O script aceita dois argumentos opcionais:

1.  `color_mode`: Define o modo de cor do logotipo. Pode ser `dark` (fundo escuro) ou `light` (fundo claro). O padrão é `dark`.
2.  `output_path`: O caminho e nome do arquivo SVG de saída. O padrão é `logo_variant.svg`.

**Exemplos:**

```bash
python scripts/generate_variant.py dark logo_dark.svg
python scripts/generate_variant.py light logo_light.svg
```

## Recursos

Esta skill inclui os seguintes recursos:

### scripts/

- `generate_variant.py`: Script Python para gerar variações do logotipo em SVG com base no modo de cor (fundo escuro ou claro).

### references/

- `brand_guidelines.md`: Documento Markdown detalhando a paleta de cores, tipografia, elementos visuais e aplicações da marca "tôno lucro".

### templates/

- `logo.svg`: O arquivo SVG original do logotipo "tôno lucro", servindo como template base para futuras modificações ou gerações.
