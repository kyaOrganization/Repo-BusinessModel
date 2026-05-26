'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/superbase/client'
import { ImpactProjet } from '@/lib/superbase/types'

interface Props {
    projetId: string
    onSave: () => void
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: '13px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    backgroundColor: '#fff', outline: 'none',
    fontFamily: 'inherit', color: '#111827'
}

const ODD_LIST = [
    { num: '1',  label: 'Pas de pauvreté' },
    { num: '2',  label: 'Faim zéro' },
    { num: '3',  label: 'Bonne santé' },
    { num: '4',  label: 'Éducation de qualité' },
    { num: '5',  label: 'Égalité des sexes' },
    { num: '6',  label: 'Eau propre' },
    { num: '7',  label: 'Énergie propre' },
    { num: '8',  label: 'Travail décent' },
    { num: '9',  label: 'Industrie & Innovation' },
    { num: '10', label: 'Inégalités réduites' },
    { num: '11', label: 'Villes durables' },
    { num: '12', label: 'Consommation responsable' },
    { num: '13', label: 'Lutte contre le climat' },
    { num: '17', label: 'Partenariats' },
]

const CAT_COLORS: Record<string, { bg: string; color: string; prefix: string }> = {
    'Environnemental': { bg: '#E1F5EE', color: '#0F6E56', prefix: 'ENV' },
    'Social':          { bg: '#E6F1FB', color: '#185FA5', prefix: 'SOC' },
    'Économique':      { bg: '#FFF3DC', color: '#854F0B', prefix: 'ECO' },
    'Technologique':   { bg: '#F3E8FF', color: '#6B21A8', prefix: 'TEC' },
}

export default function SectionImpacts({ projetId, onSave }: Props) {
    const [impacts, setImpacts] = useState<ImpactProjet[]>([])
    const [saved, setSaved]     = useState(false)
    const supabase = createClient()

    useEffect(() => { fetchData() }, [projetId])

    const fetchData = async () => {
        const { data } = await supabase
            .from('impacts_projet')
            .select('*')
            .eq('projet_id', projetId)
            .order('created_at')
        if (data) setImpacts(data)
    }

    const ajouter = async (categorie: string) => {
        const { data } = await supabase
            .from('impacts_projet')
            .insert([{ projet_id: projetId, indicateur: 'Nouvel indicateur', categorie }])
            .select().single()
        if (data) setImpacts(prev => [...prev, data])
    }

    const update = async (id: string, field: string, value: string) => {
        setImpacts(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
        await supabase.from('impacts_projet').update({ [field]: value }).eq('id', id)
    }

    const supprimer = async (id: string) => {
        await supabase.from('impacts_projet').delete().eq('id', id)
        setImpacts(prev => prev.filter(i => i.id !== id))
    }

    const categories = ['Environnemental', 'Social', 'Économique', 'Technologique']

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0
                }}>10</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Impacts du projet
                </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', paddingLeft: '44px' }}>
                Documentez les impacts environnementaux, sociaux et économiques du projet. Reliez-les aux ODD de l'ONU.
            </p>

            {/* Stats par catégorie */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
                {categories.map(cat => {
                    const conf = CAT_COLORS[cat]
                    const count = impacts.filter(i => i.categorie === cat).length
                    return (
                        <div key={cat} style={{ backgroundColor: conf.bg, borderRadius: '10px', padding: '14px 16px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: conf.color, margin: '0 0 4px', letterSpacing: '0.5px' }}>
                                [{conf.prefix}]
                            </p>
                            <p style={{ fontSize: '11px', color: conf.color, margin: '0 0 2px', fontWeight: 600 }}>{cat}</p>
                            <p style={{ fontSize: '20px', fontWeight: 700, color: conf.color, margin: 0 }}>{count} indicateur{count > 1 ? 's' : ''}</p>
                        </div>
                    )
                })}
            </div>

            {/* Sections par catégorie */}
            {categories.map(cat => {
                const conf     = CAT_COLORS[cat]
                const catItems = impacts.filter(i => i.categorie === cat)
                return (
                    <div key={cat} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, color: conf.color, margin: 0 }}>
                                    Impact {cat}
                                </h3>
                            </div>
                            <button onClick={() => ajouter(cat)}
                                    style={{
                                        padding: '5px 12px', fontSize: '12px', fontWeight: 500,
                                        color: conf.color, backgroundColor: conf.bg,
                                        border: `1px dashed ${conf.color}`, borderRadius: '8px',
                                        cursor: 'pointer', fontFamily: 'inherit'
                                    }}>
                                + Ajouter
                            </button>
                        </div>

                        {catItems.length === 0 ? (
                            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '10px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>
                                Aucun indicateur {cat.toLowerCase()} — cliquez sur "+ Ajouter"
                            </div>
                        ) : (
                            <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                    <tr style={{ backgroundColor: '#0D2B55' }}>
                                        {['Indicateur', 'Valeur', 'Unité', 'ODD lié', 'Description', ''].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', fontWeight: 500 }}>{h}</th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {catItems.map((item, i) => (
                                        <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '8px 12px' }}>
                                                <input type="text" value={item.indicateur}
                                                       onChange={e => update(item.id, 'indicateur', e.target.value)}
                                                       style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px' }} />
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>
                                                <input type="text" value={item.valeur || ''}
                                                       onChange={e => update(item.id, 'valeur', e.target.value)}
                                                       placeholder="Ex : 500"
                                                       style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px', width: '80px' }} />
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>
                                                <input type="text" value={item.unite || ''}
                                                       onChange={e => update(item.id, 'unite', e.target.value)}
                                                       placeholder="Ex : tonnes CO2"
                                                       style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px', width: '100px' }} />
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>
                                                <select value={item.odd || ''}
                                                        onChange={e => update(item.id, 'odd', e.target.value)}
                                                        style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px', width: '120px', cursor: 'pointer' }}>
                                                    <option value="">Aucun</option>
                                                    {ODD_LIST.map(o => (
                                                        <option key={o.num} value={`ODD ${o.num}`}>ODD {o.num} — {o.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>
                                                <input type="text" value={item.description || ''}
                                                       onChange={e => update(item.id, 'description', e.target.value)}
                                                       placeholder="Description..."
                                                       style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px' }} />
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                <button onClick={() => supprimer(item.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '16px', fontWeight: 'bold' }}>
                                                    x
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                {saved && <span style={{ fontSize: '13px', color: '#169B86', alignSelf: 'center' }}>Sauvegardé</span>}
                <button
                    onClick={() => { setSaved(true); onSave(); setTimeout(() => setSaved(false), 2000) }}
                    style={{
                        padding: '10px 24px', fontSize: '13px', fontWeight: 600,
                        color: '#fff', backgroundColor: '#F0A02B',
                        border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                    Sauvegarder
                </button>
            </div>
        </div>
    )
}