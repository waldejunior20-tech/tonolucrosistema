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
      insumos_catalog: {
        Row: {
          aliases: string[]
          categoria: string | null
          created_at: string
          id: string
          nome_canonico: string
          unidade_padrao: string | null
        }
        Insert: {
          aliases?: string[]
          categoria?: string | null
          created_at?: string
          id?: string
          nome_canonico: string
          unidade_padrao?: string | null
        }
        Update: {
          aliases?: string[]
          categoria?: string | null
          created_at?: string
          id?: string
          nome_canonico?: string
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
          preco_pago: number
          quantidade: number
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
          preco_pago: number
          quantidade: number
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
          preco_pago?: number
          quantidade?: number
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
      insumos_proprios: {
        Row: {
          created_at: string | null
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
          quantidade: number
          unidade: string
          unidade_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          quantidade: number
          unidade: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
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
          created_at: string
          data_lancamento: string
          descricao: string
          id: string
          pago: boolean
          tipo: string
          unidade_id: string | null
          updated_at: string
          user_id: string | null
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data_lancamento?: string
          descricao: string
          id?: string
          pago?: boolean
          tipo: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_lancamento?: string
          descricao?: string
          id?: string
          pago?: boolean
          tipo?: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
          valor?: number
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
      [_ in never]: never
    }
    Functions: {
      aplicar_base_em_ficha: {
        Args: { p_base_id: string; p_ficha_id: string; p_tipo_ficha: string }
        Returns: number
      }
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
      pode_editar_negocio: {
        Args: { _unidade_id: string; _user_id: string }
        Returns: boolean
      }
      primeira_unidade_do_user: { Args: { _user_id: string }; Returns: string }
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
    },
  },
} as const
