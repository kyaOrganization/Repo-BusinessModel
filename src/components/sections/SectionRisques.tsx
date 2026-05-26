'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/superbase/client'
import { RisqueProjet } from '@/lib/superbase/types'

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

const NIVEAU_CONFIG: Record<string, { bg: string; color: string }> = {
    'faible':   { bg: '#E1F5EE', color: '#0F6E56' },
    'modere':   { bg: '#FFF3DC', color: '#854F0B' },
    'eleve':    { bg: '#FEE2E2', color: '#991B1B' },
    'critique': { bg: '#450A0A', color: '#fff'    },
}

const PROB_CONFIG: Record<string, { bg: string; color: string }> = {
    'faible':  { bg: '#E1F5EE', color: '#0F6E56' },
    'moyenne': { bg: '#FFF3DC', color: '#854F0B' },
    'forte':   { bg: '#FEE2E2', color: '#991B1B' },
}

export default function SectionRisques({ projetId, onSave }: Props) {
    const [risques, setRisques] = useState<RisqueProjet[]>([])
    const [saved, setSaved] = useState(false)
    const supabase = createClient()

    useEffect(() => { fetchData() }, [projetId])

    const fetchData = async () => {
        const { data } = await supabase
            .from('risques_projet')
            .select('*')
            .eq('projet_id', projetId)
            .order('created_at')
        if (data) setRisques(data)
    }

    const ajouter = async () => {
        const { data } = await supabase
            .from('risques_projet')
            .insert([{
                projet_id: projetId,
                description: 'Nouveau risque identifié',
                probabilite: 'faible',
                impact: 'faible',
                mesure_attenuation: ''
            }])
            .select().single()
        if (data) setRisques(prev => [...prev, data])
    }

    const update = async (id: string, field: string, value: string) => {
        setRisques(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
        await supabase.from('risques_projet').update({ [field]: value }).eq('id', id)
    }

    const supprimer = async (id: string) => {
        await supabase.from('risques_projet').delete().eq('id', id)
        setRisques(prev => prev.filter(r => r.id !== id))
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0
                }}>09</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Analyse des Risques
                </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', paddingLeft: '44px' }}>
                Identifiez les risques majeurs (techniques, financiers, opérationnels) liés au projet et détaillez les mesures d'atténuation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {risques.map((risque) => {
                    const cImpact = NIVEAU_CONFIG[risque.impact] || { bg: '#F3F4F6', color: '#374151' }
                    const cProb   = PROB_CONFIG[risque.probabilite] || { bg: '#F3F4F6', color: '#374151' }

                    return (
                        <div key={risque.id}
                             style={{
                                 border: '1px solid #E5E7EB', borderRadius: '12px',
                                 padding: '16px', backgroundColor: '#F9FAFB',
                                 position: 'relative'
                             }}>
                            <button onClick={() => supprimer(risque.id)}
                                    style={{
                                        position: 'absolute', top: '12px', right: '12px',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: '#EF4444', fontSize: '12px', fontWeight: 600
                                    }}>
                                Supprimer
                            </button>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '4px' }}>
                                        Description du risque
                                    </label>
                                    <input type="text" value={risque.description}
                                           onChange={e => update(risque.id, 'description', e.target.value)}
                                           placeholder="Ex : Retard de livraison des équipements"
                                           style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '4px' }}>
                                        Probabilité
                                    </label>
                                    <select value={risque.probabilite}
                                            onChange={e => update(risque.id, 'probabilite', e.target.value)}
                                            style={{ ...inputStyle, backgroundColor: cProb.bg, color: cProb.color, fontWeight: 600, cursor: 'pointer' }}>
                                        <option value="faible" style={{ backgroundColor: '#fff', color: '#111827' }}>Faible</option>
                                        <option value="moyenne" style={{ backgroundColor: '#fff', color: '#111827' }}>Moyenne</option>
                                        <option value="forte" style={{ backgroundColor: '#fff', color: '#111827' }}>Forte</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '4px' }}>
                                        Impact
                                    </label>
                                    <select value={risque.impact}
                                            onChange={e => update(risque.id, 'impact', e.target.value)}
                                            style={{ ...inputStyle, backgroundColor: cImpact.bg, color: cImpact.color, fontWeight: 600, cursor: 'pointer' }}>
                                        <option value="faible" style={{ backgroundColor: '#fff', color: '#111827' }}>Faible</option>
                                        <option value="modere" style={{ backgroundColor: '#fff', color: '#111827' }}>Modéré</option>
                                        <option value="eleve" style={{ backgroundColor: '#fff', color: '#111827' }}>Élevé</option>
                                        <option value="critique" style={{ backgroundColor: '#fff', color: '#111827' }}>Critique</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#169B86', display: 'block', marginBottom: '4px' }}>
                                    Mesure d'atténuation / Plan de contingence
                                </label>
                                <textarea value={risque.mesure_attenuation || ''}
                                          onChange={e => update(risque.id, 'mesure_attenuation', e.target.value)}
                                          placeholder="Actions entreprises pour réduire la probabilité ou l'impact de ce risque..."
                                          rows={2}
                                          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, borderColor: '#169B86' }} />
                            </div>
                        </div>
                    )
                })}
            </div>

            <button onClick={ajouter}
                    style={{
                        padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                        color: '#F0A02B', backgroundColor: '#FFF3DC',
                        border: '1px dashed #F0A02B', borderRadius: '10px',
                        cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                + Ajouter un risque
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
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