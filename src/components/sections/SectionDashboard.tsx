'use client'

// SectionDashboard — v2
// Changements vs v1 :
//  ✓ Lit les KPIs depuis la table kpis_projet (plus de recalcul local)
//  ✓ Lit les colonnes v2 de resultats_financiers (total_opex, caf, etc.)
//  ✓ TRI affiché en % (valeur décimale DB × 100)
//  ✓ Payback fractionnaire affiché proprement
//  ✓ Graphe enrichi : CA, EBITDA, Résultat net

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/superbase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import type { ResultatFinancier, KpisProjet } from '@/lib/superbase/types'
import { fmt, fmtM, fmtPct } from '@/lib/moteur_financier'

interface Props { projetId: string }

function paybackLabel(v: number): string {
    if (!v || !isFinite(v)) return '> durée projet'
    const ans   = Math.floor(v)
    const mois  = Math.round((v - ans) * 12)
    if (mois === 0) return `${ans} an${ans > 1 ? 's' : ''}`
    return `${ans} an${ans > 1 ? 's' : ''} ${mois} mois`
}

export default function SectionDashboard({ projetId }: Props) {
    const [resultats, setResultats] = useState<ResultatFinancier[]>([])
    const [kpis, setKpis]           = useState<KpisProjet | null>(null)
    const [loading, setLoading]     = useState(true)
    const [exportLoading, setExportLoading] = useState<'word' | 'pptx' | null>(null)
    const supabase = createClient()

    useEffect(() => { fetchData() }, [projetId])

    const fetchData = async () => {
        setLoading(true)
        const [{ data: res }, { data: k }] = await Promise.all([
            supabase.from('resultats_financiers').select('*').eq('projet_id', projetId).order('annee'),
            supabase.from('kpis_projet').select('*').eq('projet_id', projetId).single(),
        ])
        if (res) setResultats(res)
        if (k)   setKpis(k)
        setLoading(false)
    }

    const handleExport = async (type: 'word' | 'pptx') => {
        setExportLoading(type)
        try {
            const resp = await fetch(`/api/export/${type}?projetId=${projetId}`)
            if (!resp.ok) throw new Error('Erreur export')
            const blob = await resp.blob()
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = type === 'word'
                ? `BusinessModel_${new Date().toISOString().split('T')[0]}.docx`
                : `Synthese_${new Date().toISOString().split('T')[0]}.pptx`
            link.click()
            URL.revokeObjectURL(link.href)
        } catch (e) { console.error(e) }
        setExportLoading(null)
    }

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '80px', color: '#9CA3AF', fontSize: '14px' }}>
            Chargement du dashboard…
        </div>
    )

    if (!kpis || resultats.length === 0) return (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', margin: '0 0 8px' }}>
                Aucune donnée financière calculée
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
                Complétez les sections précédentes puis sauvegardez dans &quot;Prévisions financières&quot;.
            </p>
        </div>
    )

    const r1 = resultats[0]
    const rN = resultats[resultats.length - 1]

    // ── KPIs cards ──────────────────────────────────────────────
    const triPct   = (kpis.tri * 100).toFixed(1)
    const triColor = kpis.tri > 0.15 ? '#169B86' : kpis.tri > 0.05 ? '#F0A02B' : '#E24B4A'

    const kpiCards = [
        {
            label: 'TRI', value: `${triPct}%`, sub: 'Taux de rentabilité interne',
            color: triColor,
            badge: kpis.tri > 0.15 ? { txt: 'Excellent', bg: '#E1F5EE', c: '#0F6E56' }
                : kpis.tri > 0.05 ? { txt: 'Correct',   bg: '#FFF3DC', c: '#854F0B' }
                    :                   { txt: 'Faible',     bg: '#FEE2E2', c: '#991B1B' },
        },
        {
            label: 'VAN', value: fmtM(kpis.van), sub: 'FCFA — Valeur actuelle nette',
            color: kpis.van > 0 ? '#169B86' : '#E24B4A',
            badge: kpis.van > 0
                ? { txt: 'Positive', bg: '#E1F5EE', c: '#0F6E56' }
                : { txt: 'Négative', bg: '#FEE2E2', c: '#991B1B' },
        },
        {
            label: 'Délai de récupération', value: paybackLabel(kpis.payback_annees),
            sub: 'Payback sur la CAF', color: '#F0A02B',
        },
        {
            label: 'Marge brute An 1',
            value: fmtPct(kpis.marge_brute_moy),
            sub: `${fmt(r1.marge_brute)} FCFA`, color: '#0D2B55',
        },
        {
            label: 'Marge nette (fin projet)',
            value: r1.ca_total > 0 ? `${(rN.resultat_net / rN.ca_total * 100).toFixed(1)}%` : '—',
            sub: `An ${rN.annee}`,
            color: rN.resultat_net > 0 ? '#169B86' : '#E24B4A',
        },
        {
            label: 'Seuil de rentabilité',
            value: fmtM(kpis.seuil_rentabilite_ca),
            sub: 'CA min An 1', color: '#F0A02B',
        },
        {
            label: 'CA total projet',
            value: fmtM(resultats.reduce((s, r) => s + r.ca_total, 0)),
            sub: 'FCFA cumulé', color: '#0D2B55',
        },
        {
            label: 'Résultat net cumulé',
            value: fmtM(resultats.reduce((s, r) => s + r.resultat_net, 0)),
            sub: 'FCFA sur le projet',
            color: resultats.reduce((s, r) => s + r.resultat_net, 0) > 0 ? '#169B86' : '#E24B4A',
        },
    ]

    // ── Données graphe ───────────────────────────────────────────
    const chartData = resultats.map(r => ({
        annee:    String(r.annee),
        CA:       Math.round(r.ca_total / 1_000_000),
        EBITDA:   Math.round(r.ebitda   / 1_000_000),
        Résultat: Math.round(r.resultat_net / 1_000_000),
    }))

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        backgroundColor: '#F0A02B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>13</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                        KPIs &amp; Dashboard
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleExport('word')} disabled={exportLoading !== null}
                            style={{
                                padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                                color: '#185FA5', backgroundColor: '#E6F1FB',
                                border: '1px solid #185FA5', borderRadius: '10px',
                                cursor: exportLoading ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit', opacity: exportLoading ? 0.6 : 1,
                            }}>
                        {exportLoading === 'word' ? '⏳ Génération…' : '📄 Générer Word'}
                    </button>
                    <button onClick={() => handleExport('pptx')} disabled={exportLoading !== null}
                            style={{
                                padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                                color: '#854F0B', backgroundColor: '#FFF3DC',
                                border: '1px solid #F0A02B', borderRadius: '10px',
                                cursor: exportLoading ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit', opacity: exportLoading ? 0.6 : 1,
                            }}>
                        {exportLoading === 'pptx' ? '⏳ Génération…' : '📊 Présentation'}
                    </button>
                </div>
            </div>

            {/* KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {kpiCards.map(k => (
                    <div key={k.label} style={{
                        backgroundColor: '#F9FAFB', borderRadius: '12px',
                        border: '1px solid #E5E7EB', padding: '16px',
                        display: 'flex', flexDirection: 'column', gap: '4px',
                    }}>
                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>{k.label}</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: k.color, margin: 0, lineHeight: 1.1 }}>
                            {k.value}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>{k.sub}</p>
                            {k.badge && (
                                <span style={{
                                    fontSize: '10px', fontWeight: 700,
                                    padding: '1px 7px', borderRadius: '20px',
                                    color: k.badge.c, backgroundColor: k.badge.bg,
                                }}>
                  {k.badge.txt}
                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Graphe + synthèse */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '18px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>
                        Évolution CA, EBITDA &amp; Résultat net (M FCFA)
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} barGap={3}>
                            <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: any) => `${v} M FCFA`} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <ReferenceLine y={0} stroke="#E5E7EB" />
                            <Bar dataKey="CA"       fill="#169B86" radius={[4,4,0,0]} />
                            <Bar dataKey="EBITDA"   fill="#0D2B55" radius={[4,4,0,0]} />
                            <Bar dataKey="Résultat" fill="#F0A02B" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '18px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>
                        Synthèse financière
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                        <tr style={{ backgroundColor: '#E5E7EB' }}>
                            <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#374151' }}>Indicateur</th>
                            <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 500, color: '#374151' }}>An 1</th>
                            <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 500, color: '#374151' }}>An {resultats.length}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {[
                            { label: 'CA (M FCFA)',    an1: r1.ca_total,     aN: rN.ca_total },
                            { label: 'Marge brute',   an1: r1.ca_total > 0 ? r1.marge_brute/r1.ca_total*100 : 0, aN: rN.ca_total > 0 ? rN.marge_brute/rN.ca_total*100 : 0, pct: true },
                            { label: 'EBITDA',        an1: r1.ebitda,        aN: rN.ebitda    },
                            { label: 'Résultat net',  an1: r1.resultat_net,  aN: rN.resultat_net },
                            { label: 'CAF',           an1: r1.caf,           aN: rN.caf       },
                            { label: 'Trésorerie',    an1: r1.flux_tresorerie_annuel, aN: rN.tresorerie_cumulee },
                        ].map((row, i) => (
                            <tr key={row.label} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                                <td style={{ padding: '7px 10px', color: '#374151' }}>{row.label}</td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', color: '#374151' }}>
                                    {row.pct ? `${row.an1.toFixed(1)}%` : fmtM(row.an1)}
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: row.aN >= 0 ? '#169B86' : '#E24B4A' }}>
                                    {row.pct ? `${row.aN.toFixed(1)}%` : fmtM(row.aN)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alerte IS minimum */}
            {r1.is_minimum > r1.is_normal && (
                <div style={{
                    backgroundColor: '#FFF3DC', border: '1px solid #F0A02B',
                    borderRadius: '10px', padding: '12px 16px',
                    fontSize: '12px', color: '#854F0B',
                }}>
                    ⚠️ <strong>IS minimum forfaitaire appliqué</strong> — le résultat est insuffisant mais
                    l&apos;impôt sur le CA s&apos;applique quand même. Vérifiez vos charges et la structure de financement.
                </div>
            )}
        </div>
    )
}