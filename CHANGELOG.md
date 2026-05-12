# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-12

### Added
- Initial stable release.
- Dashboard financeiro com DRE interativo e drill-down por categoria.
- Módulo de insumos com catálogo canônico, classificação em 4 camadas (nome exato → aliases → palavras-chave → histórico do usuário) e aprendizado contínuo.
- Ingestão automática de Notas Fiscais via webhook N8N, quebrando cada item em lançamento DRE próprio com subcategoria correta.
- Classificação automática de fornecedores e subcategorias por palavras-chave.
- Caixa Diário com lançamento rápido de vendas.
- Fichas Técnicas para pizzas (massas, bordas, tamanhos dinâmicos) e produtos.
- Precificação inteligente com sugestão de preço baseada em CMV, taxas e lucro desejado.
- Combos e promoções com simulador de margem.
- Ponto de equilíbrio e análise de saúde financeira.
- Alertas de variação de preço de insumos.
- Multi-unidade (franquias / filiais) com isolamento de dados por RLS.
- Onboarding guiado para novos usuários.
- Sistema de roles (admin, manager, operator) via RLS.

### Changed
- Projeto versionado e documentado para produção.

### Security
- `.env` removido do controle de versão.
- Chaves de ambiente documentadas apenas em `.env.example`.
