'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/superbase/client'
import { Produit, Composant } from '@/lib/superbase/types'

interface Props {
    projetId: string
    onSave: () => void
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 14px', fontSize: '13px',
    border: '1px solid #E5E7EB', borderRadius: '10px',
    backgroundColor: '#fff', outline: 'none',
    fontFamily: 'inherit', color: '#111827'
}

const labelStyle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 500,
    color: '#374151', display: 'block', marginBottom: '6px'
}

export default function SectionProduits({ projetId, onSave }: Props) {
    const [produits, setProduits]         = useState<Produit[]>([])
    const [composants, setComposants]     = useState<Record<string, Composant[]>>({})
    const [produitActif, setProduitActif] = useState<string | null>(null)
    const [loading, setLoading]           = useState(false)
    const [saved, setSaved]               = useState(false)
    const [nouveauProduit, setNouveauProduit] = useState({
        nom: '', description: '', proposition_valeur: '',
        unite_vente: '', marge_securite: 0.1,
    })
    const supabase = createClient()

    useEffect(() => { fetchProduits() }, [projetId])

    const fetchProduits = async () => {
        const { data } = await supabase
            .from('produits')
            .select('*')
            .eq('projet_id', projetId)
            .order('created_at')
        if (data) {
            setProduits(data)
            if (data.length > 0) {
                setProduitActif(data[0].id)
                fetchComposants(data[0].id)
            }
        }
    }

    const fetchComposants = async (produitId: string) => {
        const { data } = await supabase
            .from('composants')
            .select('*')
            .eq('produit_id', produitId)
            .order('created_at')
        if (data) setComposants(prev => ({ ...prev, [produitId]: data }))
    }

    const ajouterProduit = async () => {
        if (!nouveauProduit.nom) return
        setLoading(true)
        const { data } = await supabase
            .from('produits')
            .insert([{ ...nouveauProduit, projet_id: projetId }])
            .select()
            .single()
        if (data) {
            setProduits(prev => [...prev, data])
            setProduitActif(data.id)
            setComposants(prev => ({ ...prev, [data.id]: [] }))
            setNouveauProduit({ nom: '', description: '', proposition_valeur: '', unite_vente: '', marge_securite: 0.1 })
        }
        setLoading(false)
    }

    const supprimerProduit = async (id: string) => {
        await supabase.from('produits').delete().eq('id', id)
        setProduits(prev => prev.filter(p => p.id !== id))
        if (produitActif === id) setProduitActif(produits[0]?.id || null)
    }

    const ajouterComposant = async (produitId: string) => {
        const { data } = await supabase
            .from('composants')
            .insert([{ produit_id: produitId, libelle: 'Nouveau composant', quantite: 1, prix_unitaire: 0 }])
            .select()
            .single()
        if (data) setComposants(prev => ({ ...prev, [produitId]: [...(prev[produitId] || []), data] }))
    }

    const updateComposant = async (produitId: string, composantId: string, field: string, value: string | number) => {
        setComposants(prev => ({
            ...prev,
            [produitId]: prev[produitId].map(c => c.id === composantId ? { ...c, [field]: value } : c)
        }))
        await supabase.from('composants').update({ [field]: value }).eq('id', composantId)
    }

    const supprimerComposant = async (produitId: string, composantId: string) => {
        await supabase.from('composants').delete().eq('id', composantId)
        setComposants(prev => ({ ...prev, [produitId]: prev[produitId].filter(c => c.id !== composantId) }))
    }

    const calculerCoutVente = (produitId: string, margeSecurite: number) => {
        const comps = composants[produitId] || []
        const total = comps.reduce((sum, c) => sum + (c.quantite * c.prix_unitaire), 0)
        return total * (1 + margeSecurite)
    }

    const produitActifData = produits.find(p => p.id === produitActif)
    const compsActifs      = produitActif ? (composants[produitActif] || []) : []
    const coutVente      = produitActif ? calculerCoutVente(produitActif, produitActifData?.marge_securite || 0.1) : 0

    const formatNum = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: '#F0A02B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0
                }}>3</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Produits & Services
                </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '28px', paddingLeft: '44px' }}>
                Définissez vos produits et leurs composants. Le coût de revient est calculé automatiquement.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px' }}>

                {/* Liste des produits */}
                <div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                        Produits
                    </p>

                    {produits.map(p => (
                        <div
                            key={p.id}
                            onClick={() => { setProduitActif(p.id); fetchComposants(p.id) }}
                            style={{
                                padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                backgroundColor: produitActif === p.id ? '#FFF3DC' : '#F9FAFB',
                                border: produitActif === p.id ? '1px solid #F0A02B' : '1px solid #E5E7EB',
                                marginBottom: '8px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                        >
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{p.nom}</span>
                            <button
                                onClick={e => { e.stopPropagation(); supprimerProduit(p.id) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '16px' }}
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    {/* Ajouter produit */}
                    <div style={{ marginTop: '12px' }}>
                        <input
                            type="text"
                            placeholder="Nom du produit..."
                            value={nouveauProduit.nom}
                            onChange={e => setNouveauProduit({ ...nouveauProduit, nom: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && ajouterProduit()}
                            style={{ ...inputStyle, marginBottom: '8px' }}
                        />
                        <button
                            onClick={ajouterProduit}
                            disabled={!nouveauProduit.nom || loading}
                            style={{
                                width: '100%', padding: '8px', fontSize: '13px', fontWeight: 500,
                                color: '#F0A02B', backgroundColor: '#FFF3DC',
                                border: '1px dashed #F0A02B', borderRadius: '10px',
                                cursor: 'pointer', fontFamily: 'inherit'
                            }}
                        >
                            + Ajouter un produit
                        </button>
                    </div>
                </div>

                {/* Détail produit actif */}
                {produitActifData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                        {/* Infos produit */}
                        <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={labelStyle}>Nom du produit</label>
                                    <input
                                        type="text" value={produitActifData.nom}
                                        onChange={async e => {
                                            const val = e.target.value
                                            setProduits(prev => prev.map(p => p.id === produitActifData.id ? { ...p, nom: val } : p))
                                            await supabase.from('produits').update({ nom: val }).eq('id', produitActifData.id)
                                        }}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Unité de vente</label>
                                    <input
                                        type="text" value={produitActifData.unite_vente || ''}
                                        onChange={async e => {
                                            const val = e.target.value
                                            setProduits(prev => prev.map(p => p.id === produitActifData.id ? { ...p, unite_vente: val } : p))
                                            await supabase.from('produits').update({ unite_vente: val }).eq('id', produitActifData.id)
                                        }}
                                        placeholder="Ex : pièce, lot, service..."
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Proposition de valeur</label>
                                <textarea
                                    value={produitActifData.proposition_valeur || ''}
                                    onChange={async e => {
                                        const val = e.target.value
                                        setProduits(prev => prev.map(p => p.id === produitActifData.id ? { ...p, proposition_valeur: val } : p))
                                        await supabase.from('produits').update({ proposition_valeur: val }).eq('id', produitActifData.id)
                                    }}
                                    placeholder="Ce que ce produit apporte au client..."
                                    rows={2}
                                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={labelStyle}>Description</label>
                                    <textarea
                                        value={produitActifData.description || ''}
                                        onChange={async e => {
                                            const val = e.target.value
                                            setProduits(prev => prev.map(p => p.id === produitActifData.id ? { ...p, description: val } : p))
                                            await supabase.from('produits').update({ description: val }).eq('id', produitActifData.id)
                                        }}
                                        rows={2}
                                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Marge de sécurité (%)</label>
                                    <input
                                        type="number" step="1" min={0} max={100}
                                        value={Math.round((produitActifData.marge_securite || 0) * 100)}
                                        onChange={async e => {
                                            const val = parseFloat(e.target.value) / 100
                                            setProduits(prev => prev.map(p =>
                                                p.id === produitActifData.id ? { ...p, marge_securite: val } : p
                                            ))
                                            await supabase.from('produits').update({ marge_securite: val }).eq('id', produitActifData.id)
                                        }}
                                        style={inputStyle}
                                    />
                                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                                        Ex : 10%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Composants */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                    Composants & Accessoires
                                </p>
                                <button
                                    onClick={() => ajouterComposant(produitActifData.id)}
                                    style={{
                                        padding: '6px 14px', fontSize: '12px', fontWeight: 500,
                                        color: '#F0A02B', backgroundColor: '#FFF3DC',
                                        border: '1px solid #F0A02B', borderRadius: '8px',
                                        cursor: 'pointer', fontFamily: 'inherit'
                                    }}
                                >
                                    + Ajouter
                                </button>
                            </div>

                            {/* Tableau composants */}
                            <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                    <tr style={{ backgroundColor: '#0D2B55' }}>
                                        {['Libellé', 'Catégorie', 'Quantité', 'Prix unitaire', 'Total', ''].map(h => (
                                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#fff', fontWeight: 500, fontSize: '12px' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {compsActifs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                                                Aucun composant — cliquez sur "+ Ajouter"
                                            </td>
                                        </tr>
                                    ) : compsActifs.map((c, i) => (
                                        <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '8px 14px' }}>
                                                <input
                                                    type="text" value={c.libelle}
                                                    onChange={e => updateComposant(produitActifData.id, c.id, 'libelle', e.target.value)}
                                                    style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 14px' }}>
                                                <input
                                                    type="text" value={c.categorie || ''}
                                                    onChange={e => updateComposant(produitActifData.id, c.id, 'categorie', e.target.value)}
                                                    placeholder="Ex : Câblage"
                                                    style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 14px' }}>
                                                <input
                                                    type="number" value={c.quantite} min={0}
                                                    onChange={e => updateComposant(produitActifData.id, c.id, 'quantite', parseFloat(e.target.value))}
                                                    style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px', width: '80px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 14px' }}>
                                                <input
                                                    type="number" value={c.prix_unitaire} min={0}
                                                    onChange={e => updateComposant(produitActifData.id, c.id, 'prix_unitaire', parseFloat(e.target.value))}
                                                    style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px', width: '110px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 14px', fontWeight: 600, color: '#111827' }}>
                                                {formatNum(c.quantite * c.prix_unitaire)}
                                            </td>
                                            <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => supprimerComposant(produitActifData.id, c.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '18px' }}
                                                >
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Récapitulatif coûts */}
                            {compsActifs.length > 0 && (
                                <div style={{
                                    marginTop: '14px', backgroundColor: '#F9FAFB',
                                    borderRadius: '10px', padding: '14px 18px',
                                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px'
                                }}>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px' }}>Coût de revient</p>
                                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                            {formatNum(compsActifs.reduce((s, c) => s + c.quantite * c.prix_unitaire, 0))} {' '}
                                            <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF' }}>FCFA</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px' }}>
                                            Marge sécurité ({Math.round((produitActifData.marge_securite || 0) * 100)}%)
                                        </p>
                                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#F0A02B', margin: 0 }}>
                                            {formatNum(compsActifs.reduce((s, c) => s + c.quantite * c.prix_unitaire, 0) * (produitActifData.marge_securite || 0))} {' '}
                                            <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF' }}>FCFA</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px' }}>Coût de vente</p>
                                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#169B86', margin: 0 }}>
                                            {formatNum(coutVente)} {' '}
                                            <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF' }}>FCFA</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sauvegarder */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            {saved && <span style={{ fontSize: '13px', color: '#169B86', alignSelf: 'center' }}>✓ Sauvegardé</span>}
                            <button
                                onClick={() => { setSaved(true); onSave(); setTimeout(() => setSaved(false), 2000) }}
                                style={{
                                    padding: '10px 24px', fontSize: '13px', fontWeight: 600,
                                    color: '#fff', backgroundColor: '#F0A02B',
                                    border: 'none', borderRadius: '10px',
                                    cursor: 'pointer', fontFamily: 'inherit'
                                }}
                            >
                                Sauvegarder
                            </button>
                        </div>

                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                        Ajoutez un produit pour commencer
                    </div>
                )}
            </div>
        </div>
    )
}