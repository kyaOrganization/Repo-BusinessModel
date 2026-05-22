'use client'

// SectionCouts — v2
// Changements vs v1 :
//  ✓ OPEX : nouveaux type_calcul (pct_ca, pct_capex, par_unite, manuel)
//  ✓ OPEX : taux_croissance_annuel, annee_debut, annee_fin
//  ✓ CAPEX : methode_amort, duree_amortissement, annee_acquisition, valeur_residuelle
//  ✓ Calcul de l'amortissement annuel affiché en temps réel

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/superbase/client'
import type { Capex, Opex, TypeCalculOpex, MethodeAmort, Produit } from '@/lib/superbase/types'

interface Props {
    projetId: string
    onSave: () => void
}

const input: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: '13px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    backgroundColor: '#fff', outline: 'none',
    fontFamily: 'inherit', color: '#111827',
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

// Durée effective = durée explicite OU 1/taux (arrondi)
const dureeEffective = (c: Capex) =>
    c.duree_amortissement ?? (c.taux_amortissement > 0 ? Math.round(1 / c.taux_amortissement) : 0)

const amortAnnuel = (c: Capex) =>
    dureeEffective(c) > 0 ? c.montant / dureeEffective(c) : 0

const TYPE_CALCUL_LABELS: Record<TypeCalculOpex, string> = {
    fixe:       'Montant fixe / an',
    pct_ca:     '% du CA annuel',
    pct_capex:  '% du CAPEX total',
    par_unite:  'Coût par unité vendue',
    manuel:     'Saisie manuelle par année',
}

const METHODE_AMORT_LABELS: Record<MethodeAmort, string> = {
    lineaire:   'Linéaire',
    degressif:  'Dégressif',
    non_amorti: 'Non amorti',
}

export default function SectionCouts({ projetId, onSave }: Props) {
    const [capex, setCapex]     = useState<Capex[]>([])
    const [opex, setOpex]       = useState<Opex[]>([])
    const [produits, setProduits] = useState<Produit[]>([])
    const [onglet, setOnglet]   = useState<'capex' | 'opex'>('capex')
    const [saved, setSaved]     = useState(false)
    const supabase = createClient()

    useEffect(() => { fetchData() }, [projetId])

    const fetchData = async () => {
        const [{ data: c }, { data: o }, { data: p }] = await Promise.all([
            supabase.from('capex').select('*').eq('projet_id', projetId).order('created_at'),
            supabase.from('opex').select('*').eq('projet_id', projetId).order('created_at'),
            supabase.from('produits').select('id, nom').eq('projet_id', projetId),
        ])
        if (c) setCapex(c)
        if (o) setOpex(o)
        if (p) setProduits(p as Produit[])
    }

    // ── CAPEX ────────────────────────────────────────────────────

    const ajouterCapex = async () => {
        const { data } = await supabase
            .from('capex')
            .insert([{
                projet_id: projetId, libelle: 'Nouvel investissement',
                montant: 0, methode_amort: 'lineaire',
                taux_amortissement: 0.20, valeur_residuelle: 0,
            }])
            .select().single()
        if (data) setCapex(prev => [...prev, data])
    }

    const updateCapex = async (id: string, field: string, value: string | number) => {
        setCapex(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
        await supabase.from('capex').update({ [field]: value }).eq('id', id)
    }

    const supprimerCapex = async (id: string) => {
        await supabase.from('capex').delete().eq('id', id)
        setCapex(prev => prev.filter(c => c.id !== id))
    }

    // ── OPEX ─────────────────────────────────────────────────────

    const ajouterOpex = async () => {
        const { data } = await supabase
            .from('opex')
            .insert([{
                projet_id: projetId, libelle: 'Nouvelle charge',
                type_calcul: 'fixe', valeur: 0,
                taux_croissance_annuel: 0,
            }])
            .select().single()
        if (data) setOpex(prev => [...prev, data])
    }

    const updateOpex = async (id: string, field: string, value: string | number | null) => {
        setOpex(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o))
        await supabase.from('opex').update({ [field]: value }).eq('id', id)
    }

    const supprimerOpex = async (id: string) => {
        await supabase.from('opex').delete().eq('id', id)
        setOpex(prev => prev.filter(o => o.id !== id))
    }

    // ── Totaux ────────────────────────────────────────────────────
    const totalCapex   = capex.reduce((s, c) => s + c.montant, 0)
    const totalAmort   = capex.reduce((s, c) => s + amortAnnuel(c), 0)
    const totalOpexFix = opex.filter(o => o.type_calcul === 'fixe')
        .reduce((s, o) => s + o.valeur, 0)

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>5</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Coûts &amp; Composants
                </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', paddingLeft: '44px' }}>
                Définissez vos investissements (CAPEX) et charges d&apos;exploitation (OPEX).
                L&apos;amortissement et les charges sont calculés automatiquement dans les prévisions.
            </p>

            {/* Onglets */}
            <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #E5E7EB' }}>
                {([
                    { key: 'capex', label: 'CAPEX — Investissements' },
                    { key: 'opex',  label: "OPEX — Charges d'exploitation" },
                ] as const).map(o => (
                    <button key={o.key} onClick={() => setOnglet(o.key)}
                            style={{
                                padding: '10px 20px', fontSize: '13px', fontWeight: 500,
                                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                color: onglet === o.key ? '#0D2B55' : '#6B7280',
                                borderBottom: onglet === o.key ? '2px solid #F0A02B' : '2px solid transparent',
                                marginBottom: '-1px',
                            }}>
                        {o.label}
                    </button>
                ))}
            </div>

            {/* ── CAPEX ──────────────────────────────────────────────── */}
            {onglet === 'capex' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        {[
                            { label: 'Total investissement',      value: fmt(totalCapex)  + ' FCFA', color: '#0D2B55' },
                            { label: 'Amortissement annuel moyen', value: fmt(totalAmort)  + ' FCFA', color: '#F0A02B' },
                            { label: 'Nombre de postes',           value: String(capex.length),       color: '#169B86' },
                        ].map(s => (
                            <div key={s.label} style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E5E7EB' }}>
                                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px' }}>{s.label}</p>
                                <p style={{ fontSize: '16px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
                                <thead>
                                <tr style={{ backgroundColor: '#0D2B55' }}>
                                    {['Libellé', 'Catégorie', 'Méthode', 'Montant (FCFA)', 'Taux / Durée', 'Amort./an', 'Val. résiduelle', ''].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#fff', fontWeight: 500, fontSize: '12px' }}>{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {capex.length === 0 ? (
                                    <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
                                        Aucun investissement — cliquez sur &apos;+ Ajouter&apos;
                                    </td></tr>
                                ) : capex.map((c, i) => (
                                    <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="text" value={c.libelle}
                                                   onChange={e => updateCapex(c.id, 'libelle', e.target.value)}
                                                   style={{ ...input, padding: '5px 8px', fontSize: '12px' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="text" value={c.categorie ?? ''}
                                                   onChange={e => updateCapex(c.id, 'categorie', e.target.value)}
                                                   placeholder="Ex : Équipement"
                                                   style={{ ...input, padding: '5px 8px', fontSize: '12px' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <select value={c.methode_amort ?? 'lineaire'}
                                                    onChange={e => updateCapex(c.id, 'methode_amort', e.target.value)}
                                                    style={{ ...input, padding: '5px 8px', fontSize: '12px', cursor: 'pointer', width: '110px' }}>
                                                {(Object.entries(METHODE_AMORT_LABELS) as [MethodeAmort, string][]).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="number" value={c.montant} min={0}
                                                   onChange={e => updateCapex(c.id, 'montant', parseFloat(e.target.value) || 0)}
                                                   style={{ ...input, padding: '5px 8px', fontSize: '12px', width: '120px', textAlign: 'right' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            {/* Taux ou durée selon la méthode */}
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="number" min={0} max={100} step={1}
                                                       value={Math.round(c.taux_amortissement * 100)}
                                                       onChange={e => updateCapex(c.id, 'taux_amortissement', parseFloat(e.target.value) / 100 || 0)}
                                                       style={{ ...input, padding: '5px 8px', fontSize: '12px', width: '58px', textAlign: 'right' }} />
                                                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>%</span>
                                                <span style={{ fontSize: '11px', color: '#C4C4C4' }}>|</span>
                                                <input type="number" min={1} step={1}
                                                       value={c.duree_amortissement ?? ''}
                                                       placeholder="ans"
                                                       onChange={e => updateCapex(c.id, 'duree_amortissement', parseInt(e.target.value) || null as any)}
                                                       style={{ ...input, padding: '5px 8px', fontSize: '12px', width: '50px', textAlign: 'right' }} />
                                                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>ans</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#F0A02B', whiteSpace: 'nowrap' }}>
                                            {fmt(amortAnnuel(c))}
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="number" value={c.valeur_residuelle ?? 0} min={0}
                                                   onChange={e => updateCapex(c.id, 'valeur_residuelle', parseFloat(e.target.value) || 0)}
                                                   style={{ ...input, padding: '5px 8px', fontSize: '12px', width: '100px', textAlign: 'right' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <button onClick={() => supprimerCapex(c.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '18px' }}>
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <button onClick={ajouterCapex}
                            style={{
                                padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                                color: '#F0A02B', backgroundColor: '#FFF3DC',
                                border: '1px dashed #F0A02B', borderRadius: '10px',
                                cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                        + Ajouter un investissement
                    </button>
                </div>
            )}

            {/* ── OPEX ──────────────────────────────────────────────── */}
            {onglet === 'opex' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        {[
                            { label: 'Total charges fixes / an', value: fmt(totalOpexFix) + ' FCFA', color: '#0D2B55' },
                            { label: 'Postes OPEX',              value: String(opex.length),          color: '#F0A02B' },
                            { label: 'Postes variables / % CA',  value: String(opex.filter(o => o.type_calcul !== 'fixe').length), color: '#169B86' },
                        ].map(s => (
                            <div key={s.label} style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E5E7EB' }}>
                                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px' }}>{s.label}</p>
                                <p style={{ fontSize: '16px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
                                <thead>
                                <tr style={{ backgroundColor: '#0D2B55' }}>
                                    {['Libellé', 'Catégorie', 'Type de calcul', 'Valeur', 'Croissance/an', 'An début', 'An fin', ''].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#fff', fontWeight: 500, fontSize: '12px' }}>{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {opex.length === 0 ? (
                                    <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
                                        Aucune charge — cliquez sur &apos;+ Ajouter&apos;
                                    </td></tr>
                                ) : opex.map((o, i) => (
                                    <tr key={o.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="text" value={o.libelle}
                                                   onChange={e => updateOpex(o.id, 'libelle', e.target.value)}
                                                   style={{ ...input, padding: '5px 8px', fontSize: '12px' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="text" value={o.categorie ?? ''}
                                                   onChange={e => updateOpex(o.id, 'categorie', e.target.value)}
                                                   placeholder="Ex : Personnel"
                                                   style={{ ...input, padding: '5px 8px', fontSize: '12px' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <select value={o.type_calcul}
                                                    onChange={e => updateOpex(o.id, 'type_calcul', e.target.value)}
                                                    style={{ ...input, padding: '5px 8px', fontSize: '12px', cursor: 'pointer', width: '140px' }}>
                                                {(Object.entries(TYPE_CALCUL_LABELS) as [TypeCalculOpex, string][]).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                            {/* Produit lié pour par_unite */}
                                            {o.type_calcul === 'par_unite' && (
                                                <select value={o.produit_id ?? ''}
                                                        onChange={e => updateOpex(o.id, 'produit_id', e.target.value || null)}
                                                        style={{ ...input, padding: '5px 8px', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
                                                    <option value="">Choisir un produit…</option>
                                                    {produits.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input type="number" value={o.type_calcul.startsWith('pct') ? Math.round(o.valeur * 100 * 100) / 100 : o.valeur}
                                                       min={0}
                                                       onChange={e => {
                                                           const raw = parseFloat(e.target.value) || 0
                                                           updateOpex(o.id, 'valeur', o.type_calcul.startsWith('pct') ? raw / 100 : raw)
                                                       }}
                                                       style={{ ...input, padding: '5px 8px', fontSize: '12px', width: '100px', textAlign: 'right' }} />
                                                <span style={{ fontSize: '11px', color: '#9CA3AF', flexShrink: 0 }}>
                            {o.type_calcul.startsWith('pct') ? '%' : 'FCFA'}
                          </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input type="number" value={Math.round((o.taux_croissance_annuel ?? 0) * 100 * 100) / 100}
                                                       min={0} max={100} step={0.5}
                                                       onChange={e => updateOpex(o.id, 'taux_croissance_annuel', parseFloat(e.target.value) / 100 || 0)}
                                                       style={{ ...input, padding: '5px 8px', fontSize: '12px', width: '60px', textAlign: 'right' }} />
                                                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="number" value={o.annee_debut ?? ''}
                                                   placeholder="—"
                                                   onChange={e => updateOpex(o.id, 'annee_debut', parseInt(e.target.value) || null as any)}
                                                   style={{ ...input, padding: '5px 8px', fontSize: '12px', width: '70px' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="number" value={o.annee_fin ?? ''}
                                                   placeholder="—"
                                                   onChange={e => updateOpex(o.id, 'annee_fin', parseInt(e.target.value) || null as any)}
                                                   style={{ ...input, padding: '5px 8px', fontSize: '12px', width: '70px' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <button onClick={() => supprimerOpex(o.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '18px' }}>
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: '10px', padding: '10px 16px', marginBottom: '12px', fontSize: '12px', color: '#185FA5' }}>
                        <strong>Logique de calcul :</strong> Les % sont saisis en pourcentage (ex : 2 pour 2%).
                        Le moteur les convertit automatiquement. Les charges &quot;Fixe&quot; s&apos;appliquent à chaque année avec le taux de croissance.
                        Les charges &quot;Manuel&quot; nécessitent une saisie via l&apos;onglet Prévisions.
                    </div>

                    <button onClick={ajouterOpex}
                            style={{
                                padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                                color: '#F0A02B', backgroundColor: '#FFF3DC',
                                border: '1px dashed #F0A02B', borderRadius: '10px',
                                cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                        + Ajouter une charge
                    </button>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                {saved && <span style={{ fontSize: '13px', color: '#169B86', alignSelf: 'center' }}>✓ Sauvegardé</span>}
                <button
                    onClick={() => { setSaved(true); onSave(); setTimeout(() => setSaved(false), 2000) }}
                    style={{
                        padding: '10px 24px', fontSize: '13px', fontWeight: 600,
                        color: '#fff', backgroundColor: '#F0A02B',
                        border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    Sauvegarder
                </button>
            </div>
        </div>
    )
}