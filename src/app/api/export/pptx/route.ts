/**
 * EXPORT PPTX — route.ts v3
 * Fichier : src/app/api/export/pptx/route.ts
 *
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
 * Motif : fond blanc, encadrés couleur, icônes emoji rasterisés, typo Calibri
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/superbase/server'
import pptxgen from 'pptxgenjs'
import * as fs from 'fs'
import * as path from 'path'

// ── Palette ───────────────────────────────────────────────────
const NAVY   = "0D2B55"
const ORANGE = "F0A02B"
const TEAL   = "169B86"
const WHITE  = "FFFFFF"
const LGRAY  = "F3F4F6"
const DGRAY  = "6B7280"
const NAVY_L = "E6F1FB"
const TEAL_L = "E1F5EE"
const ORANGE_L = "FFF3DC"

// ── Dimensions slide 16x9 (10" × 5.625") ──────────────────────
const SW = 10
const SH = 5.625

// ── Formatage ─────────────────────────────────────────────────
const fmt    = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const fmtM   = (n: number) => `${(n / 1_000_000).toFixed(1)} M`
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

// ── Logo ──────────────────────────────────────────────────────
function getLogo(): { base64: string; ext: string } | null {
    for (const ext of ['png', 'jpg', 'jpeg']) {
        const p = path.join(process.cwd(), 'public', `kya_logo_light.${ext}`)
        if (fs.existsSync(p)) return { base64: fs.readFileSync(p).toString('base64'), ext: ext === 'jpg' ? 'jpeg' : ext }
    }
    return null
}

// ── TRI ───────────────────────────────────────────────────────
function calculerTRI(fluxNets: number[]): number {
    const van = (r: number) => fluxNets.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0)
    let lo = -0.99, hi = 10
    if (van(lo) * van(hi) > 0) return 0
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2
        if (Math.abs(hi - lo) < 0.0001) return mid
        van(mid) * van(lo) < 0 ? (hi = mid) : (lo = mid)
    }
    return (lo + hi) / 2
}

// ══════════════════════════════════════════════════════════════
// HELPERS SLIDES
// ══════════════════════════════════════════════════════════════

type Pres = ReturnType<typeof pptxgen>
type Slide = ReturnType<Pres['addSlide']>

/**
 * Header commun : bande navy haut + logo + titre slide + info droite
 */
function addHeader(
    pres: Pres,
    slide: Slide,
    title: string,
    logo: ReturnType<typeof getLogo>,
    projetNom: string,
    entrepriseNom: string,
    slideNum: number,
    totalSlides = 10,
) {
    // Fond header
    slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: 0, w: SW, h: 0.82,
        fill: { color: NAVY }, line: { color: NAVY },
    })
    // Accent orange
    slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: 0, w: SW, h: 0.05,
        fill: { color: ORANGE }, line: { color: ORANGE },
    })

    // Logo
    if (logo) {
        slide.addImage({
            data: `data:image/${logo.ext};base64,${logo.base64}`,
            x: 0.18, y: 0.1, w: 0.55, h: 0.55,
        })
    }

    // Titre slide (blanc, grand)
    slide.addText(title, {
        x: 0.88, y: 0.1, w: 6.5, h: 0.6,
        fontSize: 20, bold: true, color: WHITE, fontFace: "Calibri",
        valign: "middle",
    })

    // Info droite : entreprise + num slide
    slide.addText(`${entrepriseNom}   ·   ${projetNom}`, {
        x: 7.4, y: 0.1, w: 2.5, h: 0.3,
        fontSize: 7, color: "A8C4E0", fontFace: "Calibri",
        align: "right",
    })
    slide.addText(`${slideNum} / ${totalSlides}`, {
        x: 7.4, y: 0.42, w: 2.5, h: 0.28,
        fontSize: 8, color: ORANGE, fontFace: "Calibri",
        align: "right", bold: true,
    })
}

/**
 * Footer commun
 */
function addFooter(pres: Pres, slide: Slide, entrepriseNom: string) {
    slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: SH - 0.32, w: SW, h: 0.32,
        fill: { color: TEAL }, line: { color: TEAL },
    })
    slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: SH - 0.04, w: SW, h: 0.04,
        fill: { color: ORANGE }, line: { color: ORANGE },
    })
    slide.addText(
        `${entrepriseNom}   ·   Document confidentiel   ·   Généré le ${new Date().toLocaleDateString('fr-FR')}`,
        { x: 0.3, y: SH - 0.28, w: 9.4, h: 0.22, fontSize: 7, color: WHITE, fontFace: "Calibri", align: "center" }
    )
}

/** Zone de contenu disponible : entre le header (0.82) et le footer (SH - 0.32) */
const CONTENT_Y = 0.88
const CONTENT_H = SH - 0.32 - CONTENT_Y  // ≈ 4.41"

/**
 * Titre de section dans la zone de contenu
 */
function sectionTitle(slide: Slide, text: string, color = ORANGE, y = CONTENT_Y) {
    slide.addText(text, {
        x: 0.3, y, w: SW - 0.6, h: 0.36,
        fontSize: 13, bold: true, color,
        fontFace: "Calibri", valign: "middle",
    })
}

/**
 * Carte colorée (encadré avec titre + contenu)
 */
function addCard(
    pres: Pres,
    slide: Slide,
    x: number, y: number, w: number, h: number,
    title: string, body: string | string[],
    accent = ORANGE,
    bgColor = WHITE,
    textColor = "111827",
) {
    // Fond
    slide.addShape(pres.shapes.RECTANGLE, {
        x, y, w, h,
        fill: { color: bgColor },
        line: { color: accent, width: 1.5 },
        shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 },
    })
    // Accent haut
    slide.addShape(pres.shapes.RECTANGLE, {
        x, y, w, h: 0.07,
        fill: { color: accent }, line: { color: accent },
    })
    // Titre carte
    slide.addText(title, {
        x: x + 0.1, y: y + 0.08, w: w - 0.2, h: 0.3,
        fontSize: 10, bold: true, color: accent, fontFace: "Calibri",
    })
    // Corps
    const bodyItems = Array.isArray(body)
        ? body.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < body.length - 1, fontSize: 9, color: textColor, fontFace: "Calibri" } }))
        : [{ text: body, options: { fontSize: 9, color: textColor, fontFace: "Calibri" } }]
    slide.addText(bodyItems as any, {
        x: x + 0.12, y: y + 0.38, w: w - 0.24, h: h - 0.48,
        valign: "top",
    })
}

/**
 * KPI card grand format
 */
function addKpiCard(
    pres: Pres,
    slide: Slide,
    x: number, y: number, w: number, h: number,
    label: string, value: string, sub: string,
    color = TEAL,
) {
    slide.addShape(pres.shapes.RECTANGLE, {
        x, y, w, h,
        fill: { color: WHITE },
        line: { color: LGRAY, width: 1 },
        shadow: { type: "outer", blur: 5, offset: 2, angle: 135, color: "000000", opacity: 0.1 },
    })
    slide.addShape(pres.shapes.RECTANGLE, {
        x, y, w, h: 0.08,
        fill: { color: color }, line: { color: color },
    })
    slide.addText(label, {
        x: x + 0.1, y: y + 0.1, w: w - 0.2, h: 0.25,
        fontSize: 8, color: DGRAY, fontFace: "Calibri",
    })
    slide.addText(value, {
        x: x + 0.1, y: y + 0.34, w: w - 0.2, h: 0.45,
        fontSize: 22, bold: true, color, fontFace: "Calibri", align: "center",
    })
    slide.addText(sub, {
        x: x + 0.1, y: y + 0.8, w: w - 0.2, h: 0.2,
        fontSize: 7, color: DGRAY, fontFace: "Calibri", align: "center",
    })
}

// ════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const projetId = searchParams.get('projetId')
    if (!projetId) return NextResponse.json({ error: 'projetId requis' }, { status: 400 })

    const supabase = await createClient()
    const [
        { data: projet },
        { data: profil },
        { data: produits },
        { data: hyps },
        { data: capex },
        { data: opex },
        { data: partenaires },
        { data: concurrents },
        { data: resultats },
        { data: risques },
        { data: impacts },
        { data: kpis },
    ] = await Promise.all([
        supabase.from('projets').select('*').eq('id', projetId).single(),
        supabase.from('entreprise_profil').select('*').eq('projet_id', projetId).single(),
        supabase.from('produits').select('*').eq('projet_id', projetId),
        supabase.from('hypotheses').select('*').eq('projet_id', projetId),
        supabase.from('capex').select('*').eq('projet_id', projetId),
        supabase.from('opex').select('*').eq('projet_id', projetId),
        supabase.from('partenaires_financiers').select('*').eq('projet_id', projetId),
        supabase.from('concurrents').select('*').eq('projet_id', projetId),
        supabase.from('resultats_financiers').select('*').eq('projet_id', projetId).order('annee'),
        supabase.from('risques_projet').select('*').eq('projet_id', projetId),
        supabase.from('impacts_projet').select('*').eq('projet_id', projetId),
        supabase.from('kpis_projet').select('*').eq('projet_id', projetId).single(),
    ])

    if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const hyp = (cle: string, defaut = 0) => hyps?.find(h => h.cle === cle)?.valeur ?? defaut

    // Données calculées
    const totalCapex = (capex || []).reduce((s, c) => s + c.montant, 0)
    const totalFin   = (partenaires || []).reduce((s, p) => s + p.montant, 0)
    const totalFP    = (partenaires || []).filter(p => p.type_financement === 'fonds_propres').reduce((s, p) => s + p.montant, 0)
    const totalDette = (partenaires || []).filter(p => p.type_financement === 'emprunt').reduce((s, p) => s + p.montant, 0)
    const r1 = resultats?.[0]
    const rN = resultats?.[resultats.length - 1]
    const anneeDebut = projet.annee_demarrage || 2026
    const duree = projet.duree_projet || 5
    const ent = profil?.nom_entreprise || 'KYA-Energy Group'
    const logo = getLogo()

    const triVal = kpis?.tri ? kpis.tri : 0
    const vanVal = kpis?.van ? kpis.van : 0
    const payback = kpis?.payback_annees || 0

    // ── CRÉATION PPTX ─────────────────────────────────────────
    const pres = new pptxgen()
    pres.layout = 'LAYOUT_16x9'
    pres.title  = `${projet.nom} — Business Model`

    const addSlide = (title: string, num: number) => {
        const s = pres.addSlide()
        s.background = { color: WHITE }
        addHeader(pres, s, title, logo, projet.nom, ent, num)
        addFooter(pres, s, ent)
        return s
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 1 — PRÉSENTATION KYA-ENERGY GROUP
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Présentation de ' + ent, 1)
        const Y = CONTENT_Y + 0.1

        // Bloc gauche : identité
        addCard(pres, s, 0.25, Y, 4.5, 1.5, 'Notre société', [
            `Fondée en ${profil?.annee_creation || 2015}`,
            profil?.localisation || 'Lomé, Togo',
            profil?.effectif || '30 ingénieurs et techniciens',
            profil?.certifications || 'ISO 9001:2015',
        ], NAVY, WHITE)

        addCard(pres, s, 0.25, Y + 1.6, 4.5, 1.5, 'Notre mission', profil?.mission || '—', TEAL, WHITE)

        addCard(pres, s, 0.25, Y + 3.2, 4.5, 0.95, 'Notre vision', profil?.vision || '—', ORANGE, WHITE)

        // Bloc droit : valeurs + slogan
        addCard(pres, s, 5.0, Y, 4.65, 1.5, 'Nos valeurs', [
            ...(profil?.valeurs || 'Professionnalisme, Intégrité, Innovation').split(',').map(v => v.trim()).slice(0, 5),
        ], ORANGE, ORANGE_L)

        addCard(pres, s, 5.0, Y + 1.6, 4.65, 1.5, 'Positionnement', [
            `Secteur : ${projet.secteur || 'Énergie'}`,
            profil?.expertise_cle ? profil.expertise_cle.substring(0, 80) : 'Solutions solaires innovantes pour l\'Afrique',
        ], TEAL, TEAL_L)

        // Slogan central
        s.addShape(pres.shapes.RECTANGLE, {
            x: 5.0, y: Y + 3.2, w: 4.65, h: 0.95,
            fill: { color: NAVY }, line: { color: NAVY },
        })
        s.addText(`"${profil?.slogan || 'Move beyond the sky !'}"`, {
            x: 5.1, y: Y + 3.3, w: 4.45, h: 0.75,
            fontSize: 14, bold: true, color: ORANGE, fontFace: "Calibri",
            align: "center", italic: true, valign: "middle",
        })
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 2 — PRÉSENTATION DU PROJET
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Présentation du projet', 2)
        const Y = CONTENT_Y + 0.05

        // Titre projet + badge
        s.addShape(pres.shapes.RECTANGLE, {
            x: 0.25, y: Y, w: 9.5, h: 0.52,
            fill: { color: NAVY_L }, line: { color: NAVY },
        })
        s.addText(projet.nom, {
            x: 0.4, y: Y + 0.06, w: 7, h: 0.4,
            fontSize: 16, bold: true, color: NAVY, fontFace: "Calibri",
        })
        s.addText(`N° ${projet.numero_projet || '—'}   ·   ${anneeDebut}–${anneeDebut + duree - 1}`, {
            x: 7.4, y: Y + 0.1, w: 2.3, h: 0.32,
            fontSize: 9, color: DGRAY, fontFace: "Calibri", align: "right",
        })

        // Description
        s.addText(projet.description || 'Aucune description renseignée.', {
            x: 0.25, y: Y + 0.62, w: 9.5, h: 0.6,
            fontSize: 10, color: "374151", fontFace: "Calibri",
            wrap: true,
        })

        // 3 cartes : Description / Persona / Problématique
        const products = (produits || []).map(p => p.nom).join(', ') || '—'
        addCard(pres, s, 0.25, Y + 1.3, 2.9, 2.5, 'Produit / Service', [
            projet.produit_principal || products,
            `Secteur : ${projet.secteur || '—'}`,
            `Durée : ${duree} ans`,
        ], ORANGE, WHITE)

        addCard(pres, s, 3.3, Y + 1.3, 3.1, 2.5, 'Persona', [
            'Techniciens solaires',
            'Bureaux d\'études en énergie',
            'Institutions académiques',
            'Opérateurs locaux',
        ], TEAL, WHITE)

        addCard(pres, s, 6.55, Y + 1.3, 3.2, 2.5, 'Problématique', [
            'Surdimensionnement coûteux (+30-50%)',
            'Outils inadaptés au marché local',
            'Barrière économique à l\'adoption',
            'Manque d\'outils accessibles',
        ], NAVY, WHITE)
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 3 — HYPOTHÈSES CLÉS
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Hypothèses clés', 3)
        const Y = CONTENT_Y + 0.05

        // TAM / SAM / SOM
        const tamY = Y
        s.addShape(pres.shapes.RECTANGLE, {
            x: 0.25, y: tamY, w: 9.5, h: 0.35,
            fill: { color: NAVY }, line: { color: NAVY },
        })
        s.addText('Taille de marché', {
            x: 0.4, y: tamY + 0.05, w: 9.2, h: 0.25,
            fontSize: 11, bold: true, color: WHITE, fontFace: "Calibri",
        })

        const markets = [
            { label: 'TAM', sub: 'Marché total adressable', val: 'Afrique : +20%/an', color: NAVY },
            { label: 'SAM', sub: 'Marché adressable ciblé', val: 'CEDEAO + Francophonie', color: TEAL },
            { label: 'SOM', sub: 'Marché capturable', val: `${(hyp('volume_initial', 100) * Math.pow(1 + hyp('taux_croissance', 0.25), duree - 1)).toFixed(0)} clients / an`, color: ORANGE },
        ]
        markets.forEach((m, i) => {
            const mx = 0.25 + i * 3.17
            s.addShape(pres.shapes.RECTANGLE, {
                x: mx, y: tamY + 0.4, w: 3.07, h: 1.15,
                fill: { color: i === 0 ? NAVY_L : i === 1 ? TEAL_L : ORANGE_L },
                line: { color: m.color, width: 2 },
            })
            s.addText(m.label, {
                x: mx + 0.1, y: tamY + 0.46, w: 1, h: 0.42,
                fontSize: 22, bold: true, color: m.color, fontFace: "Calibri",
            })
            s.addText(m.sub, {
                x: mx + 0.1, y: tamY + 0.9, w: 2.8, h: 0.22,
                fontSize: 8, color: DGRAY, fontFace: "Calibri",
            })
            s.addText(m.val, {
                x: mx + 0.1, y: tamY + 1.12, w: 2.8, h: 0.28,
                fontSize: 9, bold: true, color: m.color, fontFace: "Calibri",
            })
        })

        // Hypothèses marché + financières
        const hypsMarche = (hyps || []).filter(h =>
            ['taux_croissance', 'volume_initial', 'taux_retention', 'taux_conversion_premium'].includes(h.cle)
        )
        const hypsFin = (hyps || []).filter(h =>
            ['taux_is', 'wacc', 'fonds_propres', 'emprunts', 'marge_beneficiaire'].includes(h.cle)
        )

        const cardY = tamY + 1.72
        addCard(pres, s, 0.25, cardY, 4.65, 1.95, 'Hypothèses marché',
            hypsMarche.length > 0
                ? hypsMarche.map(h => `${h.description || h.cle} : ${h.unite?.includes('%') ? `${(h.valeur * 100).toFixed(1)}%` : String(h.valeur)} ${h.unite || ''}`)
                : ['Taux de croissance : 25%/an', 'Rétention : 85%', 'Volume initial : 100 unités', 'Taux de conversion : 20%'],
            TEAL, WHITE)

        addCard(pres, s, 5.1, cardY, 4.65, 1.95, 'Hypothèses financières',
            hypsFin.length > 0
                ? hypsFin.map(h => `${h.description || h.cle} : ${h.unite?.includes('%') ? `${(h.valeur * 100).toFixed(1)}%` : String(h.valeur)} ${h.unite || ''}`)
                : ['WACC : 10%', 'IS : 27%', 'Fonds propres : 30%', 'Emprunt : 70%', 'Marge : 20%'],
            ORANGE, WHITE)
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 4 — SYNTHÈSE FINANCIÈRE
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Synthèse financière', 4)
        const Y = CONTENT_Y + 0.1

        // KPIs principaux — 4 grandes cartes
        const kpiRow = [
            { label: 'CA An 1', value: r1 ? `${fmtM(r1.ca_total)} FCFA` : '—', sub: `Cible An ${anneeDebut}`, color: NAVY },
            { label: `CA An ${duree}`, value: rN ? `${fmtM(rN.ca_total)} FCFA` : '—', sub: `Cible An ${anneeDebut + duree - 1}`, color: TEAL },
            { label: 'EBITDA (fin)', value: rN ? `${fmtM(rN.ebitda)} FCFA` : '—', sub: `An ${anneeDebut + duree - 1}`, color: rN && rN.ebitda > 0 ? TEAL : "E24B4A" },
            { label: 'TRI', value: triVal > 0 ? `${(triVal * 100).toFixed(1)}%` : '—', sub: 'Taux de rentabilité', color: triVal > 0.15 ? TEAL : ORANGE },
            { label: 'VAN', value: vanVal > 0 ? `${fmtM(vanVal)} FCFA` : '—', sub: 'Valeur actuelle nette', color: vanVal > 0 ? TEAL : "E24B4A" },
            { label: 'Payback', value: payback > 0 && isFinite(payback) ? `${payback.toFixed(1)} ans` : '> durée', sub: 'Délai récupération', color: ORANGE },
            { label: 'Financement', value: `${fmtM(totalFin)} FCFA`, sub: `FP ${fmtM(totalFP)} + Dette ${fmtM(totalDette)}`, color: NAVY },
            { label: 'Résultat net cumulé', value: resultats ? `${fmtM(resultats.reduce((s, r) => s + r.resultat_net, 0))} FCFA` : '—', sub: `Sur ${duree} ans`, color: TEAL },
        ]

        const cols = 4
        const cardW = (SW - 0.5) / cols - 0.1
        kpiRow.forEach((k, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            addKpiCard(pres, s, 0.25 + col * (cardW + 0.1), Y + row * 1.2, cardW, 1.1, k.label, k.value, k.sub, k.color)
        })

        // Mini graphe en barres (tableau textuel) si résultats
        if (resultats && resultats.length > 0) {
            const chartY = Y + 2.5
            s.addText('Évolution du Chiffre d\'Affaires (M FCFA)', {
                x: 0.25, y: chartY, w: 9.5, h: 0.28,
                fontSize: 10, bold: true, color: NAVY, fontFace: "Calibri",
            })
            s.addChart(pres.charts.BAR, [{
                name: "CA",
                labels: resultats.map(r => String(r.annee)),
                values: resultats.map(r => Math.round(r.ca_total / 1_000_000 * 10) / 10),
            }, {
                name: "Résultat net",
                labels: resultats.map(r => String(r.annee)),
                values: resultats.map(r => Math.round(r.resultat_net / 1_000_000 * 10) / 10),
            }], {
                x: 0.25, y: chartY + 0.3, w: 9.5, h: 1.75,
                barDir: 'col',
                chartColors: [TEAL, ORANGE],
                chartArea: { fill: { color: WHITE }, roundedCorners: false },
                catAxisLabelColor: DGRAY,
                valAxisLabelColor: DGRAY,
                valGridLine: { color: "E2E8F0", size: 0.5 },
                catGridLine: { style: "none" },
                showValue: true,
                dataLabelColor: "1E293B",
                showLegend: true,
                legendPos: 'b',
                legendFontSize: 8,
            })
        }
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 5 — AVANTAGES DU PRODUIT
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Avantages du produit', 5)
        const Y = CONTENT_Y + 0.05

        // Titre produit
        const prodName = (produits || [])[0]?.nom || projet.produit_principal || 'Notre produit'
        s.addShape(pres.shapes.RECTANGLE, {
            x: 0.25, y: Y, w: 9.5, h: 0.44,
            fill: { color: ORANGE_L }, line: { color: ORANGE },
        })
        s.addText(prodName, {
            x: 0.4, y: Y + 0.06, w: 9.2, h: 0.32,
            fontSize: 14, bold: true, color: NAVY, fontFace: "Calibri",
        })

        // 3 colonnes : Différenciation / Innovation / Valeur ajoutée
        const cols3 = [
            {
                title: 'Différenciation',
                items: concurrents && concurrents.length > 0
                    ? concurrents.slice(0, 3).map(c => c.notre_differenciation?.substring(0, 60) || `vs ${c.nom}`)
                    : ['Prix accessibles vs concurrents', 'Adapté au marché africain', 'Support mobile money', 'Interface simplifiée'],
                color: ORANGE,
            },
            {
                title: 'Innovation',
                items: (produits || []).length > 0
                    ? (produits || []).flatMap(p => [p.proposition_valeur?.substring(0, 60) || p.nom]).slice(0, 4)
                    : ['Algorithme KEG breveté', 'Réduction 30-50% des coûts', 'Dimensionnement optimisé', 'Critères LCOA / LPSP / LOLP'],
                color: TEAL,
            },
            {
                title: 'Valeur ajoutée',
                items: [
                    'Économie directe pour les clients',
                    'Formations & certification',
                    'Support technique dédié',
                    'Mises à jour régulières',
                ],
                color: NAVY,
            },
        ]
        const cW = (SW - 0.7) / 3 - 0.1
        cols3.forEach((col, i) => {
            addCard(pres, s, 0.25 + i * (cW + 0.1), Y + 0.55, cW, CONTENT_H - 0.6, col.title, col.items, col.color, WHITE)
        })
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 6 — GO-TO-MARKET STRATEGY
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Go-To-Market Strategy', 6)
        const Y = CONTENT_Y + 0.05

        // 3 colonnes : Acquisition / Partenariats / Déploiement
        const gtm = [
            {
                title: 'Acquisition', color: ORANGE,
                items: [
                    'Marketing digital (SEO, réseaux sociaux)',
                    'Campagnes emailing ciblées',
                    'Webinaires de démonstration',
                    'Modèle Freemium → Conversion',
                    'Tutoriels vidéo & études de cas',
                ],
            },
            {
                title: 'Partenariats', color: TEAL,
                items: [
                    'Universités & centres de formation',
                    'Autorités de régulation (AT2ER)',
                    'Réseau de formateurs certifiés',
                    'CEDEAO & ECREEE',
                    'Partenaires bancaires (mobile money)',
                ],
            },
            {
                title: 'Déploiement', color: NAVY,
                items: [
                    `Phase 1 (${anneeDebut}) : Lancement Togo`,
                    `Phase 2 : CEDEAO francophone`,
                    `Phase 3 : Afrique anglophone`,
                    `Phase 4 : Leader continental`,
                    `Cible ${anneeDebut + duree - 1} : ${fmt(hyp('volume_initial', 100) * Math.pow(1.25, duree - 1))} clients`,
                ],
            },
        ]

        const cW = (SW - 0.7) / 3 - 0.1
        gtm.forEach((col, i) => {
            addCard(pres, s, 0.25 + i * (cW + 0.1), Y, cW, CONTENT_H, col.title, col.items, col.color, WHITE)
        })

        // Timeline visuelle en bas
        if (resultats && resultats.length > 0) {
            const timeY = CONTENT_Y + CONTENT_H - 0.05
            s.addShape(pres.shapes.RECTANGLE, {
                x: 0.25, y: timeY + 0.05, w: 9.5, h: 0.28,
                fill: { color: LGRAY }, line: { color: LGRAY },
            })
        }
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 7 — ANALYSE DES RISQUES
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Analyse des risques', 7)
        const Y = CONTENT_Y + 0.05

        const risquesAll = risques && risques.length > 0 ? risques : [
            { description: 'Retard acquisition clients', probabilite: 'moyenne', niveau_risque: 'modere', mesure_mitigation: 'Réserve de 12 mois d\'OPEX', categorie: 'Financier' },
            { description: 'Défaillance technique logiciel', probabilite: 'faible', niveau_risque: 'eleve', mesure_mitigation: 'Sauvegarde + support dédié', categorie: 'Technique' },
            { description: 'Concurrence agressive', probabilite: 'moyenne', niveau_risque: 'modere', mesure_mitigation: 'Différenciation prix + fonctionnalités', categorie: 'Marché' },
        ]

        // Groupes de risques
        const riskGroups = [
            { key: 'Opérationnel', title: 'Risques opérationnels', color: NAVY, items: risquesAll.filter(r => ['Opérationnel', 'Technique'].includes(r.categorie || '')) },
            { key: 'Marché', title: 'Risques marchés', color: ORANGE, items: risquesAll.filter(r => ['Marché', 'Concurrentiel'].includes(r.categorie || '')) },
            { key: 'Financier', title: 'Risques financiers', color: TEAL, items: risquesAll.filter(r => ['Financier', 'Liquidité'].includes(r.categorie || '')) },
        ]

        const cW = (SW - 0.7) / 3 - 0.1
        riskGroups.forEach((grp, i) => {
            const items = grp.items.length > 0
                ? grp.items.map(r => `${r.description} → ${r.mesure_mitigation || '—'}`.substring(0, 75))
                : ['Aucun risque identifié dans cette catégorie']
            addCard(pres, s, 0.25 + i * (cW + 0.1), Y, cW, CONTENT_H, grp.title, items, grp.color, WHITE)
        })

        // Matrice visuelle simplifiée (indicateurs)
        const critiques  = risquesAll.filter(r => r.niveau_risque === 'critique').length
        const eleves     = risquesAll.filter(r => r.niveau_risque === 'eleve').length
        const moderes    = risquesAll.filter(r => r.niveau_risque === 'modere').length
        const faibles    = risquesAll.filter(r => r.niveau_risque === 'faible').length

        const statY = CONTENT_Y + CONTENT_H - 0.82
        ;[
            { label: 'Critiques', val: critiques, color: "991B1B" },
            { label: 'Élevés', val: eleves, color: "E24B4A" },
            { label: 'Modérés', val: moderes, color: "854F0B" },
            { label: 'Faibles', val: faibles, color: TEAL },
        ].forEach((st, i) => {
            s.addShape(pres.shapes.RECTANGLE, {
                x: 0.25 + i * 2.43, y: statY, w: 2.28, h: 0.62,
                fill: { color: WHITE }, line: { color: st.color, width: 1.5 },
            })
            s.addText(`${st.val}`, {
                x: 0.3 + i * 2.43, y: statY + 0.04, w: 0.7, h: 0.54,
                fontSize: 22, bold: true, color: st.color, fontFace: "Calibri",
            })
            s.addText(st.label, {
                x: 1.0 + i * 2.43, y: statY + 0.16, w: 1.4, h: 0.3,
                fontSize: 9, color: st.color, fontFace: "Calibri",
            })
        })
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 8 — ANALYSE SWOT
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Analyse SWOT', 8)
        const Y = CONTENT_Y + 0.05

        const swot = [
            {
                title: 'Forces', color: TEAL, fill: TEAL_L, x: 0.25, y: Y,
                items: [
                    'Innovation technologique (méthode KEG)',
                    `${profil?.certifications || 'ISO 9001:2015'} — seule entreprise certifiée`,
                    `${profil?.effectif || '30+'} ingénieurs expérimentés`,
                    'Base de 300+ utilisateurs bêta',
                    'Prix accessible via mobile money',
                ],
            },
            {
                title: 'Faiblesses', color: ORANGE, fill: ORANGE_L, x: 5.1, y: Y,
                items: [
                    'Notoriété internationale limitée',
                    'Dépendance au marché africain',
                    'Ressources R&D limitées',
                    'Phase de trésorerie négative (An 1-2)',
                ],
            },
            {
                title: 'Opportunités', color: NAVY, fill: NAVY_L, x: 0.25, y: Y + 2.3,
                items: [
                    'Croissance solaire Afrique +20%/an',
                    '620 M personnes sans électricité',
                    'ODD 7 : financement international',
                    'Digitalisation des formations',
                    `Expansion ${anneeDebut + 2}+ : marchés anglophones`,
                ],
            },
            {
                title: 'Menaces', color: "991B1B", fill: "FEE2E2", x: 5.1, y: Y + 2.3,
                items: [
                    'Entrée de logiciels internationaux lowcost',
                    'Instabilité réglementaire locale',
                    'Volatilité des taux de change',
                    'Adoption lente des outils digitaux',
                ],
            },
        ]

        const cW = 4.6
        const cH = 2.1
        swot.forEach(q => {
            addCard(pres, s, q.x, q.y, cW, cH, q.title, q.items, q.color, q.fill)
        })

        // Centre SWOT label
        s.addShape(pres.shapes.RECTANGLE, {
            x: 4.72, y: Y + 0.9, w: 0.38, h: 2.45,
            fill: { color: WHITE }, line: { color: WHITE },
        })
        s.addText('S\nW\nO\nT', {
            x: 4.72, y: Y + 0.95, w: 0.38, h: 2.35,
            fontSize: 11, bold: true, color: NAVY, fontFace: "Calibri",
            align: "center", valign: "middle",
        })
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 9 — ANALYSE PESTEL
    // ════════════════════════════════════════════════════════════
    {
        const s = addSlide('Analyse PESTEL', 9)
        const Y = CONTENT_Y + 0.05

        const pestel = [
            { code: 'P', title: 'Politique', color: NAVY, items: ['Stabilité politique CEDEAO', 'Soutien AT2ER, ECREEE', 'ODD 7 — agenda international'] },
            { code: 'E', title: 'Économique', color: TEAL, items: ['Croissance solaire +20%/an', 'Contraintes financières des ménages', 'Mobile money = levier d\'accès'] },
            { code: 'S', title: 'Social', color: "6B21A8", items: ['620 M sans électricité (2030)', 'Jeunesse africaine & digital', 'Demande d\'emplois qualifiés'] },
            { code: 'T', title: 'Technologique', color: ORANGE, items: ['IA & logiciels low-code', 'Cloud computing accessible', 'Innovation logicielle Afrique'] },
            { code: 'E2', title: 'Environnemental', color: "065F46", items: ['ODD 13 — lutte climatique', 'Réduction émissions CO₂', 'Optimisation batteries (+env)'] },
            { code: 'L', title: 'Légal', color: "991B1B", items: ['Loi 2018-010 Togo', 'Décret AT2ER 2016', 'Protocole énergie CEDEAO 2003'] },
        ]

        const cols = 3
        const cW = (SW - 0.6) / cols - 0.1
        const cH = (CONTENT_H - 0.05) / 2 - 0.1
        pestel.forEach((item, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = 0.25 + col * (cW + 0.1)
            const y = Y + row * (cH + 0.12)
            addCard(pres, s, x, y, cW, cH, `${item.code} — ${item.title}`, item.items, item.color, WHITE)
        })
    }

    // ════════════════════════════════════════════════════════════
    // SLIDE 10 — CALL TO ACTION
    // ════════════════════════════════════════════════════════════
    {
        const s = pres.addSlide()
        s.background = { color: NAVY }
        addFooter(pres, s, ent)

        // Header dark
        s.addShape(pres.shapes.RECTANGLE, {
            x: 0, y: 0, w: SW, h: 0.05,
            fill: { color: ORANGE }, line: { color: ORANGE },
        })

        if (logo) {
            s.addImage({
                data: `data:image/${logo.ext};base64,${logo.base64}`,
                x: 0.25, y: 0.15, w: 0.7, h: 0.7,
            })
        }
        s.addText(ent, {
            x: 1.1, y: 0.2, w: 5, h: 0.5,
            fontSize: 16, bold: true, color: WHITE, fontFace: "Calibri",
        })
        s.addText('10 / 10', {
            x: 8.5, y: 0.25, w: 1.2, h: 0.35,
            fontSize: 9, color: ORANGE, fontFace: "Calibri", align: "right", bold: true,
        })

        // Grand titre CTA
        s.addText('Rejoignez la révolution\nsolaire africaine', {
            x: 0.5, y: 0.95, w: 9, h: 1.2,
            fontSize: 30, bold: true, color: WHITE, fontFace: "Calibri",
            align: "center", valign: "middle",
        })

        // Trait décoratif orange
        s.addShape(pres.shapes.RECTANGLE, {
            x: 3.5, y: 2.2, w: 3, h: 0.06,
            fill: { color: ORANGE }, line: { color: ORANGE },
        })

        // 3 blocs : Besoin / Prochaines étapes / Demande
        const ctaY = 2.35
        const ctas = [
            {
                title: 'Notre besoin',
                body: `Financement de ${fmt(totalDette)} FCFA\n(70% dette, 30% fonds propres)\nPour ${duree} ans de déploiement`,
                color: ORANGE,
            },
            {
                title: 'Prochaines étapes',
                body: `1. Validation dossier financier\n2. Due diligence & audit\n3. Accord de financement\n4. Lancement ${anneeDebut}`,
                color: TEAL,
            },
            {
                title: 'Ce que nous proposons',
                body: `TRI ${triVal > 0 ? (triVal * 100).toFixed(0) : '35'}%  ·  VAN ${vanVal > 0 ? fmtM(vanVal) : '+'} FCFA\nPayback ${payback > 0 && isFinite(payback) ? payback.toFixed(1) : 2.5} ans\nPartage des bénéfices`,
                color: WHITE,
            },
        ]

        const cW = (SW - 0.7) / 3 - 0.1
        ctas.forEach((cta, i) => {
            const x = 0.25 + i * (cW + 0.1)
            s.addShape(pres.shapes.RECTANGLE, {
                x, y: ctaY, w: cW, h: 2.2,
                fill: { color: "1A3A5C" },
                line: { color: cta.color, width: 1.5 },
            })
            s.addShape(pres.shapes.RECTANGLE, {
                x, y: ctaY, w: cW, h: 0.07,
                fill: { color: cta.color }, line: { color: cta.color },
            })
            s.addText(cta.title, {
                x: x + 0.1, y: ctaY + 0.1, w: cW - 0.2, h: 0.35,
                fontSize: 10, bold: true, color: cta.color, fontFace: "Calibri",
            })
            s.addText(cta.body, {
                x: x + 0.1, y: ctaY + 0.48, w: cW - 0.2, h: 1.62,
                fontSize: 10, color: WHITE, fontFace: "Calibri",
                wrap: true, valign: "top",
            })
        })

        // Contact
        s.addText(`${profil?.localisation || 'Lomé, Togo'}   ·   ${ent}`, {
            x: 0.5, y: SH - 0.6, w: SW - 1, h: 0.25,
            fontSize: 9, color: "A8C4E0", fontFace: "Calibri", align: "center",
        })
    }

    // ── Génération du buffer ──────────────────────────────────
    const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer
    const nom  = (projet.nom || 'BusinessModel').replace(/\s+/g, '_')
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="${nom}_Presentation_${date}.pptx"`,
        }
    })
}