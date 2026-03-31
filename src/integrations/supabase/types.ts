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
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      configuracoes_negocio: {
        Row: {
          aluguel: number
          contador: number
          created_at: string
          energia: number
          faturamento_medio: number
          id: string
          internet: number
          nome_estabelecimento: string
          num_funcionarios: number
          onboarding_completo: boolean
          outros_fixos: number
          pct_credito: number
          pct_debito: number
          pct_dinheiro_pix: number
          pct_ifood: number
          salarios: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aluguel?: number
          contador?: number
          created_at?: string
          energia?: number
          faturamento_medio?: number
          id?: string
          internet?: number
          nome_estabelecimento?: string
          num_funcionarios?: number
          onboarding_completo?: boolean
          outros_fixos?: number
          pct_credito?: number
          pct_debito?: number
          pct_dinheiro_pix?: number
          pct_ifood?: number
          salarios?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aluguel?: number
          contador?: number
          created_at?: string
          energia?: number
          faturamento_medio?: number
          id?: string
          internet?: number
          nome_estabelecimento?: string
          num_funcionarios?: number
          onboarding_completo?: boolean
          outros_fixos?: number
          pct_credito?: number
          pct_debito?: number
          pct_dinheiro_pix?: number
          pct_ifood?: number
          salarios?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      configuracoes_precificacao: {
        Row: {
          app_aiqfome_ativo: boolean
          app_ifood_ativo: boolean
          app_rappi_ativo: boolean
          cmv_meta_pct: number
          created_at: string
          custos_fixos_pct: number
          id: string
          taxa_aiqfome_pct: number
          taxa_credito_pct: number
          taxa_debito_pct: number
          taxa_ifood_pct: number
          taxa_pix_pct: number
          taxa_rappi_pct: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_aiqfome_ativo?: boolean
          app_ifood_ativo?: boolean
          app_rappi_ativo?: boolean
          cmv_meta_pct?: number
          created_at?: string
          custos_fixos_pct?: number
          id?: string
          taxa_aiqfome_pct?: number
          taxa_credito_pct?: number
          taxa_debito_pct?: number
          taxa_ifood_pct?: number
          taxa_pix_pct?: number
          taxa_rappi_pct?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_aiqfome_ativo?: boolean
          app_ifood_ativo?: boolean
          app_rappi_ativo?: boolean
          cmv_meta_pct?: number
          created_at?: string
          custos_fixos_pct?: number
          id?: string
          taxa_aiqfome_pct?: number
          taxa_credito_pct?: number
          taxa_debito_pct?: number
          taxa_ifood_pct?: number
          taxa_pix_pct?: number
          taxa_rappi_pct?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      configuracoes_preco: {
        Row: {
          comissao_marketplace: number | null
          created_at: string | null
          custos_fixos: number | null
          id: string
          impostos: number | null
          margem_desejada: number | null
          outros_custos_variaveis: number | null
          updated_at: string | null
        }
        Insert: {
          comissao_marketplace?: number | null
          created_at?: string | null
          custos_fixos?: number | null
          id?: string
          impostos?: number | null
          margem_desejada?: number | null
          outros_custos_variaveis?: number | null
          updated_at?: string | null
        }
        Update: {
          comissao_marketplace?: number | null
          created_at?: string | null
          custos_fixos?: number | null
          id?: string
          impostos?: number | null
          margem_desejada?: number | null
          outros_custos_variaveis?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fichas_tecnicas_pizza: {
        Row: {
          created_at: string | null
          id: string
          modo_preparo: string | null
          nome: string
          numero_ficha: string | null
          preco_venda_g: number | null
          preco_venda_m: number | null
          preco_venda_p: number | null
          tipo: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          modo_preparo?: string | null
          nome: string
          numero_ficha?: string | null
          preco_venda_g?: number | null
          preco_venda_m?: number | null
          preco_venda_p?: number | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          modo_preparo?: string | null
          nome?: string
          numero_ficha?: string | null
          preco_venda_g?: number | null
          preco_venda_m?: number | null
          preco_venda_p?: number | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
        ]
      }
      fichas_tecnicas_produtos: {
        Row: {
          categoria: string
          created_at: string
          id: string
          modo_preparo: string | null
          nome: string
          numero_ficha: string | null
          preco_venda: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          modo_preparo?: string | null
          nome: string
          numero_ficha?: string | null
          preco_venda?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          modo_preparo?: string | null
          nome?: string
          numero_ficha?: string | null
          preco_venda?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
        ]
      }
      insumos_comprados: {
        Row: {
          categoria: string
          codigo: string | null
          created_at: string | null
          data_compra: string | null
          fornecedor: string | null
          id: string
          nome: string
          preco_pago: number
          quantidade: number
          unidade: string
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
          nome: string
          preco_pago: number
          quantidade: number
          unidade: string
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
          nome?: string
          preco_pago?: number
          quantidade?: number
          unidade?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      insumos_proprios: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          rendimento: number
          unidade_rendimento: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          rendimento: number
          unidade_rendimento: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          rendimento?: number
          unidade_rendimento?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      insumos_proprios_ingredientes: {
        Row: {
          id: string
          insumo_comprado_id: string | null
          insumo_proprio_id: string | null
          quantidade: number
          unidade: string
          user_id: string | null
        }
        Insert: {
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          quantidade: number
          unidade: string
          user_id?: string | null
        }
        Update: {
          id?: string
          insumo_comprado_id?: string | null
          insumo_proprio_id?: string | null
          quantidade?: number
          unidade?: string
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
          updated_at?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: []
      }
      metas_financeiras: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_cmv_pct: number
          meta_faturamento: number
          user_id: string | null
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_cmv_pct?: number
          meta_faturamento?: number
          user_id?: string | null
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_cmv_pct?: number
          meta_faturamento?: number
          user_id?: string | null
        }
        Relationships: []
      }
      precificacao_bebidas: {
        Row: {
          created_at: string
          id: string
          insumo_comprado_id: string
          preco_venda: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_comprado_id: string
          preco_venda?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insumo_comprado_id?: string
          preco_venda?: number
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
        ]
      }
      precificacao_produtos: {
        Row: {
          created_at: string
          ficha_id: string
          id: string
          preco_venda: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          ficha_id: string
          id?: string
          preco_venda?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          ficha_id?: string
          id?: string
          preco_venda?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "precificacao_produtos_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: true
            referencedRelation: "fichas_tecnicas_produtos"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
