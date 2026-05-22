'use client'

// SectionPartenaires — v2 (onglet Financiers uniquement modifié)
// Changements vs v1 :
//  ✓ Champ methode_remb (capital_constant | annuite_constante | in_fine)
//  ✓ Champ differe_annees (différé de remboursement)
//  ✓ Affichage du tableau de remboursement estimé (1ère année)
//  Les onglets Techniques et Custom sont inchangés

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/superbase/client'
import type {
    PartenaireFinancier, PartenaireTechnique,
    TypeOngletPartenaire, PartenaireCustom, MethodeRemb,
} from '@/lib/superbase/types'

interface Props { projetId: string; onSave: () => void }

const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: '13px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    backgroundColor: '#fff', outline: 'none', fontFamily: 'inherit', color: '#111827',
}
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

const METHODE_LABELS: Record<MethodeRemb, string> = {
    capital_constant:  'Capital constant (dégressif) ← recommandé',
    annuite_constante: 'Annuité constante (prêt classique)',
    in_fine:           'In fine (intérêts seuls + capital en fin)',
}

// Calcul simplifié de l'annuité / remb. 1ère année pour affichage
function calcRemb1(p: PartenaireFinancier) {
    if (p.type_financement !== 'emprunt' || p.montant <= 0) return null
    const methode = p.methode_remb ?? 'capital_constant'
    const taux    = p.taux_interet
    const duree   = p.duree_annees
    const differe = p.differe_annees ?? 0

    if (differe >= 1) {
        return { interets: p.montant * taux, capital: 0, type: 'Différé' }
    }

    if (methode === 'capital_constant') {
        const crd = p.montant  // 1ère année, pas de remboursement préalable
        return { interets: crd * taux, capital: p.montant / duree, type: 'Capital constant' }
    }
    if (methode === 'annuite_constante') {
        const annuite = taux > 0 ? (p.montant * taux) / (1 - Math.pow(1 + taux, -duree)) : p.montant / duree
        const interets = p.montant * taux
        return { interets, capital: annuite - interets, type: 'Annuité constante' }
    }
    if (methode === 'in_fine') {
        return { interets: p.montant * taux, capital: 0, type: 'In fine' }
    }
    return null
}

const ONGLETS_FIXES = [
    { key: 'financiers', label: 'Partenaires financiers' },
    { key: 'techniques', label: 'Partenaires techniques' },
]

export default function SectionPartenaires({ projetId, onSave }: Props) {
    const [ongletActif, setOngletActif]     = useState('financiers')
    const [financiers, setFinanciers]       = useState<PartenaireFinancier[]>([])
    const [techniques, setTechniques]       = useState<PartenaireTechnique[]>([])
    const [ongletsDyna, setOngletsDyna]     = useState<TypeOngletPartenaire[]>([])
    const [partCustom, setPartCustom]       = useState<Record<string, PartenaireCustom[]>>({})
    const [saved, setSaved]                 = useState(false)
    const [newLabel, setNewLabel]           = useState('')
    const [showAdd, setShowAdd]             = useState(false)
    const supabase = createClient()

    useEffect(() => { fetchAll() }, [projetId])

    const fetchAll = async () => {
        const [{ data: f }, { data: t }, { data: o }, { data: c }] = await Promise.all([
            supabase.from('partenaires_financiers').select('*').eq('projet_id', projetId).order('created_at'),
            supabase.from('partenaires_techniques').select('*').eq('projet_id', projetId).order('created_at'),
            supabase.from('types_onglets_partenaires').select('*').eq('projet_id', projetId).order('ordre'),
            supabase.from('partenaires_custom').select('*').eq('projet_id', projetId),
        ])
        if (f) setFinanciers(f)
        if (t) setTechniques(t)
        if (o) {
            setOngletsDyna(o)
            const map: Record<string, PartenaireCustom[]> = {}
            o.forEach(og => { map[og.id] = (c ?? []).filter(p => p.onglet_id === og.id) })
            setPartCustom(map)
        }
    }

    // ── Financiers ───────────────────────────────────────────────
    const ajouterFin = async () => {
        const { data } = await supabase.from('partenaires_financiers')
            .insert([{
                projet_id: projetId, nom: 'Nouveau partenaire',
                type_financement: 'emprunt', montant: 0,
                taux_interet: 0.10, duree_annees: 5,
                methode_remb: 'capital_constant', differe_annees: 0,
            }]).select().single()
        if (data) setFinanciers(prev => [...prev, data])
    }
    const updateFin = async (id: string, field: string, value: any) => {
        setFinanciers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
        await supabase.from('partenaires_financiers').update({ [field]: value }).eq('id', id)
    }
    const suppFin = async (id: string) => {
        await supabase.from('partenaires_financiers').delete().eq('id', id)
        setFinanciers(prev => prev.filter(p => p.id !== id))
    }

    // ── Techniques (inchangé) ────────────────────────────────────
    const ajouterTech = async () => {
        const { data } = await supabase.from('partenaires_techniques')
            .insert([{ projet_id: projetId, nom: 'Nouveau partenaire technique' }])
            .select().single()
        if (data) setTechniques(prev => [...prev, data])
    }
    const updateTech = async (id: string, field: string, value: string) => {
        setTechniques(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
        await supabase.from('partenaires_techniques').update({ [field]: value }).eq('id', id)
    }
    const suppTech = async (id: string) => {
        await supabase.from('partenaires_techniques').delete().eq('id', id)
        setTechniques(prev => prev.filter(p => p.id !== id))
    }

    // ── Onglets dynamiques (inchangé) ────────────────────────────
    const ajouterOnglet = async () => {
        if (!newLabel.trim()) return
        const { data } = await supabase.from('types_onglets_partenaires')
            .insert([{ projet_id: projetId, label: newLabel.trim(), ordre: ongletsDyna.length }])
            .select().single()
        if (data) { setOngletsDyna(prev => [...prev, data]); setPartCustom(prev => ({ ...prev, [data.id]: [] })); setOngletActif(data.id) }
        setNewLabel(''); setShowAdd(false)
    }
    const suppOnglet = async (id: string) => {
        await supabase.from('types_onglets_partenaires').delete().eq('id', id)
        setOngletsDyna(prev => prev.filter(o => o.id !== id))
        setPartCustom(prev => { const n = { ...prev }; delete n[id]; return n })
        setOngletActif('financiers')
    }
    const ajouterCustom = async (oid: string) => {
        const { data } = await supabase.from('partenaires_custom')
            .insert([{ projet_id: projetId, onglet_id: oid, nom: 'Nouveau partenaire' }]).select().single()
        if (data) setPartCustom(prev => ({ ...prev, [oid]: [...(prev[oid] ?? []), data] }))
    }
    const updateCustom = async (oid: string, id: string, field: string, value: string) => {
        setPartCustom(prev => ({ ...prev, [oid]: prev[oid].map(p => p.id === id ? { ...p, [field]: value } : p) }))
        await supabase.from('partenaires_custom').update({ [field]: value }).eq('id', id)
    }
    const suppCustom = async (oid: string, id: string) => {
        await supabase.from('partenaires_custom').delete().eq('id', id)
        setPartCustom(prev => ({ ...prev, [oid]: prev[oid].filter(p => p.id !== id) }))
    }

    const totalFin = financiers.reduce((s, p) => s + p.montant, 0)
    const allTabs: { key: string; label: string; isDyna?: boolean }[] = [
        ...ONGLETS_FIXES,
        ...ongletsDyna.map(o => ({ key: o.id, label: o.label, isDyna: true }))
    ];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>7</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Partenaires</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', paddingLeft: '44px' }}>
                Financiers, techniques et tout autre type de partenaire.
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                    { label: 'Financement total',      value: fmt(totalFin) + ' FCFA', color: '#0D2B55' },
                    { label: 'Partenaires financiers', value: String(financiers.length), color: '#F0A02B' },
                    { label: 'Partenaires techniques', value: String(techniques.length), color: '#169B86' },
                ].map(s => (
                    <div key={s.label} style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E5E7EB' }}>
                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px' }}>{s.label}</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap' }}>
                {allTabs.map(tab => (
                    <div key={tab.key} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <button onClick={() => setOngletActif(tab.key)} style={{
                            padding: '10px 16px', fontSize: '13px',
                            fontWeight: ongletActif === tab.key ? 600 : 400,
                            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            color: ongletActif === tab.key ? '#0D2B55' : '#6B7280',
                            borderBottom: ongletActif === tab.key ? '2px solid #F0A02B' : '2px solid transparent',
                            marginBottom: '-1px',
                        }}>{tab.label}</button>
                        {tab.isDyna ? (
                            <button onClick={() => suppOnglet(tab.key)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '14px', padding: '0 4px', marginBottom: '-1px' }}>×</button>
                        ) : null}

                    </div>
                ))}
                {showAdd ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
                        <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && ajouterOnglet()}
                               placeholder="Nom de l'onglet…" autoFocus
                               style={{ ...inp, width: '160px', padding: '4px 8px', fontSize: '12px' }} />
                        <button onClick={ajouterOnglet}
                                style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#fff', backgroundColor: '#F0A02B', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                        <button onClick={() => setShowAdd(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '16px' }}>×</button>
                    </div>
                ) : (
                    <button onClick={() => setShowAdd(true)}
                            style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 500, color: '#169B86', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '2px solid transparent', marginBottom: '-1px' }}>
                        + Ajouter un type
                    </button>
                )}
            </div>

            {/* Contenu Financiers — v2 */}
            {ongletActif === 'financiers' && (
                <div>
                    {financiers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#F9FAFB', borderRadius: '12px', color: '#9CA3AF' }}>
                            <p style={{ fontSize: '14px' }}>Aucun partenaire financier</p>
                        </div>
                    ) : financiers.map(p => {
                        const remb = calcRemb1(p)
                        return (
                            <div key={p.id} style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '18px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#0D2B55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🏦</div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{p.nom}</p>
                                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#FFF3DC', color: '#854F0B' }}>
                        {p.type_financement ?? 'autre'}
                      </span>
                                        </div>
                                    </div>
                                    <button onClick={() => suppFin(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '20px' }}>×</button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Nom</label>
                                        <input type="text" value={p.nom} onChange={e => updateFin(p.id, 'nom', e.target.value)} style={inp} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Type de financement</label>
                                        <select value={p.type_financement ?? 'emprunt'} onChange={e => updateFin(p.id, 'type_financement', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                                            <option value="emprunt">Emprunt bancaire</option>
                                            <option value="fonds_propres">Fonds propres</option>
                                            <option value="subvention">Subvention</option>
                                            <option value="autre">Autre</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Montant (FCFA)</label>
                                        <input type="number" value={p.montant} min={0} onChange={e => updateFin(p.id, 'montant', parseFloat(e.target.value))} style={inp} />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Rôle dans le projet</label>
                                    <input type="text" value={p.role_projet ?? ''} onChange={e => updateFin(p.id, 'role_projet', e.target.value)} placeholder="Ex : Financeur principal du CAPEX…" style={inp} />
                                </div>

                                {p.type_financement === 'emprunt' && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Taux d&apos;intérêt (%)</label>
                                                <input type="number" value={Math.round(p.taux_interet * 100 * 10) / 10} min={0} max={30} step={0.1}
                                                       onChange={e => updateFin(p.id, 'taux_interet', parseFloat(e.target.value) / 100)} style={inp} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Durée (années)</label>
                                                <input type="number" value={p.duree_annees} min={1} max={30}
                                                       onChange={e => updateFin(p.id, 'duree_annees', parseInt(e.target.value))} style={inp} />
                                            </div>
                                            {/* ▼ NOUVEAU v2 */}
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Différé (années)</label>
                                                <input type="number" value={p.differe_annees ?? 0} min={0} max={5}
                                                       onChange={e => updateFin(p.id, 'differe_annees', parseInt(e.target.value) || 0)} style={inp} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Remb. estimé An 1</label>
                                                <div style={{ padding: '8px 12px', backgroundColor: '#E1F5EE', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#169B86' }}>
                                                    {remb ? fmt(remb.capital + remb.interets) : '—'} FCFA
                                                </div>
                                            </div>
                                        </div>

                                        {/* ▼ NOUVEAU v2 : méthode de remboursement */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>
                                                Méthode de remboursement
                                            </label>
                                            <select value={p.methode_remb ?? 'capital_constant'}
                                                    onChange={e => updateFin(p.id, 'methode_remb', e.target.value as MethodeRemb)}
                                                    style={{ ...inp, cursor: 'pointer' }}>
                                                {(Object.entries(METHODE_LABELS) as [MethodeRemb, string][]).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Détail remboursement An 1 */}
                                        {remb && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                                                {[
                                                    { label: 'Capital remboursé An 1', value: fmt(remb.capital)  },
                                                    { label: 'Intérêts An 1',          value: fmt(remb.interets) },
                                                    { label: 'Total annuité An 1',     value: fmt(remb.capital + remb.interets) },
                                                ].map(s => (
                                                    <div key={s.label} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '10px 14px', border: '1px solid #E5E7EB' }}>
                                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 3px' }}>{s.label}</p>
                                                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#0D2B55', margin: 0 }}>{s.value} FCFA</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Conditions particulières</label>
                                    <textarea value={p.conditions ?? ''} onChange={e => updateFin(p.id, 'conditions', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                                </div>
                            </div>
                        )
                    })}
                    <button onClick={ajouterFin}
                            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 500, color: '#F0A02B', backgroundColor: '#FFF3DC', border: '1px dashed #F0A02B', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        + Ajouter un partenaire financier
                    </button>
                </div>
            )}

            {/* Techniques (inchangé — copie fidèle de v1) */}
            {ongletActif === 'techniques' && (
                <div>
                    {techniques.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#F9FAFB', borderRadius: '12px', color: '#9CA3AF' }}>
                            <p style={{ fontSize: '14px' }}>Aucun partenaire technique</p>
                        </div>
                    ) : techniques.map(p => (
                        <div key={p.id} style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '18px', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#169B86', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🔧</div>
                                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{p.nom}</p>
                                </div>
                                <button onClick={() => suppTech(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '20px' }}>×</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Nom</label>
                                    <input type="text" value={p.nom} onChange={e => updateTech(p.id, 'nom', e.target.value)} style={inp} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Type</label>
                                    <select value={p.type ?? ''} onChange={e => updateTech(p.id, 'type', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                                        <option value="">Choisir</option>
                                        {['Fournisseur','Installateur','Distributeur','Sous-traitant','Autre'].map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Rôle</label>
                                    <input type="text" value={p.role ?? ''} onChange={e => updateTech(p.id, 'role', e.target.value)} style={inp} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Contact</label>
                                    <input type="text" value={p.contact ?? ''} onChange={e => updateTech(p.id, 'contact', e.target.value)} style={inp} />
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={ajouterTech}
                            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 500, color: '#169B86', backgroundColor: '#E1F5EE', border: '1px dashed #169B86', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        + Ajouter un partenaire technique
                    </button>
                </div>
            )}

            {/* Onglets dynamiques */}
            {ongletsDyna.map(og => ongletActif === og.id && (
                <div key={og.id}>
                    {(partCustom[og.id] ?? []).map(p => (
                        <div key={p.id} style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '18px', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{p.nom}</p>
                                <button onClick={() => suppCustom(og.id, p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '20px' }}>×</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Nom</label>
                                    <input type="text" value={p.nom} onChange={e => updateCustom(og.id, p.id, 'nom', e.target.value)} style={inp} /></div>
                                <div><label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Rôle</label>
                                    <input type="text" value={p.role ?? ''} onChange={e => updateCustom(og.id, p.id, 'role', e.target.value)} style={inp} /></div>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => ajouterCustom(og.id)}
                            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 500, color: '#0D2B55', backgroundColor: '#E6F1FB', border: '1px dashed #0D2B55', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        + Ajouter un partenaire
                    </button>
                </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                {saved && <span style={{ fontSize: '13px', color: '#169B86', alignSelf: 'center' }}>✓ Sauvegardé</span>}
                <button onClick={() => { setSaved(true); onSave(); setTimeout(() => setSaved(false), 2000) }}
                        style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: '#F0A02B', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Sauvegarder
                </button>
            </div>
        </div>
    )
}