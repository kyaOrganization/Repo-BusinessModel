'use client'

// SectionPartenaires — v2 (onglet Financiers uniquement modifié)
// Changements vs v1 :
//  - Champ methode_remb (capital_constant | annuite_constante | in_fine)
//  - Champ differe_annees (différé de remboursement)
//  - Affichage du tableau de remboursement estimé (1ère année)
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
    capital_constant:  'Capital constant (dégressif) - recommandé',
    annuite_constante: 'Annuité constante (mensualité fixe)',
    in_fine:           'In Fine (capital à la fin)',
}

export default function SectionPartenaires({ projetId, onSave }: Props) {
    const [onglet, setOnglet] = useState<TypeOngletPartenaire>('financiers')
    const [fin, setFin]       = useState<PartenaireFinancier[]>([])
    const [tech, setTech]     = useState<PartenaireTechnique[]>([])
    const [custom, setCustom] = useState<PartenaireCustom[]>([])
    const [saved, setSaved]   = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchFinanciers()
        fetchTechniques()
        fetchCustoms()
    }, [projetId])

    // --- FINANCIERS ---
    const fetchFinanciers = async () => {
        const { data } = await supabase.from('partenaires_financiers').select('*').eq('projet_id', projetId).order('created_at')
        if (data) setFin(data)
    }
    const ajouterFinancier = async () => {
        const { data } = await supabase.from('partenaires_financiers').insert([{
            projet_id: projetId, nom: 'Nouveau Partenaire', type_financement: 'emprunt',
            montant: 10000000, taux_interet: 0.05, duree_annees: 5,
            methode_remb: 'capital_constant', differe_annees: 0
        }]).select().single()
        if (data) setFin(prev => [...prev, data])
    }
    const updateFin = async (id: string, field: keyof PartenaireFinancier, val: any) => {
        setFin(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
        await supabase.from('partenaires_financiers').update({ [field]: val }).eq('id', id)
    }
    const supprimerFin = async (id: string) => {
        await supabase.from('partenaires_financiers').delete().eq('id', id)
        setFin(prev => prev.filter(p => p.id !== id))
    }

    // --- TECHNIQUES ---
    const fetchTechniques = async () => {
        const { data } = await supabase.from('partenaires_techniques').select('*').eq('projet_id', projetId).order('created_at')
        if (data) setTech(data)
    }
    const ajouterTechnique = async () => {
        const { data } = await supabase.from('partenaires_techniques').insert([{
            projet_id: projetId, nom: 'Nouveau Partenaire Tech', domaine: 'Solaire', role: 'Fournisseur'
        }]).select().single()
        if (data) setTech(prev => [...prev, data])
    }
    const updateTech = async (id: string, field: keyof PartenaireTechnique, val: any) => {
        setTech(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
        await supabase.from('partenaires_techniques').update({ [field]: val }).eq('id', id)
    }
    const supprimerTech = async (id: string) => {
        await supabase.from('partenaires_techniques').delete().eq('id', id)
        setTech(prev => prev.filter(p => p.id !== id))
    }

    // --- CUSTOM CATEGORIES (AUTRES) ---
    const fetchCustoms = async () => {
        const { data } = await supabase.from('partenaires_custom').select('*').eq('projet_id', projetId).order('created_at')
        if (data) setCustom(data)
    }
    const ajouterCustom = async (categorieId: string) => {
        const { data } = await supabase.from('partenaires_custom').insert([{
            projet_id: projetId, categorie_id: categorieId, nom: 'Nouveau Partenaire', role: 'Description du rôle'
        }]).select().single()
        if (data) setCustom(prev => [...prev, data])
    }
    const updateCustom = async (id: string, itemId: string, field: keyof PartenaireCustom, val: any) => {
        setCustom(prev => prev.map(p => p.id === itemId ? { ...p, [field]: val } : p))
        await supabase.from('partenaires_custom').update({ [field]: val }).eq('id', itemId)
    }
    const supprimerCustom = async (itemId: string) => {
        await supabase.from('partenaires_custom').delete().eq('id', itemId)
        setCustom(prev => prev.filter(p => p.id !== itemId))
    }

    // Données en dur pour la structure des onglets personnalisés
    const listCustomCategories = [
        { id: 'institutionnels', label: 'Partenaires Institutionnels / Étatiques' },
        { id: 'commerciaux',    label: 'Partenaires Commerciaux / Clients Clés' },
    ]

    const tabStyle = (active: boolean) => ({
        padding: '10px 20px', fontSize: '13px', fontWeight: 600,
        color: active ? '#0D2B55' : '#6B7280',
        backgroundColor: active ? '#fff' : 'transparent',
        border: 'none', borderBottom: active ? '2px solid #0D2B55' : 'none',
        cursor: 'pointer', fontFamily: 'inherit'
    })

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0
                }}>07</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Partenaires & Écosystème</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', paddingLeft: '44px' }}>
                Configurez les partenaires financiers, techniques et institutionnels qui soutiennent ou co-financent le projet.
            </p>

            {/* Onglets de navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }}>
                <button onClick={() => setOnglet('financiers')} style={tabStyle(onglet === 'financiers')}>Partenaires Financiers</button>
                <button onClick={() => setOnglet('techniques')} style={tabStyle(onglet === 'techniques')}>Partenaires Techniques</button>
                <button onClick={() => setOnglet('institutionnels')} style={tabStyle(onglet === 'institutionnels')}>Institutionnels</button>
                <button onClick={() => setOnglet('commerciaux')} style={tabStyle(onglet === 'commerciaux')}>Commerciaux</button>
            </div>

            {/* --- ONGLET FINANCIERS --- */}
            {onglet === 'financiers' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Plan de Financement & Levée de Fonds</h3>
                        <button onClick={ajouterFinancier}
                                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 500, color: '#F0A02B', backgroundColor: '#FFF3DC', border: '1px dashed #F0A02B', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            + Ajouter un financeur
                        </button>
                    </div>

                    {fin.map(p => {
                        const m = p.montant || 0
                        const t = p.taux_interet || 0
                        const d = p.duree_annees || 1
                        const methode = p.methode_remb || 'capital_constant'
                        const differe = p.differe_annees || 0

                        let interetAnnee1 = 0
                        let capitalAnnee1 = 0

                        if (p.type_financement === 'emprunt') {
                            if (differe >= 1) {
                                interetAnnee1 = m * t
                                capitalAnnee1 = 0
                            } else {
                                if (methode === 'capital_constant') {
                                    capitalAnnee1 = m / d
                                    interetAnnee1 = m * t
                                } else if (methode === 'annuite_constante') {
                                    const annuite = (m * t) / (1 - Math.pow(1 + t, -d))
                                    interetAnnee1 = m * t
                                    capitalAnnee1 = annuite - interetAnnee1
                                } else {
                                    interetAnnee1 = m * t
                                    capitalAnnee1 = 0
                                }
                            }
                        }

                        const totalAnnee1 = capitalAnnee1 + interetAnnee1

                        return (
                            <div key={p.id} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '16px', backgroundColor: '#F9FAFB' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Nom de l'investisseur / Banque</label>
                                        <input type="text" value={p.nom} onChange={e => updateFin(p.id, 'nom', e.target.value)} style={inp} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Type de financement</label>
                                        <select value={p.type_financement} onChange={e => updateFin(p.id, 'type_financement', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                                            <option value="fonds_propres">Fonds Propres (Capital / Subvention)</option>
                                            <option value="emprunt">Dette / Emprunt Bancaire</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button onClick={() => supprimerFin(p.id)}
                                                style={{ padding: '8px 12px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
                                            Supprimer
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Montant apporté (FCFA)</label>
                                        <input type="number" value={p.montant} onChange={e => updateFin(p.id, 'montant', Number(e.target.value))} style={inp} />
                                    </div>
                                    {p.type_financement === 'emprunt' && (
                                        <>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Taux d'intérêt annuel</label>
                                                <input type="number" step="0.01" value={p.taux_interet} onChange={e => updateFin(p.id, 'taux_interet', Number(e.target.value))} placeholder="Ex: 0.07 pour 7%" style={inp} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Durée de remboursement (ans)</label>
                                                <input type="number" value={p.duree_annees} onChange={e => updateFin(p.id, 'duree_annees', Number(e.target.value))} style={inp} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Différé de remboursement (ans)</label>
                                                <input type="number" min="0" value={p.differe_annees ?? 0} onChange={e => updateFin(p.id, 'differe_annees', Number(e.target.value))} style={inp} />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {p.type_financement === 'emprunt' && (
                                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0D2B55' }}>Mode d'amortissement de la dette :</span>
                                            <select value={p.methode_remb ?? 'capital_constant'} onChange={e => updateFin(p.id, 'methode_remb', e.target.value)}
                                                    style={{ ...inp, width: 'auto', padding: '4px 10px', fontSize: '12px' }}>
                                                {Object.entries(METHODE_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11px', borderTop: '1px dashed #E5E7EB', paddingTop: '10px' }}>
                                            <div><span style={{ color: '#6B7280' }}>Remboursement Capital (An 1) :</span> <strong style={{ color: '#111827', display: 'block', fontSize: '13px' }}>{fmt(capitalAnnee1)} FCFA</strong></div>
                                            <div><span style={{ color: '#6B7280' }}>Frais Financiers / Intérêts (An 1) :</span> <strong style={{ color: '#111827', display: 'block', fontSize: '13px' }}>{fmt(interetAnnee1)} FCFA</strong></div>
                                            <div><span style={{ color: '#6B7280' }}>Annuité Totale (An 1) :</span> <strong style={{ color: '#0D2B55', display: 'block', fontSize: '13px' }}>{fmt(totalAnnee1)} FCFA</strong></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* --- ONGLET TECHNIQUES --- */}
            {onglet === 'techniques' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Partenaires Techniques & Fournisseurs Stratégiques</h3>
                        <button onClick={ajouterTechnique}
                                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 500, color: '#169B86', backgroundColor: '#E1F5EE', border: '1px dashed #169B86', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            + Ajouter un partenaire tech
                        </button>
                    </div>

                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                            <tr style={{ backgroundColor: '#0D2B55', color: '#fff', textAlign: 'left' }}>
                                <th style={{ padding: '10px 12px', fontWeight: 500 }}>Nom du partenaire</th>
                                <th style={{ padding: '10px 12px', fontWeight: 500 }}>Domaine d'expertise</th>
                                <th style={{ padding: '10px 12px', fontWeight: 500 }}>Rôle / Contribution</th>
                                <th style={{ padding: '10px 12px', width: '80px' }}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {tech.map((t, idx) => (
                                <tr key={t.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <td style={{ padding: '8px' }}><input type="text" value={t.nom} onChange={e => updateTech(t.id, 'nom', e.target.value)} style={inp} /></td>
                                    <td style={{ padding: '8px' }}><input type="text" value={t.domaine ?? ''} onChange={e => updateTech(t.id, 'domaine', e.target.value)} placeholder="Ex: R&D, Solaire, IoT" style={inp} /></td>
                                    <td style={{ padding: '8px' }}><input type="text" value={t.role ?? ''} onChange={e => updateTech(t.id, 'role', e.target.value)} placeholder="Ex: Co-développement, Intégrateur" style={inp} /></td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <button onClick={() => supprimerTech(t.id)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                            Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {tech.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>Aucun partenaire technique configuré.</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- ONGLETS PERSONNALISÉS (INSTITUTIONNELS / COMMERCIAUX) --- */}
            {listCustomCategories.map(og => {
                if (onglet !== og.id) return null
                const filtered = custom.filter(c => c.categorie_id === og.id)
                return (
                    <div key={og.id}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>{og.label}</h3>

                        {filtered.map(p => (
                            <div key={p.id} style={{ display: 'flex', gap: '16px', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px', marginBottom: '12px', backgroundColor: '#fff', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Nom de l'organisation / Structure</label>
                                    <input type="text" value={p.nom} onChange={e => updateCustom(og.id, p.id, 'nom', e.target.value)} style={inp} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>Rôle</label>
                                    <input type="text" value={p.role ?? ''} onChange={e => updateCustom(og.id, p.id, 'role', e.target.value)} style={inp} />
                                </div>
                                <button onClick={() => supprimerCustom(p.id)}
                                        style={{ padding: '8px 12px', backgroundColor: '#FFF5F5', border: '1px solid #FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Retirer
                                </button>
                            </div>
                        ))}
                        <button onClick={() => ajouterCustom(og.id)}
                                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 500, color: '#0D2B55', backgroundColor: '#E6F1FB', border: '1px dashed #0D2B55', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            + Ajouter un partenaire
                        </button>
                    </div>
                )
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                {saved && <span style={{ fontSize: '13px', color: '#169B86', alignSelf: 'center' }}>Sauvegardé</span>}
                <button onClick={() => { setSaved(true); onSave(); setTimeout(() => setSaved(false), 2000) }}
                        style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: '#F0A02B', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Sauvegarder
                </button>
            </div>
        </div>
    )
}