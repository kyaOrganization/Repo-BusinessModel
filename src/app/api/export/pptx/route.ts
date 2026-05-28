/**
 * 10 slides structurées selon le brief :
 * 1. Présentation KYA-Energy Group
 * 2. Présentation du projet
 * 3. Hypothèses clés (TAM/SAM/SOM + marché + financières)
 * 4. Synthèse financière (CA, EBITDA, ROI, Payback)
 * 5. Avantages du produit
 * 6. Go-To-Market Strategy
 * 7. Analyse des risques
 * 8. Analyse SWOT
 * 9. Analyse PESTEL
 * 10. Call To Action
 *
 * Design : palette KYA (Navy #0D2B55 / Orange #F0A02B / Teal #169B86)
 */
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/superbase/server'
import pptxgen from 'pptxgenjs'

// ── Palette ───────────────────────────────────────────────────
const NAVY   = "0D2B55"
const ORANGE = "F0A02B"
const TEAL   = "169B86"
const WHITE  = "FFFFFF"
const LGRAY  = "F3F4F6"
const DGRAY  = "6B7280"
const NAVY_L = "E6F1FB"
const TEAL_L = "E1F5EE"

const SW = 13.33
const SH = 7.5

type Pres = pptxgen
type Slide = pptxgen.Slide
type HAlign = "center" | "left" | "right" | "justify"

function fmt(v: number | null | undefined): string {
    if (v === undefined || v === null) return '0'
    return new Intl.NumberFormat('fr-FR').format(Math.round(v))
}

function addHeader(s: Slide, title: string, subtitle?: string) {
    s.addShape('rect', { x: 0, y: 0, w: SW, h: 1.1, fill: { color: NAVY }, line: { color: NAVY } })
    s.addText(title, { x: 0.6, y: 0.15, w: SW - 1.2, h: 0.45, fontSize: 22, bold: true, color: WHITE, fontFace: "Calibri" })
    if (subtitle) {
        s.addText(subtitle, { x: 0.6, y: 0.60, w: SW - 1.2, h: 0.3, fontSize: 12, color: "A8C4E0", fontFace: "Calibri", italic: true })
    }
}

function addFooter(s: Slide, entNom: string) {
    s.addShape('rect', { x: 0.5, y: SH - 0.4, w: SW - 1.0, h: 0.02, fill: { color: ORANGE }, line: { color: ORANGE } })
    s.addText(`Confidentiel — © ${entNom || 'KYA-Energy Group'} — Document généré par KYA Business Model`, {
        x: 0.5, y: SH - 0.35, w: SW - 4, h: 0.25, fontSize: 9, color: DGRAY, fontFace: "Calibri"
    })
}

// ── Point d'entrée de l'API Next.js ────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id') || searchParams.get('projetId')

        if (!id) {
            return NextResponse.json({ error: "L'identifiant du projet est requis" }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: projet } = await supabase.from('projets').select('*').eq('id', id).single()
        if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

        const { data: profil }  = await supabase.from('profils_entreprise').select('*').eq('projet_id', id).single()
        const { data: hypo }    = await supabase.from('hypotheses_financieres').select('*').eq('projet_id', id).single()
        const { data: marches } = await supabase.from('marches_cibles').select('*').eq('projet_id', id)
        const { data: results } = await supabase.from('resultats_financiers').select('*').eq('projet_id', id).order('annee')
        const { data: risques } = await supabase.from('risques_projet').select('*').eq('projet_id', id)
        const { data: swot }    = await supabase.from('swot_projet').select('*').eq('projet_id', id)
        const { data: pestel }  = await supabase.from('pestel_projet').select('*').eq('projet_id', id)

        const ent = profil?.nom_entreprise || 'KYA-Energy Group'

        const pres: Pres = new pptxgen()
        pres.layout = 'LAYOUT_16x9'

        // ══ SLIDE 1 : PAGE DE GARDE ══
        {
            const s = pres.addSlide()
            s.addShape('rect', { x: 0, y: 0, w: SW, h: SH, fill: { color: NAVY } })
            s.addShape('rect', { x: 0, y: 0, w: 0.4, h: SH, fill: { color: ORANGE }, line: { color: ORANGE } })
            s.addText(projet.nom || "PROJET D'INVESTISSEMENT", { x: 1.0, y: 2.2, w: SW - 2, h: 0.8, fontSize: 36, bold: true, color: ORANGE, fontFace: "Calibri" })
            s.addText("DOSSIER DE PRÉSENTATION STRATÉGIQUE & FINANCIÈRE", { x: 1.0, y: 3.1, w: SW - 2, h: 0.4, fontSize: 14, bold: true, color: WHITE, fontFace: "Calibri" })
            const pitchText = profil?.pitch_entreprise || "Solutions énergétiques durables et innovantes pour l'Afrique."
            s.addText(pitchText, { x: 1.0, y: 4.0, w: SW - 4, h: 1.0, fontSize: 13, color: "E6F1FB", fontFace: "Calibri", wrap: true })
            s.addText(`Porteur du projet : ${ent}\nSecteur : ${profil?.secteur_activite || 'Énergies Renouvelables'}\nDate d'édition : ${new Date().toLocaleDateString('fr-FR')}`, {
                x: 1.0, y: SH - 1.5, w: 6.0, h: 0.8, fontSize: 11, color: "A8C4E0", fontFace: "Calibri"
            })
        }

        // ══ SLIDE 2 : PRÉSENTATION DU PROJET ══
        {
            const s = pres.addSlide()
            addHeader(s, "1. Présentation Globale du Projet", "Vision, objectifs cardinaux et opportunités du marché ciblé")
            addFooter(s, ent)
            s.addShape('rect', { x: 0.6, y: 1.6, w: 5.8, h: 5.0, fill: { color: LGRAY }, line: { color: "E5E7EB", width: 1 } })
            s.addShape('rect', { x: 0.6, y: 1.6, w: 5.8, h: 0.1, fill: { color: NAVY }, line: { color: NAVY } })
            s.addText("[ CONCEPT GENERAL ]", { x: 0.8, y: 1.9, w: 5.4, h: 0.3, fontSize: 11, bold: true, color: NAVY, fontFace: "Calibri" })
            s.addText(projet.description || "Aucune description fournie.", { x: 0.8, y: 2.3, w: 5.4, h: 4.0, fontSize: 12, color: "111827", fontFace: "Calibri", wrap: true, valign: "top" })
            s.addShape('rect', { x: 6.9, y: 1.6, w: 5.8, h: 5.0, fill: { color: NAVY_L }, line: { color: "D0E1F9", width: 1 } })
            s.addShape('rect', { x: 6.9, y: 1.6, w: 5.8, h: 0.1, fill: { color: ORANGE }, line: { color: ORANGE } })
            s.addText("[ OBJECTIFS STRATEGIQUES ]", { x: 7.1, y: 1.9, w: 5.4, h: 0.3, fontSize: 11, bold: true, color: NAVY, fontFace: "Calibri" })
            const objText = projet.objectifs || "Déploiement opérationnel, optimisation de la rentabilité et création d'impacts sociaux et environnementaux durables."
            s.addText(objText, { x: 7.1, y: 2.3, w: 5.4, h: 4.0, fontSize: 12, color: "111827", fontFace: "Calibri", wrap: true, valign: "top" })
        }

        // ══ SLIDE 3 : MARCHÉ TAM/SAM/SOM ══
        {
            const s = pres.addSlide()
            addHeader(s, "2. Analyse du Marché Potentiel", "Dimensionnement des segments TAM, SAM, SOM et structuration de la demande")
            addFooter(s, ent)
            const m = marches && marches[0]
            const cols = [
                { t: "TAM", sub: "Marché Total Disponible", val: m?.tam_valeur || 0, desc: m?.tam_Description || "Représente la demande totale théorique.", color: NAVY, bg: LGRAY },
                { t: "SAM", sub: "Marché Accessible",       val: m?.sam_valeur || 0, desc: m?.sam_Description || "Segment que nos produits ciblent directement.", color: ORANGE, bg: NAVY_L },
                { t: "SOM", sub: "Marché Capturable",       val: m?.som_valeur || 0, desc: m?.som_Description || "Part de marché réaliste à court/moyen terme.", color: TEAL, bg: TEAL_L }
            ]
            cols.forEach((c, idx) => {
                const x = 0.6 + idx * 4.1
                s.addShape('rect', { x, y: 1.8, w: 3.8, h: 4.8, fill: { color: c.bg }, line: { color: "E5E7EB", width: 1 } })
                s.addShape('rect', { x, y: 1.8, w: 3.8, h: 0.08, fill: { color: c.color }, line: { color: c.color } })
                s.addText(`[ ${c.t} ]`, { x: x + 0.2, y: 2.1, w: 3.4, h: 0.3, fontSize: 13, bold: true, color: c.color, fontFace: "Calibri" })
                s.addText(c.sub, { x: x + 0.2, y: 2.4, w: 3.4, h: 0.25, fontSize: 10, color: DGRAY, fontFace: "Calibri", italic: true })
                s.addText(`${fmt(c.val)} FCFA`, { x: x + 0.2, y: 2.8, w: 3.4, h: 0.5, fontSize: 18, bold: true, color: NAVY, fontFace: "Calibri" })
                s.addText(c.desc, { x: x + 0.2, y: 3.5, w: 3.4, h: 2.8, fontSize: 11, color: "374151", fontFace: "Calibri", wrap: true, valign: "top" })
            })
        }

        // ══ SLIDE 4 : SYNTHÈSE FINANCIÈRE ══
        {
            const s = pres.addSlide()
            addHeader(s, "3. Trajectoire de Croissance & Rentabilité", "Évolution du CA, de l'EBITDA et des indicateurs de performance")
            addFooter(s, ent)
            const items = (results || []).slice(0, 5)
            if (items.length > 0) {
                const tableRows: pptxgen.TableCell[][] = []
                const headerRow: pptxgen.TableCell[] = [{ text: "Indicateur (FCFA)", options: { fill: { color: NAVY }, color: WHITE, bold: true, fontSize: 11 } }]
                items.forEach(it => headerRow.push({ text: `Année ${it.annee}`, options: { fill: { color: NAVY }, color: WHITE, bold: true, fontSize: 11, align: "right" } }))
                tableRows.push(headerRow)
                const caRow: pptxgen.TableCell[] = [{ text: "Chiffre d'Affaires", options: { bold: true, fontSize: 10, fill: { color: LGRAY } } }]
                items.forEach(it => caRow.push({ text: fmt(it.chiffre_affaires), options: { fontSize: 10, align: "right", fill: { color: LGRAY } } }))
                tableRows.push(caRow)
                const ebitdaRow: pptxgen.TableCell[] = [{ text: "EBITDA", options: { bold: true, fontSize: 10 } }]
                items.forEach(it => ebitdaRow.push({ text: fmt(it.ebitda), options: { fontSize: 10, align: "right" } }))
                tableRows.push(ebitdaRow)
                const rnRow: pptxgen.TableCell[] = [{ text: "Résultat Net", options: { bold: true, fontSize: 10, fill: { color: LGRAY } } }]
                items.forEach(it => rnRow.push({ text: fmt(it.resultat_net), options: { fontSize: 10, align: "right", fill: { color: LGRAY } } }))
                tableRows.push(rnRow)
                const cashRow: pptxgen.TableCell[] = [{ text: "Trésorerie Clôture", options: { bold: true, fontSize: 10 } }]
                items.forEach(it => cashRow.push({ text: fmt(it.tresorerie_cumulee), options: { fontSize: 10, align: "right" } }))
                tableRows.push(cashRow)
                s.addTable(tableRows, { x: 0.6, y: 1.7, w: SW - 1.2, colW: [2.5, ...items.map(() => (SW - 3.7) / items.length)], border: { pt: 0.5, color: "E5E7EB" }, valign: "middle" })
            }
            const capX = 0.6, capY = 4.8, capW = (SW - 1.2) / 3
            const metrics = [
                { label: "TRI (Taux de Rentabilité Interne)", val: hypo?.tri ? `${(hypo.tri * 100).toFixed(1)}%` : 'Non calculé', color: TEAL },
                { label: "Délai de Récupération (Payback)",   val: hypo?.delai_recup ? `${hypo.delai_recup} ans` : 'Non calculé', color: ORANGE },
                { label: "VAN (Valeur Actuelle Nette)",        val: hypo?.van ? `${fmt(hypo.van)} FCFA` : 'Non calculé', color: NAVY }
            ]
            metrics.forEach((m, i) => {
                const x = capX + i * capW
                s.addShape('rect', { x: x + 0.1, y: capY, w: capW - 0.2, h: 1.4, fill: { color: LGRAY }, line: { color: "E5E7EB" } })
                s.addShape('rect', { x: x + 0.1, y: capY, w: 0.05, h: 1.4, fill: { color: m.color }, line: { color: m.color } })
                s.addText(m.label, { x: x + 0.3, y: capY + 0.2, w: capW - 0.6, h: 0.3, fontSize: 10, color: DGRAY, fontFace: "Calibri" })
                s.addText(m.val,   { x: x + 0.3, y: capY + 0.6, w: capW - 0.6, h: 0.5, fontSize: 16, bold: true, color: NAVY, fontFace: "Calibri" })
            })
        }

        // ══ SLIDE 5 : PROPOSITION DE VALEUR ══
        {
            const s = pres.addSlide()
            addHeader(s, "4. Proposition de Valeur Unique", "Avantages concurrentiels et barrières à l'entrée sur le marché")
            addFooter(s, ent)
            const propositions = [
                { t: "Efficacité Énergétique Maximale",  b: "Architecture optimisée garantissant un rendement supérieur aux solutions traditionnelles du marché.", c: NAVY },
                { t: "Robustesse & Fiabilité",           b: "Composants rigoureusement sélectionnés pour résister aux contraintes environnementales et climatiques locales.", c: ORANGE },
                { t: "Intégration Intelligente (IoT)",   b: "Supervision en temps réel et maintenance prédictive centralisée pour minimiser les arrêts d'exploitation.", c: TEAL }
            ]
            propositions.forEach((p, idx) => {
                const y = 1.7 + idx * 1.7
                s.addShape('rect', { x: 0.6, y, w: SW - 1.2, h: 1.4, fill: { color: LGRAY }, line: { color: "E5E7EB" } })
                s.addShape('rect', { x: 0.6, y, w: 0.1, h: 1.4, fill: { color: p.c }, line: { color: p.c } })
                s.addText(p.t, { x: 0.9, y: y + 0.2, w: SW - 2, h: 0.3, fontSize: 14, bold: true, color: NAVY, fontFace: "Calibri" })
                s.addText(p.b, { x: 0.9, y: y + 0.6, w: SW - 2, h: 0.6, fontSize: 11, color: "374151", fontFace: "Calibri", wrap: true })
            })
        }

        // ══ SLIDE 6 : GO-TO-MARKET ══
        {
            const s = pres.addSlide()
            addHeader(s, "5. Stratégie de Déploiement Commercial", "Plan Go-To-Market, canaux d'acquisition et pénétration sectorielle")
            addFooter(s, ent)
            const gtm = [
                { step: "Phase 1 : Pénétration",   title: "Ciblage Institutionnel & B2B",        body: "Approche directe des grands comptes industriels et déploiement de projets pilotes validant les performances en conditions réelles." },
                { step: "Phase 2 : Accélération",  title: "Réseau de Distribution Multi-canal",  body: "Alliances stratégiques avec des partenaires distributeurs locaux et intégrateurs certifiés pour démultiplier l'empreinte commerciale." },
                { step: "Phase 3 : Expansion",     title: "Diversification Offres & Services",   body: "Lancement de business models récurrents de type as-a-service et extension géographique vers les pays limitrophes." }
            ]
            gtm.forEach((g, idx) => {
                const x = 0.6 + idx * 4.1
                s.addShape('rect', { x, y: 1.8, w: 3.8, h: 4.8, fill: { color: WHITE }, line: { color: NAVY, width: 1.5 } })
                s.addShape('rect', { x: x + 0.2, y: 2.1, w: 3.4, h: 0.4, fill: { color: NAVY }, line: { color: NAVY } })
                s.addText(g.step, { x: x + 0.2, y: 2.1, w: 3.4, h: 0.4, fontSize: 10, bold: true, color: WHITE, align: "center" as HAlign, valign: "middle" })
                s.addText(g.title, { x: x + 0.2, y: 2.8, w: 3.4, h: 0.5, fontSize: 13, bold: true, color: ORANGE, fontFace: "Calibri", align: "center" as HAlign })
                s.addText(g.body,  { x: x + 0.2, y: 3.5, w: 3.4, h: 2.8, fontSize: 11, color: "374151", fontFace: "Calibri", wrap: true, valign: "top", align: "justify" as HAlign })
            })
        }

        // ══ SLIDE 7 : RISQUES ══
        {
            const s = pres.addSlide()
            addHeader(s, "6. Matrice des Risques & Atténuation", "Identification des facteurs critiques d'échec potentiel et plans de contingence")
            addFooter(s, ent)
            const list = (risques || []).slice(0, 4)
            if (list.length === 0) {
                s.addText("Aucun risque spécifique modélisé.", { x: 1.0, y: 3.0, w: SW - 2, h: 1.0, fontSize: 14, color: DGRAY, fontFace: "Calibri", align: "center" as HAlign })
            } else {
                const tRows: pptxgen.TableCell[][] = [[
                    { text: "Description du Risque",                    options: { fill: { color: NAVY }, color: WHITE, bold: true, fontSize: 11 } },
                    { text: "Probabilité",                               options: { fill: { color: NAVY }, color: WHITE, bold: true, fontSize: 11, align: "center" } },
                    { text: "Impact",                                    options: { fill: { color: NAVY }, color: WHITE, bold: true, fontSize: 11, align: "center" } },
                    { text: "Stratégie d'Atténuation / Contingence",    options: { fill: { color: NAVY }, color: WHITE, bold: true, fontSize: 11 } }
                ]]
                list.forEach((r, idx) => {
                    const bg = idx % 2 === 0 ? WHITE : LGRAY
                    tRows.push([
                        { text: r.description || '',                      options: { fill: { color: bg }, fontSize: 10 } },
                        { text: (r.probabilite || '').toUpperCase(),      options: { fill: { color: bg }, fontSize: 10, bold: true, align: "center", color: r.probabilite === 'forte' ? "991B1B" : "854F0B" } },
                        { text: (r.impact || '').toUpperCase(),           options: { fill: { color: bg }, fontSize: 10, bold: true, align: "center", color: ['eleve','critique'].includes(r.impact) ? "991B1B" : "854F0B" } },
                        { text: r.mesure_attenuation || "Suivi régulier des indicateurs.", options: { fill: { color: bg }, fontSize: 10 } }
                    ])
                })
                s.addTable(tRows, { x: 0.6, y: 1.7, w: SW - 1.2, colW: [3.5, 1.2, 1.2, 6.2], border: { pt: 0.5, color: "E5E7EB" }, valign: "middle" })
            }
        }

        // ══ SLIDE 8 : SWOT ══
        {
            const s = pres.addSlide()
            addHeader(s, "7. Matrice d'Analyse SWOT", "Forces, Faiblesses intrinsèques, Opportunités et Menaces environnementales")
            addFooter(s, ent)
            const f  = swot?.filter(x => x.type === 'force').map(x => x.element).join('\n· ')      || 'Expertise sectorielle'
            const fa = swot?.filter(x => x.type === 'faiblesse').map(x => x.element).join('\n· ')  || 'Besoin de financement de départ'
            const o  = swot?.filter(x => x.type === 'opportunite').map(x => x.element).join('\n· ')|| 'Forte demande du marché régional'
            const m  = swot?.filter(x => x.type === 'menace').map(x => x.element).join('\n· ')     || 'Incertitudes réglementaires'
            const quadrants = [
                { t: "FORCES (STRENGTHS)",              text: `· ${f}`,  x: 0.6, y: 1.7, bg: "E1F5EE", borderColor: TEAL },
                { t: "FAIBLESSES (WEAKNESSES)",         text: `· ${fa}`, x: 6.9, y: 1.7, bg: "FFF3DC", borderColor: ORANGE },
                { t: "OPPORTUNITÉS (OPPORTUNITIES)",    text: `· ${o}`,  x: 0.6, y: 4.5, bg: NAVY_L,   borderColor: NAVY },
                { t: "MENACES (THREATS)",               text: `· ${m}`,  x: 6.9, y: 4.5, bg: "FEE2E2", borderColor: "991B1B" }
            ]
            quadrants.forEach(q => {
                s.addShape('rect', { x: q.x, y: q.y, w: 5.8, h: 2.5, fill: { color: q.bg }, line: { color: q.borderColor, width: 1 } })
                s.addText(q.t, { x: q.x + 0.2, y: q.y + 0.15, w: 5.4, h: 0.3, fontSize: 11, bold: true, color: NAVY, fontFace: "Calibri" })
                s.addText(q.text, { x: q.x + 0.2, y: q.y + 0.5, w: 5.4, h: 1.8, fontSize: 10, color: "111827", fontFace: "Calibri", wrap: true, valign: "top" })
            })
        }

        // ══ SLIDE 9 : PESTEL ══
        {
            const s = pres.addSlide()
            addHeader(s, "8. Analyse d'Impact Environnemental PESTEL", "Évaluation des facteurs macro-environnementaux influençant l'écosystème du projet")
            addFooter(s, ent)
            const categories: Array<'politique' | 'economique' | 'social' | 'technologique' | 'ecologique' | 'legal'> = ['politique', 'economique', 'social', 'technologique', 'ecologique', 'legal']
            const pW = (SW - 1.4) / 6
            categories.forEach((cat, idx) => {
                const x = 0.6 + idx * (pW + 0.04)
                const filtered = pestel?.filter(p => p.categorie === cat).map(p => p.element).join('\n· ') || 'Analyse en cours.'
                s.addShape('rect', { x, y: 1.8, w: pW, h: 4.8, fill: { color: LGRAY }, line: { color: "E5E7EB" } })
                s.addShape('rect', { x, y: 1.8, w: pW, h: 0.08, fill: { color: NAVY }, line: { color: NAVY } })
                s.addText(cat.toUpperCase(), { x: x + 0.1, y: 2.0, w: pW - 0.2, h: 0.3, fontSize: 11, bold: true, color: NAVY, fontFace: "Calibri", align: "center" as HAlign })
                s.addText(`· ${filtered}`, { x: x + 0.1, y: 2.4, w: pW - 0.2, h: 4.0, fontSize: 9.5, color: "374151", fontFace: "Calibri", wrap: true, valign: "top" })
            })
        }

        // ══ SLIDE 10 : CALL TO ACTION ══
        {
            const s = pres.addSlide()
            s.addShape('rect', { x: 0, y: 0, w: SW, h: SH, fill: { color: NAVY } })
            s.addShape('rect', { x: 0, y: SH - 0.15, w: SW, h: 0.15, fill: { color: ORANGE }, line: { color: ORANGE } })
            s.addText("Rejoignez-nous dans cette transformation", { x: 0.5, y: 1.2, w: SW - 1, h: 0.5, fontSize: 28, bold: true, color: ORANGE, fontFace: "Calibri", align: "center" as HAlign })
            s.addText("Créons ensemble de la valeur durable et propulsons l'excellence opérationnelle.", { x: 0.5, y: 1.9, w: SW - 1, h: 0.4, fontSize: 13, color: WHITE, fontFace: "Calibri", align: "center" as HAlign, italic: true })
            const ctaList = [
                { title: "PARTENARIATS", body: "Construisons des relations à long terme pour pérenniser l'écosystème.",                               color: ORANGE },
                { title: "RENTABILITÉ",  body: "Un modèle financier robuste validé garantissant un retour sur investissement rapide.",                 color: WHITE },
                { title: "IMPACT ODD",   body: "Alignement strict avec les Objectifs de Développement Durable des Nations Unies.",                   color: TEAL }
            ]
            const cW = 3.6
            ctaList.forEach((cta, i) => {
                const x = 1.1 + i * 4.0
                const ctaY = 2.8
                s.addShape('rect', { x, y: ctaY, w: cW, h: 2.4, fill: { color: "none" }, line: { color: cta.color, width: 1.5 } })
                s.addShape('rect', { x, y: ctaY, w: cW, h: 0.07, fill: { color: cta.color }, line: { color: cta.color } })
                s.addText(cta.title, { x: x + 0.1, y: ctaY + 0.1, w: cW - 0.2, h: 0.35, fontSize: 10, bold: true, color: cta.color, fontFace: "Calibri" })
                s.addText(cta.body,  { x: x + 0.1, y: ctaY + 0.48, w: cW - 0.2, h: 1.62, fontSize: 10, color: WHITE, fontFace: "Calibri", wrap: true, valign: "top" })
            })
            s.addText(`${profil?.localisation || 'Lomé, Togo'} - ${ent}`, { x: 0.5, y: SH - 0.6, w: SW - 1, h: 0.25, fontSize: 9, color: "A8C4E0", fontFace: "Calibri", align: "center" as HAlign })
        }

        // ── Génération du buffer et envoi ──────────────────────────────
        const buffer = await pres.write({ outputType: 'nodebuffer' })
        const nom = (projet.nom || 'Presentation')
            .replace(/[^\x00-\x7F]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .trim() || 'Presentation'

        return new NextResponse(new Uint8Array(buffer as any), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="BusinessModel_${nom}.pptx"; filename*=UTF-8''BusinessModel_${encodeURIComponent(projet.nom || 'Presentation')}.pptx`
            }
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        const stack   = err instanceof Error ? err.stack   : ''
        console.error('[EXPORT PPTX ERROR]', message, stack)
        return NextResponse.json({ error: message, stack }, { status: 500 })
    }
}