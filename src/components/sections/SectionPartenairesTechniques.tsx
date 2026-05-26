'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/superbase/client'
import { PartenaireTechnique } from '@/lib/superbase/types'

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

export default function SectionPartenairesTechniques({ projetId, onSave }: Props) {
    const [partenaires, setPartenaires] = useState<PartenaireTechnique[]>([])
    const [saved, setSaved] = useState(false)
    const supabase = createClient()

    useEffect(() => { fetchData() }, [projetId])

    const fetchData = async () => {
        const { data } = await supabase
            .from('partenaires_techniques')
            .select('*')
            .eq('projet_id', projetId)
            .order('created_at')
        if (data) setPartenaires(data)
    }

    const ajouter = async () => {
        const { data } = await supabase
            .from('partenaires_techniques')
            .insert([{ projet_id: projetId, nom: 'Nouveau Partenaire', type: '', role: '' }])
            .select().single()
        if (error) { console.error('[PT]', error); alert('Erreur : ' + error.message); return }
        if (data) setPartenaires(prev => [...prev, data])
    }

    const update = async (id: string, field: string, value: string) => {
        setPartenaires(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
        await supabase.from('partenaires_techniques').update({ [field]: value }).eq('id', id)
    }

    const supprimer = async (id: string) => {
        await supabase.from('partenaires_techniques').delete().eq('id', id)
        setPartenaires(prev => prev.filter(p => p.id !== id))
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0
                }}>08</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Partenaires Techniques
                </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', paddingLeft: '44px' }}>
                Renseignez les partenaires techniques, industriels ou technologiques impliqués dans la mise en oeuvre du projet.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {partenaires.map((partenaire) => {
                    return (
                        <div key={partenaire.id}
                             style={{
                                 border: '1px solid #E5E7EB', borderRadius: '12px',
                                 padding: '16px', backgroundColor: '#F9FAFB',
                                 position: 'relative'
                             }}>
                            <button onClick={() => supprimer(partenaire.id)}
                                    style={{
                                        position: 'absolute', top: '12px', right: '12px',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: '#EF4444', fontSize: '12px', fontWeight: 600
                                    }}>
                                Supprimer
                            </button>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '4px' }}>
                                        Nom du partenaire
                                    </label>
                                    <input type="text" value={partenaire.nom}
                                           onChange={e => update(partenaire.id, 'nom', e.target.value)}
                                           placeholder="Ex : KYA-Energy Group"
                                           style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '4px' }}>
                                        Domaine d'expertise
                                    </label>
                                    <input type="text" value={partenaire.type || ''}
                                           onChange={e => update(partenaire.id, 'type', e.target.value)}
                                           placeholder="Ex : Systèmes solaires hybrides, IoT"
                                           style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '4px' }}>
                                    Rôle / Contribution dans le projet
                                </label>
                                <textarea value={partenaire.role || ''}
                                          onChange={e => update(partenaire.id, 'role', e.target.value)}
                                          placeholder="Décrivez les responsabilités et livrables attendus de ce partenaire..."
                                          rows={2}
                                          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
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
                + Ajouter un partenaire technique
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