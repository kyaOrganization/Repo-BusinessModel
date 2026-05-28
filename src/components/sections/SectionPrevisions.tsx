'use client'

/**
 * SectionPrevisions
 * ─────────────────────────────────────────────────────────────
 * Refonte complète avec le moteur_financier.ts v2.
 * Corrections appliquées :
 *  ✓ Coût de revient calculé depuis les composants (pas déduit du CA)
 *  ✓ CAPEX en année 0 pour VAN / TRI
 *  ✓ Intérêts dégressifs (capital constant)
 *  ✓ IS = max(IS_normal, IS_minimum)
 *  ✓ OPEX ventilé par catégorie sans double-comptage
 *  ✓ Prorata temporis première année
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/superbase/client'
import {
    calculerPrevisions,
    fmt, fmtM, fmtPct,
    type ResultatAnnee,
    type KPIs,
} from '@/lib/moteur_financier'

interface Props {
    projetId: string
    onSave: () => void
}

// ── Styles réutilisables ──────────────────────────────────────
const css = {
    tabBtn: (active: boolean): React.CSSProperties => ({
        padding: '10px 20px', fontSize: '13px',
        fontWeight: active ? 600 : 400,
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit',
        color: active ? '#0D2B55' : '#6B7280',
        borderBottom: active ? '2px solid #F0A02B' : '2px solid transparent',
        marginBottom: '-1px',
        transition: 'color 0.15s',
    }),
    th: {
        padding: '10px 14px', textAlign: 'left' as const,
        color: '#fff', fontWeight: 500, fontSize: '12px',
    },
    td: (bold = false, color = '#374151'): React.CSSProperties => ({
        padding: '9px 14px', fontSize: '12px',
        fontWeight: bold ? 700 : 400, color,
        borderLeft: bold ? '3px solid #F0A02B' : '3px solid transparent',
        backgroundColor: bold ? '#FAFAFA' : 'transparent',
    }),
    tdNum: (val: number, bold = false): React.CSSProperties => ({
        padding: '9px 14px', textAlign: 'right' as const,
        fontSize: '12px', fontWeight: bold ? 700 : 400,
        color: val < 0 ? '#E24B4A' : bold ? '#0D2B55' : '#374151',
    }),
    kpiCard: (color: string): React.CSSProperties => ({
        backgroundColor: '#F9FAFB', borderRadius: '12px',
        border: '1px solid #E5E7EB', padding: '16px 18px',
        display: 'flex', flexDirection: 'column' as const, gap: '4px',
    }),
    badge: (color: string, bg: string): React.CSSProperties => ({
        display: 'inline-block',
        fontSize: '10px', fontWeight: 700,
        padding: '2px 8px', borderRadius: '20px',
        color, backgroundColor: bg,
    }),
}

// ── Formatage valeurs ─────────────────────────────────────────
function fmtVal(val: number, pct = false): string {
    if (pct) return `${(val * 100).toFixed(1)}%`
    return val < 0 ? `(${fmt(Math.abs(val))})` : fmt(val)
}

// ── Config lignes compte de résultat ─────────────────────────
type LigneCR = {
    label: string
    key: keyof ResultatAnnee
    bold?: boolean
    pct?: boolean
    separator?: boolean
    color?: string
}

const LIGNES_CR: LigneCR[] = [
    { label: "Chiffre d'Affaires (HT)",         key: 'ca_total',          bold: true,  color: '#0D2B55' },
    { label: 'Coût de revient',                  key: 'cout_revient',      bold: false, color: '#E24B4A' },
    { label: 'Marge brute',                      key: 'marge_brute',       bold: true,  color: '#169B86' },
    { label: '  Taux de marge brute',            key: 'marge_brute_pct',   bold: false, pct: true },
    { label: 'Charges de personnel',             key: 'charges_personnel', bold: false, color: '#E24B4A' },
    { label: 'Frais marketing & comm.',          key: 'charges_marketing', bold: false, color: '#E24B4A' },
    { label: 'Recherche & Développement',        key: 'charges_rd',        bold: false, color: '#E24B4A' },
    { label: 'Frais de coordination',            key: 'charges_coord',     bold: false, color: '#E24B4A' },
    { label: 'Autres charges',                   key: 'autres_charges',    bold: false, color: '#E24B4A' },
    { label: 'Total charges d\'exploitation',   key: 'total_opex',        bold: true,  color: '#E24B4A' },
    { label: 'EBITDA',                           key: 'ebitda',            bold: true,  color: '#0D2B55' },
    { label: '  Taux EBITDA / CA',              key: 'ebitda_pct',        bold: false, pct: true },
    { label: 'Dotations aux amortissements',     key: 'dotation_amort',    bold: false, color: '#9CA3AF' },
    { label: 'EBIT (Résultat d\'exploitation)', key: 'ebit',              bold: true,  color: '#0D2B55' },
    { label: 'Frais financiers',                 key: 'frais_financiers',  bold: false, color: '#E24B4A' },
    { label: 'Résultat avant impôts (EBT)',     key: 'ebt',               bold: false },
    { label: '  IS calculé',                    key: 'is_normal',         bold: false, color: '#9CA3AF' },
    { label: '  IS minimum forfaitaire',        key: 'is_minimum',        bold: false, color: '#9CA3AF' },
    { label: 'Impôts (max IS/min)',             key: 'impots',            bold: false, color: '#E24B4A' },
    { label: 'Résultat net',                    key: 'resultat_net',      bold: true,  color: '#169B86' },
    { label: '  Taux de marge nette',           key: 'marge_nette_pct',   bold: false, pct: true },
]

const LIGNES_CAF: LigneCR[] = [
    { label: 'Résultat net',                key: 'resultat_net',             bold: false },
    { label: 'Dotations amortissements (+)', key: 'dotation_amort',          bold: false },
    { label: "Capacité d'autofinancement",  key: 'caf',                      bold: true,  color: '#169B86' },
    { label: 'Remboursement du capital (−)', key: 'remboursement_capital',   bold: false, color: '#E24B4A' },
    { label: 'Flux net de financement',     key: 'flux_net_financement',     bold: false },
    { label: 'Flux de trésorerie net',      key: 'flux_tresorerie_annuel',   bold: true,  color: '#0D2B55' },
    { label: 'Trésorerie cumulée',          key: 'tresorerie_cumulee',       bold: true,  color: '#169B86' },
]

const LIGNES_BILAN: LigneCR[] = [
    { label: 'Valeur nette comptable (immo)', key: 'valeur_nette_comptable', bold: true,  color: '#0D2B55' },
    { label: 'Dettes financières restantes',  key: 'dettes_financieres',     bold: false, color: '#E24B4A' },
    { label: 'Capitaux propres cumulés',      key: 'capitaux_propres',       bold: true,  color: '#169B86' },
]

const LIGNES_RATIOS = [
    { label: 'Marge brute',  key: 'marge_brute_pct'  as keyof ResultatAnnee },
    { label: 'EBITDA / CA',  key: 'ebitda_pct'        as keyof ResultatAnnee },
    { label: 'Marge nette',  key: 'marge_nette_pct'   as keyof ResultatAnnee },
]

// ── Composant principal ───────────────────────────────────────

export default function SectionPrevisions({ projetId, onSave }: Props) {
    const [resultats, setResultats] = useState<ResultatAnnee[]>([])
    const [kpis, setKpis]           = useState<KPIs | null>(null)
    const [loading, setLoading]     = useState(true)
    const [saving, setSaving]       = useState(false)
    const [saved, setSaved]         = useState(false)
    const [onglet, setOnglet]       = useState<'cr' | 'caf' | 'bilan' | 'ratios'>('cr')
    const [erreur, setErreur]       = useState<string | null>(null)
    const enCours = useRef(false)
    const supabase = createClient()

    const calculer = useCallback(async () => {
        if (enCours.current) return
        enCours.current = true
        setLoading(true)
        setErreur(null)

        try {
            const [
                { data: proj },
                { data: hyps },
                { data: revs },
                { data: capexData },
                { data: opexData },
                { data: opexManuels },
                { data: produitsData },
                { data: composantsData },
                { data: partenaires },
            ] = await Promise.all([
                supabase.from('projets').select('*').eq('id', projetId).single(),
                supabase.from('hypotheses').select('*').eq('projet_id', projetId),
                supabase.from('revenus').select('*').eq('projet_id', projetId),
                supabase.from('capex').select('*').eq('projet_id', projetId),
                supabase.from('opex').select('*').eq('projet_id', projetId),
                supabase.from('opex_annuel').select('*').eq('projet_id', projetId),
                supabase.from('produits').select('*').eq('projet_id', projetId),
                supabase.from('composants').select('*'),
                supabase.from('partenaires_financiers').select('*').eq('projet_id', projetId),
            ])

            if (!proj) throw new Error('Projet introuvable')

            const { resultats: res, kpis: k } = calculerPrevisions({
                projet: {
                    annee_demarrage: proj.annee_demarrage ?? 2026,
                    duree_projet:    proj.duree_projet ?? 5,
                },
                hypotheses:  hyps ?? [],
                capexItems:  (capexData ?? []).map(c => ({
                    ...c,
                    methode_amort:     c.methode_amort ?? 'lineaire',
                    valeur_residuelle: c.valeur_residuelle ?? 0,
                })),
                opexItems:   (opexData ?? []).map(o => ({
                    ...o,
                    taux_croissance_annuel: o.taux_croissance_annuel ?? 0,
                })),
                opexManuels: opexManuels ?? [],
                produits:    produitsData ?? [],
                composants:  (composantsData ?? []).filter(c =>
                    produitsData?.some(p => p.id === c.produit_id)
                ),
                revenus:     revs ?? [],
                partenaires: (partenaires ?? []).map(p => ({
                    ...p,
                    methode_remb:   p.methode_remb ?? 'capital_constant',
                    differe_annees: p.differe_annees ?? 0,
                })),
            })

            setResultats(res)
            setKpis(k)

            // ── Persistance dans resultats_financiers ──────────────
            await supabase.from('resultats_financiers').delete().eq('projet_id', projetId)
            if (res.length > 0) {
                await supabase.from('resultats_financiers').insert(
                    res.map(r => ({
                        projet_id:               projetId,
                        annee:                   r.annee,
                        ca_total:                r.ca_total,
                        cout_revient:            r.cout_revient,
                        marge_brute:             r.marge_brute,
                        ebitda:                  r.ebitda,
                        ebit:                    r.ebit,
                        resultat_net:            r.resultat_net,
                        tresorerie:              r.tresorerie_cumulee,
                        // Colonnes v2
                        charges_personnel:       r.charges_personnel,
                        charges_marketing:       r.charges_marketing,
                        charges_rd:              r.charges_rd,
                        charges_coord:           r.charges_coord,
                        autres_charges:          r.autres_charges,
                        total_opex:              r.total_opex,
                        dotation_amort:          r.dotation_amort,
                        frais_financiers:        r.frais_financiers,
                        is_normal:               r.is_normal,
                        is_minimum:              r.is_minimum,
                        impots:                  r.impots,
                        caf:                     r.caf,
                        remboursement_capital:   r.remboursement_capital,
                        flux_tresorerie_annuel:  r.flux_tresorerie_annuel,
                        tresorerie_cumulee:      r.tresorerie_cumulee,
                        valeur_nette_comptable:  r.valeur_nette_comptable,
                        capitaux_propres:        r.capitaux_propres,
                        dettes_financieres:      r.dettes_financieres,
                    }))
                )
            }

            // ── KPIs ───────────────────────────────────────────────
            if (k) {
                await supabase.from('kpis_projet').upsert({
                    projet_id:            projetId,
                    van:                  k.van,
                    tri:                  k.tri,
                    payback_annees:       k.payback_annees,
                    marge_brute_moy:      k.marge_brute_moy,
                    marge_nette_moy:      k.marge_nette_moy,
                    marge_ebitda_moy:     k.marge_ebitda_moy,
                    total_capex:          k.total_capex,
                    seuil_rentabilite_ca: k.seuil_rentabilite_ca,
                    calcule_le:           new Date().toISOString(),
                }, { onConflict: 'projet_id' })
            }

        } catch (e: any) {
            setErreur(e?.message ?? 'Erreur de calcul')
        } finally {
            setLoading(false)
            enCours.current = false
        }
    }, [projetId])

    useEffect(() => { calculer() }, [calculer])

    const handleSave = async () => {
        setSaving(true)
        await calculer()
        setSaving(false)
        setSaved(true)
        onSave()
        setTimeout(() => setSaved(false), 2500)
    }

    // ── Rendu ─────────────────────────────────────────────────

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF', fontSize: '14px' }}>
            <div style={{ marginBottom: '12px', fontSize: '24px' }}>⚙️</div>
            Calcul des prévisions en cours…
        </div>
    )

    if (erreur) return (
        <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: '12px', padding: '24px', color: '#E24B4A',
            fontSize: '13px',
        }}>
            <strong>Erreur de calcul :</strong> {erreur}
            <br /><br />
            Vérifiez que les sections Produits, Revenus et Hypothèses sont complétées.
        </div>
    )

    if (resultats.length === 0) return (
        <div style={{
            textAlign: 'center', padding: '60px',
            backgroundColor: '#F9FAFB', borderRadius: '12px',
        }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', margin: '0 0 8px' }}>
                Aucune donnée de revenus disponible
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
                Complétez les sections <strong>Produits & Services</strong> et <strong>Revenus</strong>, puis revenez ici.
            </p>
        </div>
    )

    const n = resultats.length
    const r1 = resultats[0]
    const rN = resultats[n - 1]

    return (
        <div>
            {/* En-tête section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>9</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Prévisions financières
                </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', paddingLeft: '44px' }}>
                États financiers calculés automatiquement — frais financiers dégressifs,
                IS minimum garanti, coût de revient depuis les composants.
            </p>

            {/* Bandeau recalculer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button
                    onClick={calculer} disabled={loading}
                    style={{
                        padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                        color: '#0D2B55', backgroundColor: '#E6F1FB',
                        border: '1px solid #0D2B55', borderRadius: '10px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
                    }}
                >
                    🔄 Recalculer
                </button>
            </div>

            {/* KPIs synthèse */}
            {kpis && <KpisBanner kpis={kpis} r1={r1} rN={rN} />}

            {/* Onglets */}
            <div style={{ display: 'flex', gap: 0, marginBottom: '20px', borderBottom: '1px solid #E5E7EB' }}>
                {([
                    { key: 'cr',     label: 'Compte de résultat' },
                    { key: 'caf',    label: 'Flux de trésorerie' },
                    { key: 'bilan',  label: 'Bilan simplifié'    },
                    { key: 'ratios', label: 'Ratios'             },
                ] as const).map(o => (
                    <button key={o.key} onClick={() => setOnglet(o.key)}
                            style={css.tabBtn(onglet === o.key)}>
                        {o.label}
                    </button>
                ))}
            </div>

            {/* Tableau financier */}
            <TableauFinancier
                resultats={resultats}
                lignes={
                    onglet === 'cr'     ? LIGNES_CR :
                        onglet === 'caf'    ? LIGNES_CAF :
                            onglet === 'bilan'  ? LIGNES_BILAN :
                                LIGNES_RATIOS
                }
                isRatios={onglet === 'ratios'}
            />

            {/* Avertissement IS minimum */}
            {r1 && r1.is_minimum > r1.is_normal && (
                <div style={{
                    marginTop: '14px', backgroundColor: '#FFF3DC',
                    border: '1px solid #F0A02B', borderRadius: '10px',
                    padding: '10px 16px', fontSize: '12px', color: '#854F0B',
                }}>
                    ⚠️ <strong>IS minimum forfaitaire appliqué</strong> sur
                    {resultats.filter(r => r.is_minimum > r.is_normal).map(r => ` ${r.annee}`).join(',')} —
                    le résultat est insuffisant mais l'impôt minimum sur le CA s'applique quand même.
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                {saved && <span style={{ fontSize: '13px', color: '#169B86', alignSelf: 'center' }}>✓ Sauvegardé</span>}
                <button
                    onClick={handleSave} disabled={saving || loading}
                    style={{
                        padding: '10px 24px', fontSize: '13px', fontWeight: 600,
                        color: '#fff', backgroundColor: saving ? '#D1D5DB' : '#F0A02B',
                        border: 'none', borderRadius: '10px',
                        cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    }}
                >
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
            </div>
        </div>
    )
}

// ── Sous-composant : KPIs banner ──────────────────────────────

function KpisBanner({ kpis, r1, rN }: { kpis: KPIs; r1: ResultatAnnee; rN: ResultatAnnee }) {
    const triPct     = (kpis.tri * 100).toFixed(1)
    const triColor   = kpis.tri > 0.15 ? '#169B86' : kpis.tri > 0.05 ? '#F0A02B' : '#E24B4A'
    const vanColor   = kpis.van > 0 ? '#169B86' : '#E24B4A'
    const pbTxt      = kpis.payback_annees === Infinity
        ? '> durée projet'
        : `${kpis.payback_annees.toFixed(1)} an${kpis.payback_annees > 1 ? 's' : ''}`

    const cards = [
        {
            label: 'TRI',
            value: `${triPct}%`,
            sub: 'Taux de rentabilité interne',
            color: triColor,
            badge: kpis.tri > 0.15 ? { txt: 'Excellent', bg: '#E1F5EE', c: '#0F6E56' }
                : kpis.tri > 0.05 ? { txt: 'Correct',   bg: '#FFF3DC', c: '#854F0B' }
                    :                   { txt: 'Faible',     bg: '#FEE2E2', c: '#991B1B' },
        },
        {
            label: 'VAN',
            value: fmtM(kpis.van),
            sub: `FCFA — WACC intégré`,
            color: vanColor,
            badge: kpis.van > 0
                ? { txt: 'Positive', bg: '#E1F5EE', c: '#0F6E56' }
                : { txt: 'Négative', bg: '#FEE2E2', c: '#991B1B' },
        },
        {
            label: 'Délai de récupération',
            value: pbTxt,
            sub: 'Payback sur la CAF',
            color: '#0D2B55',
        },
        {
            label: 'Marge brute An 1',
            value: fmtPct(r1.marge_brute_pct),
            sub: `${fmt(r1.marge_brute)} FCFA`,
            color: '#0D2B55',
        },
        {
            label: 'Marge nette fin',
            value: fmtPct(rN.marge_nette_pct),
            sub: `An ${rN.annee}`,
            color: rN.marge_nette_pct > 0 ? '#169B86' : '#E24B4A',
        },
        {
            label: 'Seuil de rentabilité',
            value: fmtM(kpis.seuil_rentabilite_ca),
            sub: 'CA minimum An 1',
            color: '#F0A02B',
        },
    ]

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px', marginBottom: '24px',
        }}>
            {cards.map(k => (
                <div key={k.label} style={css.kpiCard(k.color)}>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{k.label}</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: k.color, lineHeight: 1.1 }}>
            {k.value}
          </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: '#6B7280' }}>{k.sub}</span>
                        {k.badge && (
                            <span style={css.badge(k.badge.c, k.badge.bg)}>{k.badge.txt}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Sous-composant : Tableau financier ────────────────────────

function TableauFinancier({
                              resultats, lignes, isRatios,
                          }: {
    resultats: ResultatAnnee[]
    lignes: LigneCR[]
    isRatios: boolean
}) {
    return (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
                    <thead>
                    <tr style={{ backgroundColor: '#0D2B55' }}>
                        <th style={{ ...css.th, width: '220px', textAlign: 'left' }}>
                            Indicateur {!isRatios && '(FCFA)'}
                        </th>
                        {resultats.map(r => (
                            <th key={r.annee} style={{ ...css.th, textAlign: 'right' }}>
                                {r.annee}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {lignes.map((l, i) => {
                        const isEven = i % 2 === 0
                        return (
                            <tr
                                key={l.key}
                                style={{
                                    backgroundColor: l.bold ? '#F9FAFB' : isEven ? '#fff' : '#FCFCFC',
                                    borderBottom: '1px solid #F3F4F6',
                                }}
                            >
                                <td style={css.td(l.bold, l.color ?? (l.bold ? '#374151' : '#6B7280'))}>
                                    {l.label}
                                </td>
                                {resultats.map(r => {
                                    const val = r[l.key] as number
                                    return (
                                        <td key={r.annee} style={css.tdNum(val, l.bold)}>
                                            {isRatios || l.pct
                                                ? `${(val * 100).toFixed(1)}%`
                                                : fmtVal(val)
                                            }
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}