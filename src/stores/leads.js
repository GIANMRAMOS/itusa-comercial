import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import {
  computeKPIs,
  computeSourceRanking,
  computeMonthlyEvolution,
  computeLast30Days,
  flattenLatestSeguimientos,
} from '@/lib/leadMetrics'

// Store de leads: mantiene el estado de leads (con sus seguimientos anidados) y
// delega todo cálculo de métricas a src/lib/leadMetrics.js.
export const useLeadsStore = defineStore('leads', {
  state: () => ({
    leads: [],
    leadsArchivados: [],
    loading: false,
    error: null,
  }),

  getters: {
    kpis: (state) => computeKPIs(state.leads),
    sourceRanking: (state) => computeSourceRanking(state.leads),
    monthlyEvolution: (state) => computeMonthlyEvolution(state.leads),
    last30Days: (state) => computeLast30Days(state.leads),
    // Límite elevado (100) para que el preset "Todo" del filtro de fecha en
    // LatestSeguimientos.vue tenga historial real sobre el cual operar; el
    // recorte efectivo de la lista lo hace el filtro de fecha del componente.
    latestSeguimientos: (state) => flattenLatestSeguimientos(state.leads, 100),
  },

  actions: {
    async fetchLeads() {
      this.loading = true
      this.error = null
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*, seguimientos(*)')
          .eq('archivado', false)
          .order('created_at', { ascending: false })

        if (error) {
          this.error = error.message
          return
        }
        this.leads = data ?? []
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchLeadsArchivados() {
      this.loading = true
      this.error = null
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*, seguimientos(*)')
          .eq('archivado', true)
          .order('created_at', { ascending: false })

        if (error) {
          this.error = error.message
          return
        }
        this.leadsArchivados = data ?? []
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async createLead(datosLead) {
      this.error = null
      try {
        const { data, error } = await supabase.from('leads').insert(datosLead).select('*, seguimientos(*)').single()
        if (error) {
          this.error = error.message
          return { success: false, error: error.message }
        }
        this.leads.unshift(data)
        return { success: true, data }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }
    },

    async updateLead(leadId, datosLead) {
      this.error = null
      try {
        const { data, error } = await supabase
          .from('leads')
          .update(datosLead)
          .eq('id', leadId)
          .select('*, seguimientos(*)')
          .single()
        if (error) {
          this.error = error.message
          return { success: false, error: error.message }
        }
        const indice = this.leads.findIndex((lead) => lead.id === leadId)
        if (indice !== -1) {
          this.leads[indice] = data
        }
        return { success: true, data }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }
    },

    async deleteLead(leadId) {
      this.error = null
      try {
        const { error } = await supabase.from('leads').delete().eq('id', leadId)
        if (error) {
          this.error = error.message
          return { success: false, error: error.message }
        }
        this.leads = this.leads.filter((lead) => lead.id !== leadId)
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }
    },

    async archivarLead(leadId) {
      this.error = null
      try {
        const { error } = await supabase.from('leads').update({ archivado: true }).eq('id', leadId)
        if (error) {
          this.error = error.message
          return { success: false, error: error.message }
        }
        this.leads = this.leads.filter((lead) => lead.id !== leadId)
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }
    },

    async reactivarLead(leadId) {
      this.error = null
      try {
        const { error } = await supabase.from('leads').update({ archivado: false }).eq('id', leadId)
        if (error) {
          this.error = error.message
          return { success: false, error: error.message }
        }
        this.leadsArchivados = this.leadsArchivados.filter((lead) => lead.id !== leadId)
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }
    },

    async addSeguimiento(leadId, datosSeguimiento) {
      this.error = null
      try {
        const { data, error } = await supabase
          .from('seguimientos')
          .insert({ ...datosSeguimiento, lead_id: leadId })
          .select()
          .single()
        if (error) {
          this.error = error.message
          return { success: false, error: error.message }
        }
        const lead = this.leads.find((lead) => lead.id === leadId)
        if (lead) {
          if (!Array.isArray(lead.seguimientos)) lead.seguimientos = []
          lead.seguimientos.push(data)
        }
        return { success: true, data }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }
    },

    async updateSeguimiento(seguimientoId, leadId, datosSeguimiento) {
      this.error = null
      try {
        const { data, error } = await supabase
          .from('seguimientos')
          .update(datosSeguimiento)
          .eq('id', seguimientoId)
          .select()
          .single()
        if (error) {
          this.error = error.message
          return { success: false, error: error.message }
        }
        const lead = this.leads.find((lead) => lead.id === leadId)
        if (lead && Array.isArray(lead.seguimientos)) {
          const indice = lead.seguimientos.findIndex((s) => s.id === seguimientoId)
          if (indice !== -1) {
            lead.seguimientos[indice] = data
          }
        }
        return { success: true, data }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }
    },

    async deleteSeguimiento(seguimientoId, leadId) {
      this.error = null
      try {
        const { error } = await supabase.from('seguimientos').delete().eq('id', seguimientoId)
        if (error) {
          this.error = error.message
          return { success: false, error: error.message }
        }
        const lead = this.leads.find((lead) => lead.id === leadId)
        if (lead && Array.isArray(lead.seguimientos)) {
          lead.seguimientos = lead.seguimientos.filter((seguimiento) => seguimiento.id !== seguimientoId)
        }
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }
    },
  },
})
