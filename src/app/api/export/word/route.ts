/**
 * EXPORT WORD — route.ts 
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/superbase/server'
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    VerticalAlign, PageBreak, LevelFormat, Header, Footer, SimpleField
} from 'docx'

// ── Palette KYA ───────────────────────────────────────────────
const NAVY   = "0D2B55"
const ORANGE = "F0A02B"
const TEAL   = "169B86"
const WHITE  = "FFFFFF"
const LGRAY  = "F3F4F6"
const DGRAY  = "6B7280"
const ORANGE_LIGHT = "FFF3DC"
const TEAL_LIGHT   = "E1F5EE"
const NAVY_LIGHT   = "E6F1FB"

// ── Helpers borders ───────────────────────────────────────────
const bdr  = (c = "D1D5DB") => ({ style: BorderStyle.SINGLE, size: 1, color: c })
const bdrs = (c = "D1D5DB") => ({ top: bdr(c), bottom: bdr(c), left: bdr(c), right: bdr(c) })

// ── Helpers texte ─────────────────────────────────────────────
const run = (text: string, opts: Record<string, unknown> = {}) =>
    new TextRun({ text, font: "Calibri", size: 22, ...opts })

const bold = (text: string, opts: Record<string, unknown> = {}) =>
    run(text, { bold: true, ...opts })

const para = (text: string, opts: Record<string, unknown> = {}) =>
    new Paragraph({ spacing: { before: 80, after: 100 }, children: [run(text)], ...opts })

const space = () => new Paragraph({ children: [run("")], spacing: { before: 60, after: 60 } })
const pageBreak = () => new Paragraph({ children: [new PageBreak()] })

const sep = (color = ORANGE) => new Paragraph({
    spacing: { before: 80, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color, space: 1 } },
    children: [run("")],
})

const h1 = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 80 },
    children: [new TextRun({ text, font: "Calibri", size: 36, bold: true, color: NAVY })]
})

const h2 = (text: string, color = TEAL) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, font: "Calibri", size: 26, bold: true, color })]
})

const h3 = (text: string) => new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Calibri", size: 24, bold: true, color: NAVY })]
})

// ── Helpers cellules tableau ──────────────────────────────────
interface CellOpts {
    fill?: string
    bold?: boolean
    color?: string
    width?: number
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    vAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign]
    colspan?: number
    size?: number
}

const cell = (content: string, opts: CellOpts = {}) => new TableCell({
    borders: bdrs("D1D5DB"),
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    shading: { fill: opts.fill || WHITE, type: ShadingType.CLEAR },
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    columnSpan: opts.colspan,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    children: [new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
        children: [new TextRun({
            text: content,
            font: "Calibri", size: opts.size ?? 20,
            bold: opts.bold || false,
            color: opts.color || "111827",
        })]
    })]
})

const hCell = (text: string, width: number, bg = NAVY) =>
    cell(text, { fill: bg, bold: true, color: WHITE, width, align: AlignmentType.CENTER })

const lCell = (text: string, width: number) =>
    cell(text, { fill: LGRAY, bold: true, width, color: NAVY })

const kpiCell = (text: string, width: number, color = TEAL) =>
    cell(text, { fill: WHITE, bold: true, color, width, align: AlignmentType.RIGHT })

const formatNum = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const formatM   = (n: number) => `${(n / 1_000_000).toFixed(2)} M FCFA`

function ficheRow(label: string, value: string, colW: [number, number], alt: boolean) {
    return new TableRow({ children: [
        cell(label, { fill: alt ? LGRAY : WHITE, bold: true, width: colW[0], color: NAVY }),
        cell(value, { fill: WHITE, width: colW[1] }),
    ]})
}

// ── ROUTE HANDLER ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const projetId = searchParams.get('projetId')
    if (!projetId) return NextResponse.json({ error: 'projetId requis' }, { status: 400 })

    const supabase = await createClient()
    const [
        { data: projet },
        { data: profil },
        { data: produits },
        { data: composants },
        { data: hyps },
        { data: capex },
        { data: opex },
        { data: revenus },
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
        supabase.from('composants').select('*'),
        supabase.from('hypotheses').select('*').eq('projet_id', projetId),
        supabase.from('capex').select('*').eq('projet_id', projetId),
        supabase.from('opex').select('*').eq('projet_id', projetId),
        supabase.from('revenus').select('*').eq('projet_id', projetId),
        supabase.from('partenaires_financiers').select('*').eq('projet_id', projetId),
        supabase.from('concurrents').select('*').eq('projet_id', projetId),
        supabase.from('resultats_financiers').select('*').eq('projet_id', projetId).order('annee'),
        supabase.from('risques_projet').select('*').eq('projet_id', projetId),
        supabase.from('impacts_projet').select('*').eq('projet_id', projetId),
        supabase.from('kpis_projet').select('*').eq('projet_id', projetId).single(),
    ])

    if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const totalCapex  = (capex || []).reduce((s, c) => s + c.montant, 0)
    const totalFin    = (partenaires || []).reduce((s, p) => s + p.montant, 0)
    const totalFP     = (partenaires || []).filter(p => p.type_financement === 'fonds_propres').reduce((s, p) => s + p.montant, 0)
    const totalDette  = (partenaires || []).filter(p => p.type_financement === 'emprunt').reduce((s, p) => s + p.montant, 0)

    const anneeDebut  = projet.annee_demarrage || 2026
    const duree       = projet.duree_projet || 5
    const anneeFin    = anneeDebut + duree - 1
    const deviseLabel = projet.devise || 'FCFA'

    const TW = 9386
    const C2 = [4693, 4693] as [number, number]

    const docHeader = new Header({
        children: [
            new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 1 } },
                children: [
                    new TextRun({ text: profil?.nom_entreprise || 'KYA-Energy Group', font: "Calibri", size: 18, bold: true, color: TEAL }),
                    new TextRun({ text: `   ·   ${projet.nom}`, font: "Calibri", size: 18, color: DGRAY }),
                ]
            }),
        ]
    })

    const docFooter = new Footer({
        children: [
            new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 1 } },
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: `© ${profil?.nom_entreprise || 'KYA-Energy Group'} ${new Date().getFullYear()} — Confidentiel   ·   Page `, font: "Calibri", size: 16, color: DGRAY }),
                    new SimpleField("PAGE"),
                ]
            }),
        ]
    })

    const doc = new Document({
        numbering: {
            config: [{
                reference: "bullets",
                levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
                    alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 }, spacing: { before: 60, after: 60 } } } }]
            }]
        },
        styles: {
            default: { document: { run: { font: "Calibri", size: 22 } } },
            paragraphStyles: [
                { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
                    run: { size: 36, bold: true, font: "Calibri", color: NAVY },
                    paragraph: { spacing: { before: 400, after: 80 }, outlineLevel: 0 } },
                { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
                    run: { size: 26, bold: true, font: "Calibri", color: TEAL },
                    paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
            ]
        },
        sections: [{
            properties: {
                page: {
                    size: { width: 11906, height: 16838 },
                    margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
                }
            },
            headers: { default: docHeader },
            footers: { default: docFooter },
            children: [

                // ════════════════════════════════════════════════
                // PAGE DE GARDE
                // ════════════════════════════════════════════════
                space(), space(), space(),

                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 120 },
                    children: [new TextRun({ text: (profil?.nom_entreprise || 'KYA-ENERGY GROUP').toUpperCase(), font: "Calibri", size: 32, bold: true, color: TEAL })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 40 },
                    children: [new TextRun({ text: profil?.slogan || 'Move beyond the sky !', font: "Calibri", size: 22, italic: true, color: ORANGE })]
                }),
                sep(ORANGE),
                space(), space(),

                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 120 },
                    children: [new TextRun({ text: `Projet n°${projet.numero_projet || '—'}`, font: "Calibri", size: 24, bold: true, color: DGRAY })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 160 },
                    children: [new TextRun({ text: 'BUSINESS MODEL', font: "Calibri", size: 52, bold: true, color: NAVY })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 400 },
                    children: [new TextRun({ text: projet.nom, font: "Calibri", size: 32, bold: true, color: ORANGE })]
                }),

                space(), space(),

                new Table({
                    width: { size: TW, type: WidthType.DXA }, columnWidths: C2,
                    rows: [
                        new TableRow({ children: [
                            new TableCell({
                                borders: bdrs(NAVY),
                                columnSpan: 2,
                                shading: { fill: NAVY, type: ShadingType.CLEAR },
                                margins: { top: 120, bottom: 120, left: 200, right: 200 },
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
                                    new TextRun({ text: 'FICHE SYNOPTIQUE DU PROJET', font: "Calibri", size: 26, bold: true, color: WHITE })
                                ]})]
                            }),
                        ]}),
                        ficheRow('Projet',                   projet.nom,                                             C2, true),
                        ficheRow('Dénomination Sociale',      profil?.nom_entreprise || 'KYA-Energy Group',           C2, false),
                        ficheRow('Promoteur',                 projet.promoteur || '—',                                C2, true),
                        ficheRow("Pays d'exécution",          projet.pays_execution || '—',                          C2, false),
                        ficheRow('Durée du projet',           `${duree} ans (${anneeDebut}–${anneeFin})`,             C2, true),
                        ficheRow('Coût total du projet',      formatNum(projet.cout_total || totalFin) + ` ${deviseLabel}`, C2, false),
                        ficheRow('Fonds propres',             formatNum(totalFP) + ` ${deviseLabel}`,                 C2, true),
                        ficheRow('Financement recherché (dette)', formatNum(totalDette) + ` ${deviseLabel}`,          C2, false),
                        ficheRow('TRI',                       kpis ? `${(kpis.tri * 100).toFixed(1)}%` : '—',        C2, true),
                        ficheRow('VAN',                       kpis ? formatNum(kpis.van) + ` ${deviseLabel}` : '—',  C2, false),
                        ficheRow('Secteur',                   projet.secteur || '—',                                  C2, true),
                        ficheRow('Produit principal',         projet.produit_principal || '—',                       C2, false),
                    ]
                }),

                space(), space(),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `© ${profil?.nom_entreprise || 'KYA-Energy Group'} ${new Date().getFullYear()}`, font: "Calibri", size: 18, color: DGRAY, italics: true })]
                }),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 1. QUI SOMMES-NOUS ?
                // ════════════════════════════════════════════════
                h1('1. Qui sommes-nous ?'),
                sep(ORANGE),

                new Table({
                    width: { size: TW, type: WidthType.DXA }, columnWidths: [2800, TW - 2800],
                    rows: [
                        new TableRow({ children: [lCell('Entreprise', 2800), cell(profil?.nom_entreprise || '—', { width: TW - 2800 })] }),
                        new TableRow({ children: [lCell('Slogan', 2800), cell(profil?.slogan || '—', { width: TW - 2800 })] }),
                        new TableRow({ children: [lCell('Localisation', 2800), cell(profil?.localisation || '—', { width: TW - 2800 })] }),
                        new TableRow({ children: [lCell('Fondée en', 2800), cell(String(profil?.annee_creation || '—'), { width: TW - 2800 })] }),
                        new TableRow({ children: [lCell('Effectif', 2800), cell(profil?.effectif || '—', { width: TW - 2800 })] }),
                        new TableRow({ children: [lCell('Certifications', 2800), cell(profil?.certifications || '—', { width: TW - 2800 })] }),
                    ]
                }),
                space(),
                h2('Mission'),
                para(profil?.mission || '—'),
                h2('Vision'),
                para(profil?.vision || '—'),
                h2('Valeurs'),
                para(profil?.valeurs || '—'),
                ...(profil?.expertise_cle ? [h2('Expertise clé'), para(profil.expertise_cle)] : []),
                ...(profil?.notre_societe ? [h2('Notre société'), para(profil.notre_societe)] : []),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 2. INFORMATIONS DU PROJET
                // ════════════════════════════════════════════════
                h1('2. Informations du projet'),
                sep(ORANGE),
                para(projet.description || 'Aucune description renseignée.'),
                space(),
                new Table({
                    width: { size: TW, type: WidthType.DXA }, columnWidths: [3000, TW - 3000],
                    rows: [
                        new TableRow({ children: [lCell('Produit principal', 3000), cell(projet.produit_principal || '—', { width: TW - 3000 })] }),
                        new TableRow({ children: [lCell('Secteur', 3000), cell(projet.secteur || '—', { width: TW - 3000 })] }),
                        new TableRow({ children: [lCell('Année de démarrage', 3000), cell(String(anneeDebut), { width: TW - 3000 })] }),
                        new TableRow({ children: [lCell('Durée', 3000), cell(`${duree} ans`, { width: TW - 3000 })] }),
                        new TableRow({ children: [lCell('Promoteur', 3000), cell(projet.promoteur || '—', { width: TW - 3000 })] }),
                        new TableRow({ children: [lCell("Pays d'exécution", 3000), cell(projet.pays_execution || '—', { width: TW - 3000 })] }),
                        new TableRow({ children: [lCell('Devise', 3000), cell(deviseLabel, { width: TW - 3000 })] }),
                    ]
                }),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 3. PRODUITS & SERVICES
                // ════════════════════════════════════════════════
                h1('3. Produits & Services'),
                sep(ORANGE),

                ...(produits && produits.length > 0 ? produits.flatMap((p) => {
                    const comps = (composants || []).filter(c => c.produit_id === p.id)
                    const coutBase = comps.reduce((s, c) => s + c.quantite * c.prix_unitaire, 0)
                    const coutRevient = coutBase * (1 + (p.marge_securite || 0))
                    return [
                        h2(p.nom),
                        ...(p.proposition_valeur ? [para(`Proposition de valeur : ${p.proposition_valeur}`)] : []),
                        ...(p.description ? [para(p.description)] : []),
                        ...(comps.length > 0 ? [
                            h3('Composants'),
                            new Table({
                                width: { size: TW, type: WidthType.DXA }, columnWidths: [3500, 1500, 1600, 1500, 1286],
                                rows: [
                                    new TableRow({ children: [
                                        hCell('Libellé', 3500), hCell('Catégorie', 1500),
                                        hCell('Quantité', 1600), hCell('Prix unitaire', 1500),
                                        hCell('Total', 1286),
                                    ]}),
                                    ...comps.map((c, i) => new TableRow({ children: [
                                        cell(c.libelle, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 3500 }),
                                        cell(c.categorie || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1500 }),
                                        cell(String(c.quantite), { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1600, align: AlignmentType.CENTER }),
                                        cell(formatNum(c.prix_unitaire), { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1500, align: AlignmentType.RIGHT }),
                                        cell(formatNum(c.quantite * c.prix_unitaire), { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1286, align: AlignmentType.RIGHT }),
                                    ]})),
                                    new TableRow({ children: [
                                        cell('Coût de revient (avec marge sécurité)', { fill: NAVY_LIGHT, bold: true, width: 3500, colspan: 4 }),
                                        cell(formatNum(coutRevient), { fill: NAVY_LIGHT, bold: true, color: NAVY, width: 1286, align: AlignmentType.RIGHT }),
                                    ]}),
                                ]
                            }),
                        ] : []),
                        space(),
                    ]
                }) : [para('Aucun produit renseigné.')]),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 4. HYPOTHÈSES CLÉS
                // ════════════════════════════════════════════════
                h1('4. Hypothèses clés'),
                sep(ORANGE),
                ...(hyps && hyps.length > 0 ? [
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [4000, 2693, 2693],
                        rows: [
                            new TableRow({ children: [hCell('Paramètre', 4000), hCell('Valeur', 2693), hCell('Unité', 2693)] }),
                            ...hyps.map((h, i) => new TableRow({ children: [
                                cell(h.description || h.cle, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 4000 }),
                                cell(String(h.valeur), { fill: i % 2 === 0 ? WHITE : LGRAY, width: 2693, align: AlignmentType.RIGHT }),
                                cell(h.unite || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 2693 }),
                            ]}))
                        ]
                    }),
                ] : [para('Aucune hypothèse renseignée.')]),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 5. COÛTS & INVESTISSEMENTS
                // ════════════════════════════════════════════════
                h1('5. Coûts & Investissements'),
                sep(ORANGE),

                h2('CAPEX — Investissements initiaux'),
                ...(capex && capex.length > 0 ? [
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [4000, 1800, 1793, 1793],
                        rows: [
                            new TableRow({ children: [hCell('Libellé', 4000), hCell('Catégorie', 1800), hCell('Montant (FCFA)', 1793), hCell('Amort./an', 1793)] }),
                            ...capex.map((c, i) => new TableRow({ children: [
                                cell(c.libelle, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 4000 }),
                                cell(c.categorie || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1800 }),
                                cell(formatNum(c.montant), { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1793, align: AlignmentType.RIGHT }),
                                cell(formatNum(c.montant * c.taux_amortissement), { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1793, align: AlignmentType.RIGHT }),
                            ]})),
                            new TableRow({ children: [
                                cell('TOTAL CAPEX', { fill: NAVY, bold: true, color: WHITE, width: 4000, colspan: 2 }),
                                cell(formatNum(totalCapex), { fill: NAVY, bold: true, color: WHITE, width: 1793, align: AlignmentType.RIGHT }),
                                cell('', { fill: NAVY, width: 1793 }),
                            ]}),
                        ]
                    }),
                ] : [para('Aucun investissement renseigné.')]),

                space(),
                h2("OPEX — Charges d'exploitation"),
                ...(opex && opex.length > 0 ? [
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [3800, 1793, 1793, 2000],
                        rows: [
                            new TableRow({ children: [hCell('Libellé', 3800), hCell('Catégorie', 1793), hCell('Type', 1793), hCell('Valeur', 2000)] }),
                            ...opex.map((o, i) => new TableRow({ children: [
                                cell(o.libelle, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 3800 }),
                                cell(o.categorie || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1793 }),
                                cell(o.type_calcul === 'fixe' ? 'Montant fixe' : o.type_calcul, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1793 }),
                                cell(o.type_calcul.startsWith('pct') ? `${(o.valeur * 100).toFixed(1)}%` : formatNum(o.valeur) + ' FCFA', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 2000, align: AlignmentType.RIGHT }),
                            ]}))
                        ]
                    }),
                ] : [para('Aucune charge renseignée.')]),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 6. REVENUS — PROJECTIONS
                // ════════════════════════════════════════════════
                h1('6. Projections de revenus'),
                sep(ORANGE),

                ...(resultats && resultats.length > 0 ? [
                    new Table({
                        width: { size: TW, type: WidthType.DXA },
                        columnWidths: [2400, ...resultats.map(() => Math.floor((TW - 2400) / resultats.length))],
                        rows: [
                            new TableRow({ children: [
                                hCell('Indicateur', 2400),
                                ...resultats.map(r => hCell(String(r.annee), Math.floor((TW - 2400) / resultats.length)))
                            ]}),
                            ...[
                                { label: "Chiffre d'affaires", key: 'ca_total', bold: true },
                                { label: 'Marge brute', key: 'marge_brute', bold: false },
                            ].map((l, li) => new TableRow({ children: [
                                cell(l.label, { fill: li % 2 === 0 ? WHITE : LGRAY, bold: l.bold, width: 2400 }),
                                ...resultats.map((r) =>
                                    cell(formatNum(r[l.key as keyof typeof r] as number), {
                                        fill: li % 2 === 0 ? WHITE : LGRAY, bold: l.bold,
                                        width: Math.floor((TW - 2400) / resultats.length),
                                        align: AlignmentType.RIGHT,
                                    })
                                )
                            ]}))
                        ]
                    }),
                ] : [para('Aucune donnée de revenu calculée.')]),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 7. PARTENAIRES
                // ════════════════════════════════════════════════
                h1('7. Partenaires financiers'),
                sep(ORANGE),

                ...(partenaires && partenaires.length > 0 ? [
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [2500, 1800, 1800, 1500, 1786],
                        rows: [
                            new TableRow({ children: [
                                hCell('Partenaire', 2500), hCell('Type', 1800),
                                hCell('Montant (FCFA)', 1800), hCell('Taux (%)', 1500),
                                hCell('Durée (ans)', 1786),
                            ]}),
                            ...partenaires.map((p, i) => new TableRow({ children: [
                                cell(p.nom, { fill: i % 2 === 0 ? WHITE : LGRAY, bold: true, width: 2500 }),
                                cell(p.type_financement || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1800 }),
                                cell(formatNum(p.montant), { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1800, align: AlignmentType.RIGHT }),
                                cell(`${((p.taux_interet || 0) * 100).toFixed(1)}%`, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1500, align: AlignmentType.CENTER }),
                                cell(`${p.duree_annees || '—'}`, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1786, align: AlignmentType.CENTER }),
                            ]})),
                            new TableRow({ children: [
                                cell('TOTAL FINANCEMENT', { fill: NAVY, bold: true, color: WHITE, width: 2500, colspan: 2 }),
                                cell(formatNum(totalFin), { fill: NAVY, bold: true, color: WHITE, width: 1800, align: AlignmentType.RIGHT }),
                                cell('', { fill: NAVY, width: 1500 }),
                                cell('', { fill: NAVY, width: 1786 }),
                            ]}),
                        ]
                    }),
                ] : [para('Aucun partenaire financier renseigné.')]),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 8. ANALYSE CONCURRENTIELLE
                // ════════════════════════════════════════════════
                ...(concurrents && concurrents.length > 0 ? [
                    h1('8. Analyse concurrentielle'),
                    sep(ORANGE),
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [1800, 1400, 2000, 2000, 2186],
                        rows: [
                            new TableRow({ children: [
                                hCell('Concurrent', 1800), hCell('Type', 1400),
                                hCell('Forces', 2000), hCell('Faiblesses', 2000),
                                hCell('Notre différenciation', 2186),
                            ]}),
                            ...concurrents.map((c, i) => new TableRow({ children: [
                                cell(c.nom, { fill: i % 2 === 0 ? WHITE : LGRAY, bold: true, width: 1800 }),
                                cell(c.type || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1400 }),
                                cell(c.forces || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 2000 }),
                                cell(c.faiblesses || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 2000 }),
                                cell(c.notre_differenciation || '—', { fill: TEAL_LIGHT, color: "0F6E56", width: 2186 }),
                            ]}))
                        ]
                    }),
                    pageBreak(),
                ] : []),

                // ════════════════════════════════════════════════
                // 9. PRÉVISIONS FINANCIÈRES
                // ════════════════════════════════════════════════
                h1('9. Prévisions financières'),
                sep(ORANGE),
                h2('Compte de résultat prévisionnel'),

                ...(resultats && resultats.length > 0 ? [
                    new Table({
                        width: { size: TW, type: WidthType.DXA },
                        columnWidths: [2400, ...resultats.map(() => Math.floor((TW - 2400) / resultats.length))],
                        rows: [
                            new TableRow({ children: [
                                hCell('Libellé', 2400),
                                ...resultats.map(r => hCell(String(r.annee), Math.floor((TW - 2400) / resultats.length)))
                            ]}),
                            ...[
                                { label: "Chiffre d'affaires", key: 'ca_total', bold: true },
                                { label: 'Coût de revient', key: 'cout_revient', bold: false },
                                { label: 'Marge brute', key: 'marge_brute', bold: true },
                                { label: 'EBITDA', key: 'ebitda', bold: true },
                                { label: 'Amortissements', key: 'dotation_amort', bold: false },
                                { label: 'EBIT', key: 'ebit', bold: false },
                                { label: 'Frais financiers', key: 'frais_financiers', bold: false },
                                { label: 'Résultat avant IS', key: 'ebt', bold: false },
                                { label: 'Impôts', key: 'impots', bold: false },
                                { label: 'Résultat net', key: 'resultat_net', bold: true },
                            ].map((l, li) => new TableRow({ children: [
                                cell(l.label, {
                                    fill: l.bold ? NAVY_LIGHT : (li % 2 === 0 ? WHITE : LGRAY),
                                    bold: l.bold, color: l.bold ? NAVY : "111827",
                                    width: 2400
                                }),
                                ...resultats.map((r) => {
                                    const val = r[l.key as keyof typeof r] as number
                                    return cell(formatNum(val), {
                                        fill: l.bold ? NAVY_LIGHT : (li % 2 === 0 ? WHITE : LGRAY),
                                        bold: l.bold,
                                        color: val < 0 ? "E24B4A" : l.bold ? NAVY : "111827",
                                        width: Math.floor((TW - 2400) / resultats.length),
                                        align: AlignmentType.RIGHT,
                                    })
                                })
                            ]}))
                        ]
                    }),
                    space(),

                    h2('Flux de trésorerie'),
                    new Table({
                        width: { size: TW, type: WidthType.DXA },
                        columnWidths: [2400, ...resultats.map(() => Math.floor((TW - 2400) / resultats.length))],
                        rows: [
                            new TableRow({ children: [
                                hCell('Flux', 2400, TEAL),
                                ...resultats.map(r => hCell(String(r.annee), Math.floor((TW - 2400) / resultats.length), TEAL))
                            ]}),
                            ...[
                                { label: 'CAF', key: 'caf', bold: false },
                                { label: 'Remboursement capital', key: 'remboursement_capital', bold: false },
                                { label: 'Flux trésorerie net', key: 'flux_tresorerie_annuel', bold: true },
                                { label: 'Trésorerie cumulée', key: 'tresorerie_cumulee', bold: true },
                            ].map((l, li) => new TableRow({ children: [
                                cell(l.label, {
                                    fill: l.bold ? TEAL_LIGHT : (li % 2 === 0 ? WHITE : LGRAY),
                                    bold: l.bold, color: l.bold ? "0F6E56" : "111827",
                                    width: 2400
                                }),
                                ...resultats.map((r) => {
                                    const val = r[l.key as keyof typeof r] as number
                                    return cell(formatNum(val), {
                                        fill: l.bold ? TEAL_LIGHT : (li % 2 === 0 ? WHITE : LGRAY),
                                        bold: l.bold,
                                        color: val < 0 ? "E24B4A" : l.bold ? "0F6E56" : "111827",
                                        width: Math.floor((TW - 2400) / resultats.length),
                                        align: AlignmentType.RIGHT,
                                    })
                                })
                            ]}))
                        ]
                    }),
                ] : [para('Prévisions non disponibles — complétez les sections précédentes.')]),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 10. PLAN DE FINANCEMENT
                // ════════════════════════════════════════════════
                h1('10. Plan de financement'),
                sep(ORANGE),

                ...(partenaires && partenaires.length > 0 ? [
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [4000, 2693, 2693],
                        rows: [
                            new TableRow({ children: [hCell('Source', 4000), hCell('Montant (FCFA)', 2693), hCell('Part (%)', 2693)] }),
                            ...partenaires.map((p, i) => new TableRow({ children: [
                                cell(p.nom, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 4000 }),
                                cell(formatNum(p.montant), { fill: i % 2 === 0 ? WHITE : LGRAY, width: 2693, align: AlignmentType.RIGHT }),
                                cell(totalFin > 0 ? `${((p.montant / totalFin) * 100).toFixed(0)}%` : '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 2693, align: AlignmentType.CENTER }),
                            ]})),
                            new TableRow({ children: [
                                cell('TOTAL', { fill: NAVY, bold: true, color: WHITE, width: 4000 }),
                                cell(formatNum(totalFin), { fill: NAVY, bold: true, color: WHITE, width: 2693, align: AlignmentType.RIGHT }),
                                cell('100%', { fill: NAVY, bold: true, color: WHITE, width: 2693, align: AlignmentType.CENTER }),
                            ]}),
                        ]
                    }),
                ] : []),

                ...(kpis ? [
                    space(),
                    h2('Indicateurs de rentabilité'),
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [3000, 3000, 3386],
                        rows: [
                            new TableRow({ children: [hCell('Indicateur', 3000), hCell('Valeur', 3000), hCell('Interprétation', 3386)] }),
                            new TableRow({ children: [lCell('TRI', 3000), kpiCell(`${(kpis.tri * 100).toFixed(1)}%`, 3000, kpis.tri > 0.15 ? TEAL : ORANGE), cell('Rentabilité du projet', { width: 3386 })] }),
                            new TableRow({ children: [cell('VAN', { fill: LGRAY, bold: true, width: 3000, color: NAVY }), kpiCell(formatM(kpis.van), 3000, kpis.van > 0 ? TEAL : "E24B4A"), cell('Valeur créée pour les investisseurs', { width: 3386 })] }),
                            new TableRow({ children: [lCell('Délai de récupération', 3000), kpiCell(`${kpis.payback_annees?.toFixed(1) || '—'} ans`, 3000, ORANGE), cell('Durée avant récupération du capital', { width: 3386 })] }),
                            new TableRow({ children: [cell('Marge brute moy.', { fill: LGRAY, bold: true, width: 3000, color: NAVY }), kpiCell(`${(kpis.marge_brute_moy * 100).toFixed(1)}%`, 3000), cell('Marge moyenne sur la durée', { width: 3386 })] }),
                        ]
                    }),
                ] : []),

                pageBreak(),

                // ════════════════════════════════════════════════
                // 11. RISQUES
                // ════════════════════════════════════════════════
                ...(risques && risques.length > 0 ? [
                    h1('11. Analyse des risques'),
                    sep(ORANGE),
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [1400, 1800, 1600, 1600, 2986],
                        rows: [
                            new TableRow({ children: [
                                hCell('Catégorie', 1400), hCell('Description', 1800),
                                hCell('Probabilité', 1600), hCell('Niveau', 1600),
                                hCell('Mesure de mitigation', 2986),
                            ]}),
                            ...risques.map((r, i) => {
                                const nivColor = r.niveau_risque === 'critique' ? "991B1B" : r.niveau_risque === 'eleve' ? "E24B4A" : r.niveau_risque === 'modere' ? "854F0B" : "0F6E56"
                                const nivFill  = r.niveau_risque === 'critique' ? "FEE2E2" : r.niveau_risque === 'eleve' ? "FEF2F2" : r.niveau_risque === 'modere' ? ORANGE_LIGHT : TEAL_LIGHT
                                return new TableRow({ children: [
                                    cell(r.categorie || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1400 }),
                                    cell(r.description, { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1800 }),
                                    cell(r.probabilite || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 1600, align: AlignmentType.CENTER }),
                                    cell(r.niveau_risque || '—', { fill: nivFill, bold: true, color: nivColor, width: 1600, align: AlignmentType.CENTER }),
                                    cell(r.mesure_mitigation || '—', { fill: i % 2 === 0 ? WHITE : LGRAY, width: 2986 }),
                                ]})
                            })
                        ]
                    }),
                    pageBreak(),
                ] : []),

                // ════════════════════════════════════════════════
                // 12. IMPACTS
                // ════════════════════════════════════════════════
                ...(impacts && impacts.length > 0 ? [
                    h1('12. Impacts & ODD'),
                    sep(ORANGE),
                    new Table({
                        width: { size: TW, type: WidthType.DXA }, columnWidths: [1800, 2400, 1200, 1200, 1200, 1586],
                        rows: [
                            new TableRow({ children: [
                                hCell('Catégorie', 1800, TEAL), hCell('Indicateur', 2400, TEAL),
                                hCell('Valeur', 1200, TEAL), hCell('Unité', 1200, TEAL),
                                hCell('ODD', 1200, TEAL), hCell('Description', 1586, TEAL),
                            ]}),
                            ...impacts.map((imp, i) => new TableRow({ children: [
                                cell(imp.categorie || '—', { fill: i % 2 === 0 ? WHITE : TEAL_LIGHT, bold: true, color: "0F6E56", width: 1800 }),
                                cell(imp.indicateur, { fill: i % 2 === 0 ? WHITE : TEAL_LIGHT, width: 2400 }),
                                cell(imp.valeur || '—', { fill: i % 2 === 0 ? WHITE : TEAL_LIGHT, width: 1200, align: AlignmentType.RIGHT }),
                                cell(imp.unite || '—', { fill: i % 2 === 0 ? WHITE : TEAL_LIGHT, width: 1200 }),
                                cell(imp.odd || '—', { fill: i % 2 === 0 ? WHITE : TEAL_LIGHT, width: 1200, align: AlignmentType.CENTER }),
                                cell(imp.description || '—', { fill: i % 2 === 0 ? WHITE : TEAL_LIGHT, width: 1586 }),
                            ]}))
                        ]
                    }),
                    space(),
                ] : []),

                // ════════════════════════════════════════════════
                // CONCLUSION
                // ════════════════════════════════════════════════
                sep(TEAL),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 80 },
                    children: [new TextRun({ text: `Document généré le ${new Date().toLocaleDateString('fr-FR')} par KYA Business Model`, font: "Calibri", size: 18, color: DGRAY, italics: true })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 80 },
                    children: [new TextRun({ text: `© ${profil?.nom_entreprise || 'KYA-Energy Group'} ${new Date().getFullYear()} — Confidentiel`, font: "Calibri", size: 18, color: DGRAY, italics: true })]
                }),
            ]
        }]
    })

    const buffer = await Packer.toBuffer(doc)
    const nom  = (projet.nom || 'BusinessModel').replace(/\s+/g, '_')
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${nom}_BusinessModel_${date}.docx"`,
        }
    })
}