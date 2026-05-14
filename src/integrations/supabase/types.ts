export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          entidade: string | null
          entidade_id: string | null
          id: string
          unidade_id: string | null
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          unidade_id?: string | null
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          unidade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_cmv: {
        Row: {
          cmv_anterior: number
          cmv_atual: number
          created_at: string
          created_by: string
          ficha_tecnica_id: string | null
          id: string
          metadata: Json
          nome_produto: string
          preco_sugerido: number
          preco_sugerido_g: number | null
          preco_sugerido_m: number | null
          preco_sugerido_p: number | null
          status: string
          tipo_ficha: string
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cmv_anterior?: number
          cmv_atual?: number
          created_at?: string
          created_by?: string
          ficha_tecnica_id?: string | null
          id?: string
          metadata?: Json
          nome_produto: string
          preco_sugerido?: number
          preco_sugerido_g?: number | null
          preco_sugerido_m?: number | null
          preco_sugerido_p?: number | null
          status?: string
          tipo_ficha?: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cmv_anterior?: number
          cmv_atual?: number
          created_at?: string
          created_by?: string
          ficha_tecnica_id?: string | null
          id?: string
          metadata?: Json
          nome_produto?: string
          preco_sugerido?: number
          preco_sugerido_g?: number | null
          preco_sugerido_m?: number | null
          preco_sugerido_p?: number | null
          status?: string
          tipo_ficha?: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      aprendizado_categorizacao: {
        Row: {
          categoria_aprendida: string
          cnpj: string | null
          fornecedor: string | null
          id: number
          ocorrencias: number | null
          palavra_chave: string | null
          subcategoria_aprendida: string
          tipo: string
          ultima_atualizacao: string | null
          unidade_id: string
          user_id: string
        }
        Insert: {
          categoria_aprendida: string
          cnpj?: string | null
          fornecedor?: string | null
          id?: number
          ocorrencias?: number | null
          palavra_chave?: string | null
          subcategoria_aprendida: string
          tipo?: string
          ultima_atualizacao?: string | null
          unidade_id: string
          user_id?: string
        }
        Update: {
          categoria_aprendida?: string
          cnpj?: string | null
          fornecedor?: string | null
          id?: number
          ocorrencias?: number | null
          palavra_chave?: string | null
          subcategoria_aprendida?: string
          tipo?: string
          ultima_atualizacao?: string | null
          unidade_id?: string
          user_id?: string
        }
        Relationships: []
      }
      auditoria_correcoes_precos: {
        Row: {
          created_at: string
          detalhes: Json
          executado_por: string | null
          id: string
          insumo_id: string | null
          motivo: string
          snapshot_canonico: Json | null
          snapshot_historico: Json | null
          unidade_id: string | null
        }
        Insert: {
          created_at?: string
          detalhes?: Json
          executado_por?: string | null
          id?: string
          insumo_id?: string | null
          motivo: string
          snapshot_canonico?: Json | null
          snapshot_historico?: Json | null
          unidade_id?: string | null
        }
        Update: {
          created_at?: string
          detalhes?: Json
          executado_por?: string | null
          id?: string
          insumo_id?: string | null
          motivo?: string
          snapshot_canonico?: Json | null
          snapshot_historico?: Json | null
          unidade_id?: string | null
        }
        Relationships: []
      }
      auditoria_importacao: {
        Row: {
          created_at: string
          detalhes: Json
          duplicados_sugeridos: Json
          enviados_financeiro: number
          enviados_insumos: number
          fichas_impactadas: Json
          id: string
          itens_lidos: number
          nota_fiscal_id: string | null
          origem: string
          pendentes_revisao: number
          precos_bloqueados: Json
          regras_aplicadas: Json
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json
          duplicados_sugeridos?: Json
          enviados_financeiro?: number
          enviados_insumos?: number
          fichas_impactadas?: Json
          id?: string
          itens_lidos?: number
          nota_fiscal_id?: string | null
          origem?: string
          pendentes_revisao?: number
          precos_bloqueados?: Json
          regras_aplicadas?: Json
          unidade_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          detalhes?: Json
          duplicados_sugeridos?: Json
          enviados_financeiro?: number
          enviados_insumos?: number
          fichas_impactadas?: Json
          id?: string
          itens_lidos?: number
          nota_fiscal_id?: string | null
          origem?: string
          pendentes_revisao?: number
          precos_bloqueados?: Json
          regras_aplicadas?: Json
          unidade_id?: string
          user_id?: string
        }
        Relationships: []
      }
      bases_ficha: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          is_padrao: boolean
          nome: string
          tipo_ficha: string
          unidade_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          is_padrao?: boolean
          nome: string
          tipo_ficha: string
          unidade_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          is_padrao?: boolean
          nome?: string
          tipo_ficha?: string
          unidade_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bases_ficha_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      bases_ficha_ingredientes: {
        Row: {
          base_id: string
          created_at: string
          id: string
          insumo_comprado_id: string | null
          insumo_proprio_id: string | null
          ordem: number
          qtd_g: number | null
          qtd_m: number | null
          qtd_p: number | null
          quantidade: number | null
          tipo_insumo: string
          unidade: string
          unidade_id: string
          user_id: string
        }
        Insert: {
          base_id: string
          created_at?: string
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          ordem?: number
          qtd_g?: number | null
          qtd_m?: number | null
          qtd_p?: number | null
          quantidade?: number | null
          tipo_insumo: string
          unidade: string
          unidade_id: string
          user_id?: string
        }
        Update: {
          base_id?: string
          created_at?: string
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          ordem?: number
          qtd_g?: number | null
          qtd_m?: number | null
          qtd_p?: number | null
          quantidade?: number | null
          tipo_insumo?: string
          unidade?: string
          unidade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bases_ficha_ingredientes_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_ficha"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_ficha_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_ficha_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_ficha_ingredientes_insumo_proprio_id_fkey"
            columns: ["insumo_proprio_id"]
            isOneToOne: false
            referencedRelation: "insumos_proprios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_ficha_ingredientes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      bordas: {
        Row: {
          ativo: boolean
          created_at: string
          custo_g: number
          custo_m: number
          custo_p: number
          custos_por_tamanho: Json
          id: string
          nome: string
          preco_g: number
          preco_m: number
          preco_p: number
          precos_por_tamanho: Json
          unidade_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_g?: number
          custo_m?: number
          custo_p?: number
          custos_por_tamanho?: Json
          id?: string
          nome: string
          preco_g?: number
          preco_m?: number
          preco_p?: number
          precos_por_tamanho?: Json
          unidade_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_g?: number
          custo_m?: number
          custo_p?: number
          custos_por_tamanho?: Json
          id?: string
          nome?: string
          preco_g?: number
          preco_m?: number
          preco_p?: number
          precos_por_tamanho?: Json
          unidade_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bordas_ingredientes: {
        Row: {
          borda_id: string
          created_at: string
          id: string
          insumo_comprado_id: string | null
          insumo_proprio_id: string | null
          qtds_por_tamanho: Json
          tipo_insumo: string
          unidade: string
          unidade_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          borda_id: string
          created_at?: string
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          qtds_por_tamanho?: Json
          tipo_insumo: string
          unidade: string
          unidade_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          borda_id?: string
          created_at?: string
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          qtds_por_tamanho?: Json
          tipo_insumo?: string
          unidade?: string
          unidade_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bordas_ingredientes_borda_id_fkey"
            columns: ["borda_id"]
            isOneToOne: false
            referencedRelation: "bordas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordas_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordas_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordas_ingredientes_insumo_proprio_id_fkey"
            columns: ["insumo_proprio_id"]
            isOneToOne: false
            referencedRelation: "insumos_proprios"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_despesa: {
        Row: {
          ativo: boolean | null
          categoria: string
          cor_hex: string | null
          created_at: string | null
          emoji: string | null
          id: number
          ordem: number | null
          palavras_chave: string[]
          subcategoria: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          cor_hex?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: number
          ordem?: number | null
          palavras_chave?: string[]
          subcategoria: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          cor_hex?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: number
          ordem?: number | null
          palavras_chave?: string[]
          subcategoria?: string
          tipo?: string
        }
        Relationships: []
      }
      combos_fixos: {
        Row: {
          created_at: string | null
          custo_total: number
          id: string
          itens: Json
          margem: number
          nome: string
          preco_separado: number
          preco_venda: number
          unidade_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          custo_total?: number
          id?: string
          itens?: Json
          margem?: number
          nome: string
          preco_separado?: number
          preco_venda?: number
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          custo_total?: number
          id?: string
          itens?: Json
          margem?: number
          nome?: string
          preco_separado?: number
          preco_venda?: number
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "combos_fixos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_negocio: {
        Row: {
          agua: number
          aluguel: number
          cidade: string
          contador: number
          created_at: string
          custos_fixos_detalhados: Json
          energia: number
          estado: string
          faturamento_medio: number
          id: string
          internet: number
          lucro_desejado_pct: number
          nome_estabelecimento: string
          num_funcionarios: number
          onboarding_completo: boolean
          outros_fixos: number
          pct_credito: number
          pct_debito: number
          pct_dinheiro_pix: number
          pct_ifood: number
          salarios: number
          tamanhos_pizza: Json
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agua?: number
          aluguel?: number
          cidade?: string
          contador?: number
          created_at?: string
          custos_fixos_detalhados?: Json
          energia?: number
          estado?: string
          faturamento_medio?: number
          id?: string
          internet?: number
          lucro_desejado_pct?: number
          nome_estabelecimento?: string
          num_funcionarios?: number
          onboarding_completo?: boolean
          outros_fixos?: number
          pct_credito?: number
          pct_debito?: number
          pct_dinheiro_pix?: number
          pct_ifood?: number
          salarios?: number
          tamanhos_pizza?: Json
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agua?: number
          aluguel?: number
          cidade?: string
          contador?: number
          created_at?: string
          custos_fixos_detalhados?: Json
          energia?: number
          estado?: string
          faturamento_medio?: number
          id?: string
          internet?: number
          lucro_desejado_pct?: number
          nome_estabelecimento?: string
          num_funcionarios?: number
          onboarding_completo?: boolean
          outros_fixos?: number
          pct_credito?: number
          pct_debito?: number
          pct_dinheiro_pix?: number
          pct_ifood?: number
          salarios?: number
          tamanhos_pizza?: Json
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_negocio_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_precificacao: {
        Row: {
          app_aiqfome_ativo: boolean
          app_ifood_ativo: boolean
          app_outro_ativo: boolean
          app_outro_nome: string
          app_rappi_ativo: boolean
          cmv_meta_pct: number
          created_at: string
          custos_fixos_pct: number
          id: string
          ifood_plano: string
          taxa_aiqfome_pct: number
          taxa_credito_pct: number
          taxa_debito_pct: number
          taxa_ifood_pct: number
          taxa_outro_pct: number
          taxa_pix_pct: number
          taxa_rappi_pct: number
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_aiqfome_ativo?: boolean
          app_ifood_ativo?: boolean
          app_outro_ativo?: boolean
          app_outro_nome?: string
          app_rappi_ativo?: boolean
          cmv_meta_pct?: number
          created_at?: string
          custos_fixos_pct?: number
          id?: string
          ifood_plano?: string
          taxa_aiqfome_pct?: number
          taxa_credito_pct?: number
          taxa_debito_pct?: number
          taxa_ifood_pct?: number
          taxa_outro_pct?: number
          taxa_pix_pct?: number
          taxa_rappi_pct?: number
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_aiqfome_ativo?: boolean
          app_ifood_ativo?: boolean
          app_outro_ativo?: boolean
          app_outro_nome?: string
          app_rappi_ativo?: boolean
          cmv_meta_pct?: number
          created_at?: string
          custos_fixos_pct?: number
          id?: string
          ifood_plano?: string
          taxa_aiqfome_pct?: number
          taxa_credito_pct?: number
          taxa_debito_pct?: number
          taxa_ifood_pct?: number
          taxa_outro_pct?: number
          taxa_pix_pct?: number
          taxa_rappi_pct?: number
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_precificacao_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_a_pagar: {
        Row: {
          banco: string | null
          categoria: string | null
          cnpj_fornecedor: string | null
          codigo_barras: string | null
          created_at: string
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          forma_pagamento: string | null
          fornecedor: string
          id: string
          linha_digitavel: string | null
          nosso_numero: string | null
          nota_fiscal_id: string | null
          numero_parcela: number
          observacoes: string | null
          origem: string
          status: string
          subcategoria: string | null
          total_parcelas: number
          unidade_id: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          banco?: string | null
          categoria?: string | null
          cnpj_fornecedor?: string | null
          codigo_barras?: string | null
          created_at?: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor: string
          id?: string
          linha_digitavel?: string | null
          nosso_numero?: string | null
          nota_fiscal_id?: string | null
          numero_parcela?: number
          observacoes?: string | null
          origem?: string
          status?: string
          subcategoria?: string | null
          total_parcelas?: number
          unidade_id: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Update: {
          banco?: string | null
          categoria?: string | null
          cnpj_fornecedor?: string | null
          codigo_barras?: string | null
          created_at?: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string
          id?: string
          linha_digitavel?: string | null
          nosso_numero?: string | null
          nota_fiscal_id?: string | null
          numero_parcela?: number
          observacoes?: string | null
          origem?: string
          status?: string
          subcategoria?: string | null
          total_parcelas?: number
          unidade_id?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_a_pagar_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicados_ignorados: {
        Row: {
          created_at: string
          id: string
          insumo_a_id: string
          insumo_b_id: string
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_a_id: string
          insumo_b_id: string
          unidade_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          insumo_a_id?: string
          insumo_b_id?: string
          unidade_id?: string
          user_id?: string
        }
        Relationships: []
      }
      fichas_tecnicas_pizza: {
        Row: {
          base_origem_id: string | null
          created_at: string | null
          id: string
          modo_preparo: string | null
          nome: string
          numero_ficha: string | null
          preco_venda_g: number | null
          preco_venda_m: number | null
          preco_venda_p: number | null
          tipo: string | null
          unidade_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_origem_id?: string | null
          created_at?: string | null
          id?: string
          modo_preparo?: string | null
          nome: string
          numero_ficha?: string | null
          preco_venda_g?: number | null
          preco_venda_m?: number | null
          preco_venda_p?: number | null
          tipo?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_origem_id?: string | null
          created_at?: string | null
          id?: string
          modo_preparo?: string | null
          nome?: string
          numero_ficha?: string | null
          preco_venda_g?: number | null
          preco_venda_m?: number | null
          preco_venda_p?: number | null
          tipo?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_tecnicas_pizza_base_origem_id_fkey"
            columns: ["base_origem_id"]
            isOneToOne: false
            referencedRelation: "bases_ficha"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_pizza_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_tecnicas_pizza_ingredientes: {
        Row: {
          ficha_id: string | null
          id: string
          insumo_comprado_id: string | null
          insumo_proprio_id: string | null
          qtd_g: number | null
          qtd_m: number | null
          qtd_p: number | null
          tipo_insumo: string
          unidade: string
          unidade_id: string | null
          user_id: string | null
        }
        Insert: {
          ficha_id?: string | null
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          qtd_g?: number | null
          qtd_m?: number | null
          qtd_p?: number | null
          tipo_insumo: string
          unidade: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Update: {
          ficha_id?: string | null
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          qtd_g?: number | null
          qtd_m?: number | null
          qtd_p?: number | null
          tipo_insumo?: string
          unidade?: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_tecnicas_pizza_ingredientes_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas_pizza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_pizza_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_pizza_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_pizza_ingredientes_insumo_proprio_id_fkey"
            columns: ["insumo_proprio_id"]
            isOneToOne: false
            referencedRelation: "insumos_proprios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_pizza_ingredientes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_tecnicas_produtos: {
        Row: {
          base_origem_id: string | null
          categoria: string
          created_at: string
          id: string
          modo_preparo: string | null
          nome: string
          numero_ficha: string | null
          preco_venda: number | null
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_origem_id?: string | null
          categoria: string
          created_at?: string
          id?: string
          modo_preparo?: string | null
          nome: string
          numero_ficha?: string | null
          preco_venda?: number | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_origem_id?: string | null
          categoria?: string
          created_at?: string
          id?: string
          modo_preparo?: string | null
          nome?: string
          numero_ficha?: string | null
          preco_venda?: number | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_tecnicas_produtos_base_origem_id_fkey"
            columns: ["base_origem_id"]
            isOneToOne: false
            referencedRelation: "bases_ficha"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_produtos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_tecnicas_produtos_ingredientes: {
        Row: {
          created_at: string
          ficha_id: string
          id: string
          insumo_comprado_id: string | null
          insumo_proprio_id: string | null
          quantidade: number
          tipo_insumo: string
          unidade: string
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          ficha_id: string
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          quantidade: number
          tipo_insumo: string
          unidade: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          ficha_id?: string
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          quantidade?: number
          tipo_insumo?: string
          unidade?: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_tecnicas_produtos_ingredientes_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_produtos_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_produtos_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_produtos_ingredientes_insumo_proprio_id_fkey"
            columns: ["insumo_proprio_id"]
            isOneToOne: false
            referencedRelation: "insumos_proprios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_produtos_ingredientes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_tecnicas_warnings: {
        Row: {
          created_at: string
          detalhes: Json
          ficha_tecnica_id: string
          id: string
          motivo: string
          resolved_at: string | null
          resolvido: boolean
          tipo_ficha: string
          unidade_id: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json
          ficha_tecnica_id: string
          id?: string
          motivo: string
          resolved_at?: string | null
          resolvido?: boolean
          tipo_ficha: string
          unidade_id: string
        }
        Update: {
          created_at?: string
          detalhes?: Json
          ficha_tecnica_id?: string
          id?: string
          motivo?: string
          resolved_at?: string | null
          resolvido?: boolean
          tipo_ficha?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fichas_tecnicas_warnings_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_cache: {
        Row: {
          categoria_detectada: string | null
          confianca: number | null
          created_at: string | null
          id: string
          nome_normalizado: string
          nome_original: string
          subcategoria: string | null
          ultimo_uso: string | null
          vezes_visto: number | null
        }
        Insert: {
          categoria_detectada?: string | null
          confianca?: number | null
          created_at?: string | null
          id?: string
          nome_normalizado: string
          nome_original: string
          subcategoria?: string | null
          ultimo_uso?: string | null
          vezes_visto?: number | null
        }
        Update: {
          categoria_detectada?: string | null
          confianca?: number | null
          created_at?: string | null
          id?: string
          nome_normalizado?: string
          nome_original?: string
          subcategoria?: string | null
          ultimo_uso?: string | null
          vezes_visto?: number | null
        }
        Relationships: []
      }
      fornecedores_subcategoria: {
        Row: {
          aprendido_automaticamente: boolean
          categoria: string
          created_at: string
          fornecedor_nome_original: string
          fornecedor_normalizado: string
          id: string
          subcategoria: string | null
          unidade_id: string
          updated_at: string
          user_id: string
          vezes_usado: number
        }
        Insert: {
          aprendido_automaticamente?: boolean
          categoria: string
          created_at?: string
          fornecedor_nome_original: string
          fornecedor_normalizado: string
          id?: string
          subcategoria?: string | null
          unidade_id: string
          updated_at?: string
          user_id?: string
          vezes_usado?: number
        }
        Update: {
          aprendido_automaticamente?: boolean
          categoria?: string
          created_at?: string
          fornecedor_nome_original?: string
          fornecedor_normalizado?: string
          id?: string
          subcategoria?: string | null
          unidade_id?: string
          updated_at?: string
          user_id?: string
          vezes_usado?: number
        }
        Relationships: []
      }
      historico_precos_insumos: {
        Row: {
          created_at: string
          created_by: string
          id: string
          insumo_id: string | null
          nome_insumo: string
          preco_anterior: number
          preco_novo: number
          source: string
          unidade_id: string | null
          user_id: string | null
          variacao_percentual: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          insumo_id?: string | null
          nome_insumo: string
          preco_anterior?: number
          preco_novo?: number
          source?: string
          unidade_id?: string | null
          user_id?: string | null
          variacao_percentual?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          insumo_id?: string | null
          nome_insumo?: string
          preco_anterior?: number
          preco_novo?: number
          source?: string
          unidade_id?: string | null
          user_id?: string | null
          variacao_percentual?: number
        }
        Relationships: []
      }
      insumo_canonicos: {
        Row: {
          aliases: string[] | null
          categoria: string | null
          created_at: string | null
          id: string
          nome_canonico: string
          nome_display: string
          unidade_id: string | null
          user_id: string | null
        }
        Insert: {
          aliases?: string[] | null
          categoria?: string | null
          created_at?: string | null
          id?: string
          nome_canonico: string
          nome_display: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Update: {
          aliases?: string[] | null
          categoria?: string | null
          created_at?: string | null
          id?: string
          nome_canonico?: string
          nome_display?: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      insumos_catalog: {
        Row: {
          aliases: string[]
          aprendido_por_ia: boolean | null
          categoria: string | null
          confianca: number | null
          corrigido_por_humano: boolean | null
          created_at: string
          id: string
          nome_canonico: string
          nome_normalizado: string | null
          palavras_chave: string[] | null
          subcategoria: string | null
          unidade_medida_padrao: string | null
          unidade_padrao: string | null
        }
        Insert: {
          aliases?: string[]
          aprendido_por_ia?: boolean | null
          categoria?: string | null
          confianca?: number | null
          corrigido_por_humano?: boolean | null
          created_at?: string
          id?: string
          nome_canonico: string
          nome_normalizado?: string | null
          palavras_chave?: string[] | null
          subcategoria?: string | null
          unidade_medida_padrao?: string | null
          unidade_padrao?: string | null
        }
        Update: {
          aliases?: string[]
          aprendido_por_ia?: boolean | null
          categoria?: string | null
          confianca?: number | null
          corrigido_por_humano?: boolean | null
          created_at?: string
          id?: string
          nome_canonico?: string
          nome_normalizado?: string | null
          palavras_chave?: string[] | null
          subcategoria?: string | null
          unidade_medida_padrao?: string | null
          unidade_padrao?: string | null
        }
        Relationships: []
      }
      insumos_comprados: {
        Row: {
          categoria: string
          codigo: string | null
          created_at: string | null
          data_compra: string | null
          fornecedor: string | null
          id: string
          insumo_catalog_id: string | null
          nome: string
          nome_canonico: string | null
          preco_maximo: number | null
          preco_medio: number | null
          preco_minimo: number | null
          preco_pago: number
          quantidade: number
          total_compras: number | null
          unidade: string
          unidade_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          categoria: string
          codigo?: string | null
          created_at?: string | null
          data_compra?: string | null
          fornecedor?: string | null
          id?: string
          insumo_catalog_id?: string | null
          nome: string
          nome_canonico?: string | null
          preco_maximo?: number | null
          preco_medio?: number | null
          preco_minimo?: number | null
          preco_pago: number
          quantidade: number
          total_compras?: number | null
          unidade: string
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          categoria?: string
          codigo?: string | null
          created_at?: string | null
          data_compra?: string | null
          fornecedor?: string | null
          id?: string
          insumo_catalog_id?: string | null
          nome?: string
          nome_canonico?: string | null
          preco_maximo?: number | null
          preco_medio?: number | null
          preco_minimo?: number | null
          preco_pago?: number
          quantidade?: number
          total_compras?: number | null
          unidade?: string
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_comprados_insumo_catalog_id_fkey"
            columns: ["insumo_catalog_id"]
            isOneToOne: false
            referencedRelation: "insumos_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_comprados_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_compras_historico: {
        Row: {
          confianca_classificacao: number | null
          created_at: string | null
          data_compra: string
          destino: string
          fornecedor: string | null
          id: string
          insumo_id: string
          motivo_revisao: string | null
          nome_original: string
          nota_fiscal_id: string | null
          origem: string
          preco_total: number | null
          preco_unitario: number
          quantidade: number
          regra_aplicada_id: string | null
          unidade_id: string
          unidade_medida: string
          user_id: string
        }
        Insert: {
          confianca_classificacao?: number | null
          created_at?: string | null
          data_compra?: string
          destino?: string
          fornecedor?: string | null
          id?: string
          insumo_id: string
          motivo_revisao?: string | null
          nome_original: string
          nota_fiscal_id?: string | null
          origem?: string
          preco_total?: number | null
          preco_unitario: number
          quantidade: number
          regra_aplicada_id?: string | null
          unidade_id: string
          unidade_medida: string
          user_id: string
        }
        Update: {
          confianca_classificacao?: number | null
          created_at?: string | null
          data_compra?: string
          destino?: string
          fornecedor?: string | null
          id?: string
          insumo_id?: string
          motivo_revisao?: string | null
          nome_original?: string
          nota_fiscal_id?: string | null
          origem?: string
          preco_total?: number | null
          preco_unitario?: number
          quantidade?: number
          regra_aplicada_id?: string | null
          unidade_id?: string
          unidade_medida?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_historico_insumo"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_insumo"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_proprios: {
        Row: {
          created_at: string | null
          custo_kg: number | null
          custo_total: number | null
          id: string
          nome: string
          rendimento: number
          unidade_id: string | null
          unidade_rendimento: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          custo_kg?: number | null
          custo_total?: number | null
          id?: string
          nome: string
          rendimento: number
          unidade_id?: string | null
          unidade_rendimento: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          custo_kg?: number | null
          custo_total?: number | null
          id?: string
          nome?: string
          rendimento?: number
          unidade_id?: string | null
          unidade_rendimento?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_proprios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_proprios_ingredientes: {
        Row: {
          id: string
          insumo_comprado_id: string | null
          insumo_proprio_id: string | null
          nome_original: string | null
          quantidade: number
          unidade: string
          unidade_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          nome_original?: string | null
          quantidade: number
          unidade: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          nome_original?: string | null
          quantidade?: number
          unidade?: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_proprios_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_proprios_ingredientes_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: false
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_proprios_ingredientes_insumo_proprio_id_fkey"
            columns: ["insumo_proprio_id"]
            isOneToOne: false
            referencedRelation: "insumos_proprios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_proprios_ingredientes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          categoria: string
          classificacao_origem: string | null
          confianca_classificacao: number | null
          conta_pagar_id: string | null
          created_at: string
          data_lancamento: string
          descricao: string
          id: string
          nota_fiscal_id: string | null
          pago: boolean
          subcategoria: string | null
          tipo: string
          unidade_id: string | null
          updated_at: string
          user_id: string | null
          valor: number
        }
        Insert: {
          categoria: string
          classificacao_origem?: string | null
          confianca_classificacao?: number | null
          conta_pagar_id?: string | null
          created_at?: string
          data_lancamento?: string
          descricao: string
          id?: string
          nota_fiscal_id?: string | null
          pago?: boolean
          subcategoria?: string | null
          tipo: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
          valor?: number
        }
        Update: {
          categoria?: string
          classificacao_origem?: string | null
          confianca_classificacao?: number | null
          conta_pagar_id?: string | null
          created_at?: string
          data_lancamento?: string
          descricao?: string
          id?: string
          nota_fiscal_id?: string | null
          pago?: boolean
          subcategoria?: string | null
          tipo?: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_a_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_financeiras: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_cmv_pct: number
          meta_faturamento: number
          unidade_id: string | null
          user_id: string | null
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_cmv_pct?: number
          meta_faturamento?: number
          unidade_id?: string | null
          user_id?: string | null
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_cmv_pct?: number
          meta_faturamento?: number
          unidade_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_financeiras_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          categoria: string | null
          chave_acesso: string | null
          cnpj_fornecedor: string | null
          created_at: string
          data_emissao: string
          data_recebimento: string
          documento_hash: string | null
          fornecedor: string
          id: string
          numero_nf: string | null
          observacoes: string | null
          origem: string
          serie_nf: string | null
          subcategoria: string | null
          total_parcelas: number
          unidade_id: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          categoria?: string | null
          chave_acesso?: string | null
          cnpj_fornecedor?: string | null
          created_at?: string
          data_emissao: string
          data_recebimento?: string
          documento_hash?: string | null
          fornecedor: string
          id?: string
          numero_nf?: string | null
          observacoes?: string | null
          origem?: string
          serie_nf?: string | null
          subcategoria?: string | null
          total_parcelas?: number
          unidade_id: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Update: {
          categoria?: string | null
          chave_acesso?: string | null
          cnpj_fornecedor?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string
          documento_hash?: string | null
          fornecedor?: string
          id?: string
          numero_nf?: string | null
          observacoes?: string | null
          origem?: string
          serie_nf?: string | null
          subcategoria?: string | null
          total_parcelas?: number
          unidade_id?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: []
      }
      notas_fiscais_pendentes: {
        Row: {
          confianca_media: number | null
          created_at: string | null
          data_emissao: string | null
          fornecedor: string | null
          id: string
          items_classificados: Json | null
          items_raw: Json
          motivo: string[] | null
          nota_fiscal_id: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: Database["public"]["Enums"]["status_pendente"] | null
          unidade_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confianca_media?: number | null
          created_at?: string | null
          data_emissao?: string | null
          fornecedor?: string | null
          id?: string
          items_classificados?: Json | null
          items_raw: Json
          motivo?: string[] | null
          nota_fiscal_id?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: Database["public"]["Enums"]["status_pendente"] | null
          unidade_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confianca_media?: number | null
          created_at?: string | null
          data_emissao?: string | null
          fornecedor?: string | null
          id?: string
          items_classificados?: Json | null
          items_raw?: Json
          motivo?: string[] | null
          nota_fiscal_id?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: Database["public"]["Enums"]["status_pendente"] | null
          unidade_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      precificacao_bebidas: {
        Row: {
          created_at: string
          id: string
          insumo_comprado_id: string
          preco_venda: number
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_comprado_id: string
          preco_venda?: number
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insumo_comprado_id?: string
          preco_venda?: number
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precificacao_bebidas_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: true
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precificacao_bebidas_insumo_comprado_id_fkey"
            columns: ["insumo_comprado_id"]
            isOneToOne: true
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precificacao_bebidas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      precificacao_produtos: {
        Row: {
          created_at: string
          ficha_id: string
          id: string
          preco_venda: number
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          ficha_id: string
          id?: string
          preco_venda?: number
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          ficha_id?: string
          id?: string
          preco_venda?: number
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precificacao_produtos_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: true
            referencedRelation: "fichas_tecnicas_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precificacao_produtos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      processamento_mensagens: {
        Row: {
          created_at: string | null
          id: number
          remote_jid: string | null
          status: string | null
          whatsapp_msg_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          remote_jid?: string | null
          status?: string | null
          whatsapp_msg_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          remote_jid?: string | null
          status?: string | null
          whatsapp_msg_id?: string
        }
        Relationships: []
      }
      processing_logs: {
        Row: {
          created_at: string | null
          detail: Json | null
          duration_ms: number | null
          id: number
          msg_id: string | null
          node_name: string
          remote_jid: string | null
          status: string
          unidade_id: string | null
          user_id: string | null
          workflow_name: string
        }
        Insert: {
          created_at?: string | null
          detail?: Json | null
          duration_ms?: number | null
          id?: number
          msg_id?: string | null
          node_name: string
          remote_jid?: string | null
          status: string
          unidade_id?: string | null
          user_id?: string | null
          workflow_name: string
        }
        Update: {
          created_at?: string | null
          detail?: Json | null
          duration_ms?: number | null
          id?: number
          msg_id?: string | null
          node_name?: string
          remote_jid?: string | null
          status?: string
          unidade_id?: string | null
          user_id?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promocoes: {
        Row: {
          categoria_alvo: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          desconto_aplicado: number | null
          dias_semana: string[] | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          lucro_real_pct: number | null
          lucro_real_rs: number | null
          margem_minima_aceitavel: number | null
          nome: string
          preco_final_promocional: number | null
          produto_ids: string[] | null
          regra_descricao: string | null
          status: string | null
          tipo: string
          unidade_id: string | null
          updated_at: string | null
          user_id: string | null
          valor_original: number | null
        }
        Insert: {
          categoria_alvo?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          desconto_aplicado?: number | null
          dias_semana?: string[] | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          lucro_real_pct?: number | null
          lucro_real_rs?: number | null
          margem_minima_aceitavel?: number | null
          nome: string
          preco_final_promocional?: number | null
          produto_ids?: string[] | null
          regra_descricao?: string | null
          status?: string | null
          tipo: string
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor_original?: number | null
        }
        Update: {
          categoria_alvo?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          desconto_aplicado?: number | null
          dias_semana?: string[] | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          lucro_real_pct?: number | null
          lucro_real_rs?: number | null
          margem_minima_aceitavel?: number | null
          nome?: string
          preco_final_promocional?: number | null
          produto_ids?: string[] | null
          regra_descricao?: string | null
          status?: string | null
          tipo?: string
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: number
          identifier: string
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: number
          identifier: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: number
          identifier?: string
        }
        Relationships: []
      }
      regras_classificacao: {
        Row: {
          aprovada: boolean
          categoria: string | null
          chave_normalizada: string
          confianca: number
          created_at: string
          criado_por: string
          destino: string
          escopo: string
          fornecedor_original: string | null
          id: string
          item_original: string | null
          subcategoria: string | null
          unidade_id: string
          updated_at: string
          user_id: string
          vezes_aplicada: number
        }
        Insert: {
          aprovada?: boolean
          categoria?: string | null
          chave_normalizada: string
          confianca?: number
          created_at?: string
          criado_por?: string
          destino: string
          escopo: string
          fornecedor_original?: string | null
          id?: string
          item_original?: string | null
          subcategoria?: string | null
          unidade_id: string
          updated_at?: string
          user_id?: string
          vezes_aplicada?: number
        }
        Update: {
          aprovada?: boolean
          categoria?: string | null
          chave_normalizada?: string
          confianca?: number
          created_at?: string
          criado_por?: string
          destino?: string
          escopo?: string
          fornecedor_original?: string | null
          id?: string
          item_original?: string | null
          subcategoria?: string | null
          unidade_id?: string
          updated_at?: string
          user_id?: string
          vezes_aplicada?: number
        }
        Relationships: []
      }
      retry_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_type: string | null
          id: string
          max_retries: number | null
          payload: Json
          retry_at: string
          retry_count: number | null
          status: string | null
          unidade_id: string | null
          updated_at: string | null
          user_id: string | null
          workflow_name: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          max_retries?: number | null
          payload: Json
          retry_at: string
          retry_count?: number | null
          status?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          workflow_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          max_retries?: number | null
          payload?: Json
          retry_at?: string
          retry_count?: number | null
          status?: string | null
          unidade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
      unidade_membros: {
        Row: {
          created_at: string
          id: string
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unidade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unidade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidade_membros_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          ativo: boolean
          cidade: string | null
          created_at: string
          created_by: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          created_by?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          created_by?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          unidade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unidade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_users: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome_amigavel: string | null
          numero_whatsapp: string
          unidade_id_padrao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_amigavel?: string | null
          numero_whatsapp: string
          unidade_id_padrao: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_amigavel?: string | null
          numero_whatsapp?: string
          unidade_id_padrao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          alertas_criados: number
          duration_ms: number | null
          fichas_com_erro: Json
          fichas_processadas: number
          finished_at: string | null
          id: string
          metadata: Json
          started_at: string
          status: string
          trigger_record_id: string | null
          trigger_source: string
          unidade_id: string | null
          workflow_name: string
        }
        Insert: {
          alertas_criados?: number
          duration_ms?: number | null
          fichas_com_erro?: Json
          fichas_processadas?: number
          finished_at?: string | null
          id?: string
          metadata?: Json
          started_at?: string
          status: string
          trigger_record_id?: string | null
          trigger_source: string
          unidade_id?: string | null
          workflow_name: string
        }
        Update: {
          alertas_criados?: number
          duration_ms?: number | null
          fichas_com_erro?: Json
          fichas_processadas?: number
          finished_at?: string | null
          id?: string
          metadata?: Json
          started_at?: string
          status?: string
          trigger_record_id?: string | null
          trigger_source?: string
          unidade_id?: string | null
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      processing_errors_24h: {
        Row: {
          erros_recentes: Json | null
          node_name: string | null
          status: string | null
          total: number | null
          ultimo_erro: string | null
          workflow_name: string | null
        }
        Relationships: []
      }
      processing_health_24h: {
        Row: {
          avg_duration_ms: number | null
          error_count: number | null
          last_activity: string | null
          retry_count: number | null
          success_count: number | null
          success_rate_pct: number | null
          workflow_name: string | null
        }
        Relationships: []
      }
      v_resumo_contas_pagar: {
        Row: {
          qtd_atrasadas: number | null
          qtd_em_aberto: number | null
          qtd_pendentes: number | null
          qtd_proximas_7d: number | null
          total_a_pagar: number | null
          total_atrasado: number | null
          total_pago_mes: number | null
          unidade_id: string | null
        }
        Relationships: []
      }
      v_resumo_financeiro: {
        Row: {
          categoria: string | null
          mes: string | null
          subcategoria: string | null
          tipo: string | null
          total: number | null
          transacoes: number | null
          unidade_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_historico_compras_completo: {
        Row: {
          cnpj_fornecedor: string | null
          confianca_classificacao: number | null
          created_at: string | null
          data_compra: string | null
          destino: string | null
          fornecedor: string | null
          id: string | null
          insumo_canonico_nome: string | null
          insumo_categoria: string | null
          insumo_id: string | null
          nome_original: string | null
          nota_fiscal_id: string | null
          numero_nf: string | null
          origem: string | null
          preco_total: number | null
          preco_unitario: number | null
          quantidade: number | null
          regra_aplicada_id: string | null
          unidade_id: string | null
          unidade_medida: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_historico_insumo"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_insumo"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_insumos_canonicos: {
        Row: {
          categoria: string | null
          created_at: string | null
          id: string | null
          nome: string | null
          nome_canonico: string | null
          preco_anterior: number | null
          preco_atual: number | null
          preco_maximo: number | null
          preco_medio: number | null
          preco_minimo: number | null
          quantidade: number | null
          total_compras: number | null
          ultima_compra: string | null
          ultimo_fornecedor: string | null
          unidade: string | null
          unidade_id: string | null
          updated_at: string | null
          usado_em_fichas: number | null
          user_id: string | null
          variacao_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_comprados_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_revisar_classificacoes: {
        Row: {
          categoria_atual: string | null
          confianca_classificacao: number | null
          data_compra: string | null
          destino: string | null
          fonte: string | null
          fornecedor: string | null
          id: string | null
          insumo_id: string | null
          nome_original: string | null
          nota_fiscal_id: string | null
          origem: string | null
          preco_total: number | null
          preco_unitario: number | null
          quantidade: number | null
          unidade_id: string | null
          unidade_medida: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_historico_insumo"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos_comprados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_historico_insumo"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "vw_insumos_canonicos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_alias_to_catalog: {
        Args: { p_alias: string; p_nome_normalizado: string }
        Returns: undefined
      }
      aplicar_base_em_ficha: {
        Args: { p_base_id: string; p_ficha_id: string; p_tipo_ficha: string }
        Returns: number
      }
      aprovar_classificacao_item: {
        Args: {
          p_categoria?: string
          p_criar_regra?: boolean
          p_destino: string
          p_escopo_regra?: string
          p_historico_id: string
          p_subcategoria?: string
        }
        Returns: Json
      }
      atualizar_contas_atrasadas: { Args: never; Returns: number }
      auditar_rendimentos_suspeitos: {
        Args: never
        Returns: {
          created_at: string
          id: string
          nome: string
          rendimento: number
          unidade_id: string
          unidade_rendimento: string
        }[]
      }
      avaliar_nf_pendente: {
        Args: { p_confianca_media: number; p_items_classificados: Json }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      classificar_e_upsert_insumo: {
        Args: {
          p_fornecedor: string
          p_nome_original: string
          p_nota_fiscal_id?: string
          p_preco_total: number
          p_preco_unitario: number
          p_quantidade: number
          p_unidade_id: string
          p_unidade_medida: string
          p_user_id: string
        }
        Returns: {
          confianca: number
          insumo_id: string
          is_new: boolean
          nome_canonico: string
        }[]
      }
      classificar_insumo: {
        Args: { p_nome: string; p_unidade_id?: string }
        Returns: string
      }
      classificar_por_palavra_chave: {
        Args: { texto_input: string }
        Returns: {
          categoria: string
          emoji: string
          match_score: number
          subcategoria: string
          tipo: string
        }[]
      }
      cleanup_rate_limit_log: { Args: never; Returns: undefined }
      enqueue_retry: {
        Args: {
          p_delay_minutes?: number
          p_error_message: string
          p_error_type?: string
          p_payload: Json
          p_unidade_id?: string
          p_user_id?: string
          p_workflow_name: string
        }
        Returns: string
      }
      extrair_fornecedor_da_descricao: {
        Args: { p_descricao: string }
        Returns: string
      }
      get_user_unidades: {
        Args: { _user_id: string }
        Returns: {
          ativo: boolean
          cidade: string
          estado: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          unidade_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _unidade_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_of_unidade: {
        Args: { _unidade_id: string; _user_id: string }
        Returns: boolean
      }
      is_member_of_unidade: {
        Args: { _unidade_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_fornecedor_cache: {
        Args: { p_min_confianca?: number; p_nome: string }
        Returns: {
          cached: boolean
          categoria: string
          confianca: number
          subcategoria: string
        }[]
      }
      map_categoria_insumo_subcategoria: {
        Args: { p_cat: string }
        Returns: string
      }
      marcar_conta_paga: {
        Args: {
          p_conta_id: string
          p_data_pagamento?: string
          p_forma_pagamento?: string
          p_valor_pago?: number
        }
        Returns: Json
      }
      match_insumo_fuzzy: {
        Args: {
          p_nome_ingrediente: string
          p_similarity_threshold?: number
          p_unidade_id: string
          p_user_id: string
        }
        Returns: {
          insumo_id: string
          nome_match: string
          similarity_score: number
        }[]
      }
      normalizar_nome_fornecedor: { Args: { p_nome: string }; Returns: string }
      normalizar_nome_insumo: { Args: { nome: string }; Returns: string }
      pode_editar_negocio: {
        Args: { _unidade_id: string; _user_id: string }
        Returns: boolean
      }
      primeira_unidade_do_user: { Args: { _user_id: string }; Returns: string }
      recalcular_custo_insumo_proprio: {
        Args: { p_insumo_proprio_id: string }
        Returns: number
      }
      resolve_insumo_ingrediente: {
        Args: {
          p_nome_ingrediente: string
          p_unidade_id: string
          p_user_id: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
      validar_ficha_pizza_completa: {
        Args: { p_ficha_id: string }
        Returns: boolean
      }
      varredura_fichas_incompletas: {
        Args: never
        Returns: {
          out_ficha_id: string
          out_motivo: string
          out_nome: string
          out_tipo: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "caixa"
      status_pendente: "aguardando_revisao" | "aprovada" | "rejeitada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "caixa"],
      status_pendente: ["aguardando_revisao", "aprovada", "rejeitada"],
    },
  },
} as const
