'use client'

// SectionInformations — v2
// Changement vs v1 : ajout du champ prorata_annee1

import { useState } from 'react'
import { createClient } from '@/lib/superbase/client'
import type { Projet, Statut } from '@/lib/superbase/types'

interface Props {
    projet: Projet
    onSave: (projet: Projet) => void
}

const inp: React.CSSProperties = {
    width: '100%', padding: '9px 14px', fontSize: '13px',
    border: '1px solid #E5E7EB', borderRadius: '10px',
    backgroundColor: '#fff', outline: 'none',
    fontFamily: 'inherit', color: '#111827',
}
const lbl: React.CSSProperties = {
    fontSize: '13px', fontWeight: 500, color: '#374151',
    display: 'block', marginBottom: '6px',
}

export default function SectionInformations({ projet, onSave }: Props) {
    const [loading, setLoading] = useState(false)
    const [saved, setSaved]     = useState(false)
    const [form, setForm] = useState({
        nom:               projet.nom ?? '',
        numero_projet:     projet.numero_projet ?? '',
        description:       projet.description ?? '',
        secteur:           projet.secteur ?? '',
        produit_principal: projet.produit_principal ?? '',
        annee_demarrage:   projet.annee_demarrage ?? new Date().getFullYear(),
        duree_projet:      projet.duree_projet ?? 5,
        devise:            projet.devise ?? 'FCFA',
        statut:            projet.statut ?? 'draft',
        promoteur:         projet.promoteur ?? '',
        cout_total:        projet.cout_total ?? 0,
        pays_execution:    projet.pays_execution ?? '',
        // ▼ NOUVEAU v2 : fraction d'année la 1ère année (1 = jan, 0.5 = juillet)
        prorata_annee1:    projet.prorata_annee1 ?? 1.0,
    })
    const supabase = createClient()

    const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }))

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const { data } = await supabase
            .from('projets').update(form).eq('id', projet.id).select().single()
        if (data) onSave(data)
        setLoading(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    // Mois de démarrage calculé à partir du prorata
    const moisDemarrage = Math.round((1 - form.prorata_annee1) * 12) + 1
    const nomMois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>2</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Informations du projet
                </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '28px', paddingLeft: '44px' }}>
                Informations générales qui définissent le cadre du Business Model.
            </p>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                    <div>
                        <label style={lbl}>Nom du projet <span style={{ color: '#E24B4A' }}>*</span></label>
                        <input type="text" required value={form.nom}
                               onChange={e => f('nom', e.target.value)}
                               placeholder="Ex : KYA-SoP Institutions" style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Numéro de projet</label>
                        <input type="text" value={form.numero_projet}
                               onChange={e => f('numero_projet', e.target.value)}
                               placeholder="Ex : 001-26-KYA" style={inp} />
                    </div>
                </div>

                <div>
                    <label style={lbl}>Description</label>
                    <textarea value={form.description}
                              onChange={e => f('description', e.target.value)}
                              placeholder="Décrivez brièvement le projet…" rows={3}
                              style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                        <label style={lbl}>Secteur d&apos;activité</label>
                        <select value={form.secteur} onChange={e => f('secteur', e.target.value)}
                                style={{ ...inp, cursor: 'pointer' }}>
                            <option value="">Choisir un secteur</option>
                            {['Énergie','Agriculture','BTP','Santé','Éducation','Technologie','Commerce','Autre'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={lbl}>Produit ou service principal</label>
                        <input type="text" value={form.produit_principal}
                               onChange={e => f('produit_principal', e.target.value)}
                               placeholder="Ex : Groupe électrosolaire" style={inp} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                        <label style={lbl}>Année démarrage</label>
                        <input type="number" value={form.annee_demarrage}
                               onChange={e => f('annee_demarrage', parseInt(e.target.value))}
                               min={2020} max={2035} style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Durée (ans)</label>
                        <input type="number" value={form.duree_projet}
                               onChange={e => f('duree_projet', parseInt(e.target.value))}
                               min={1} max={20} style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Devise</label>
                        <select value={form.devise} onChange={e => f('devise', e.target.value)}
                                style={{ ...inp, cursor: 'pointer' }}>
                            <option value="FCFA">FCFA</option>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                    <div>
                        <label style={lbl}>Statut</label>
                        <select value={form.statut} onChange={e => f('statut', e.target.value as Statut)}
                                style={{ ...inp, cursor: 'pointer' }}>
                            <option value="draft">Draft</option>
                            <option value="en_cours">En cours</option>
                            <option value="finalise">Finalisé</option>
                            <option value="archive">Archivé</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                        <label style={lbl}>Promoteur du projet</label>
                        <input type="text" value={form.promoteur}
                               onChange={e => f('promoteur', e.target.value)}
                               placeholder="Ex : KYA-Energy Group" style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Coût total du projet (FCFA)</label>
                        <input type="number" value={form.cout_total}
                               onChange={e => f('cout_total', parseFloat(e.target.value))} style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Pays d&apos;exécution</label>
                        <input type="text" value={form.pays_execution}
                               onChange={e => f('pays_execution', e.target.value)}
                               placeholder="Ex : Togo" style={inp} />
                    </div>
                </div>

                {/* ▼ NOUVEAU v2 : Prorata temporis */}
                <div style={{
                    backgroundColor: '#F9FAFB', borderRadius: '12px',
                    border: '1px solid #E5E7EB', padding: '18px',
                }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0D2B55', margin: '0 0 12px' }}>
                        ⚙️ Prorata temporis — Première année
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', alignItems: 'center' }}>
                        <div>
                            <label style={lbl}>
                                Mois de démarrage
                                <span style={{ fontWeight: 400, color: '#9CA3AF', marginLeft: '8px' }}>
                  (Jan = 1, Déc = 12)
                </span>
                            </label>
                            <select
                                value={moisDemarrage}
                                onChange={e => {
                                    const mois = parseInt(e.target.value)
                                    // prorata = fraction d'année restante après le mois de démarrage
                                    // mois 1 (jan) = 12/12 = 1.0, mois 7 (jul) = 6/12 = 0.5
                                    const prorata = (13 - mois) / 12
                                    f('prorata_annee1', Math.round(prorata * 100) / 100)
                                }}
                                style={{ ...inp, cursor: 'pointer' }}
                            >
                                {nomMois.map((m, i) => <option key={i} value={i + 1}>{m} ({i + 1})</option>)}
                            </select>
                        </div>
                        <div style={{ backgroundColor: '#E6F1FB', borderRadius: '10px', padding: '14px 16px' }}>
                            <p style={{ fontSize: '12px', color: '#185FA5', margin: 0 }}>
                                <strong>Prorata appliqué : {(form.prorata_annee1 * 100).toFixed(0)}%</strong> de l&apos;année
                            </p>
                            <p style={{ fontSize: '11px', color: '#6B7280', margin: '4px 0 0' }}>
                                Si le projet démarre en <strong>{nomMois[moisDemarrage - 1]}</strong>{' '}
                                {form.annee_demarrage}, le CA et les charges de l&apos;An 1 seront multipliés
                                par <strong>{form.prorata_annee1.toFixed(2)}</strong> dans le moteur de calcul.
                            </p>
                            <p style={{ fontSize: '11px', color: '#6B7280', margin: '4px 0 0' }}>
                                Exemple : si CA annuel prévu = 100 M FCFA, le CA An 1 calculé sera{' '}
                                <strong>{(100 * form.prorata_annee1).toFixed(1)} M FCFA</strong>.
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                    {saved && <span style={{ fontSize: '13px', color: '#169B86', alignSelf: 'center' }}>✓ Sauvegardé</span>}
                    <button type="submit" disabled={loading}
                            style={{
                                padding: '10px 24px', fontSize: '13px', fontWeight: 600,
                                color: '#fff', backgroundColor: loading ? '#D1D5DB' : '#F0A02B',
                                border: 'none', borderRadius: '10px',
                                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                            }}>
                        {loading ? 'Sauvegarde…' : 'Sauvegarder'}
                    </button>
                </div>
            </form>
        </div>
    )
}