/**
 * EXPORT WORD — route.ts v3.2 (Correction finale Type Check)
 * Fichier : src/app/api/export/word/route.ts
 *
 * Design calqué sur le document de référence KYA-SolDesign :
 * - Page de garde avec fiche synoptique (tableau bleu navy)
 * - Résumé exécutif
 * - Sections techniques numérotées
 * - Tableaux stylés (en-têtes navy, alternance beige/blanc)
 * - Partie financière : CR, trésorerie, financement, risques
 * - Impacts & ODD
 * - En-tête / pied de page cohérents
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/superbase/server'
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    PageBreak, LevelFormat, Header, Footer, SimpleField,
    PageNumber, NumberFormat, VerticalAlign
} from 'docx'

// ── Palette KYA ───────────────────────────────────────────────
const NAVY   = "0D2B55"
const ORANGE = "F0A02B"
const TEAL   = "169B86"
const WHITE  = "FFFFFF"
const LGRAY  = "F3F4F6"   // alternance lignes paires
const DGRAY  = "6B7280"
const BEIGE  = "FDFBF7"   // Fond de cellule ou appels d'en-tête alternatifs

// ── Helpers de mise en page & typographie ─────────────────────
const space = (lines = 1) => new Paragraph({ spacing: { before: lines * 120, after: 0 } })

const sep = (color: string) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
        top: { style: BorderStyle.SINGLE, size: 24, color },
        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
        right: { style: BorderStyle.NONE, size: 0, color: "auto" }
    },
    rows: [new TableRow({ children: [new TableCell({ children: [] })] })]
})

// Correction ici : align utilise désormais 'any' pour éviter l'erreur de référence de valeur/type de docx
function cell(text: string, opts: { fill?: string, bold?: boolean, color?: string, size?: number, align?: any, vAlign?: any, colspan?: number, width?: number } = {}) {
    return new TableCell({
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        shading: { fill: opts.fill || WHITE, type: ShadingType.CLEAR },
        // Utilisation de 'as any' pour bypasser le conflit de type de l'enum VerticalAlign
        verticalAlign: (opts.vAlign || VerticalAlign.CENTER) as any, 
        columnSpan: opts.colspan,
        width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
        children: [new Paragraph({
            alignment: opts.align || AlignmentType.LEFT,
            children: [new TextRun({ text, bold: opts.bold, color: opts.color || "111827", size: opts.size || 20, font: "Calibri" })]
        })]
    })
}

function h1(text: string) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 120 },
        keepNext: true,
        children: [new TextRun({ text, bold: true, color: NAVY, size: 28, font: "Calibri" })]
    })
}

function h2(text: string) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        keepNext: true,
        children: [new TextRun({ text, bold: true, color: TEAL, size: 22, font: "Calibri" })]
    })
}

function txt(text: string, bold = false) {
    return new Paragraph({
        alignment: AlignmentType.JUSTIFY,
        spacing: { before: 60, after: 60 },
        lineSpacing: { before: 40, line: 276 }, // Intraligne agréable 1.15
        children: [new TextRun({ text, font: "Calibri", size: 21, bold })]
    })
}

const fmt = (v: number | null | undefined): string => {
    if (v === undefined || v === null) return '0'
    return new Intl.NumberFormat('fr-FR').format(Math.round(v))
}

// ── Point d'entrée principal de l'API ──────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: "L'identifiant du projet est requis" }, { status: 400 })
    }

    const supabase = await createClient()

    // Requêtes Supabase vers l'ensemble de l'écosystème du projet
    const { data: projet }  = await supabase.from('projets').select('*').eq('id', id).single()
    if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

    const { data: profil }  = await supabase.from('profils_entreprise').select('*').eq('projet_id', id).single()
    const { data: hypo }    = await supabase.from('hypotheses_financieres').select('*').eq('projet_id', id).single()
    const { data: marches } = await supabase.from('marches_cibles').select('*').eq('projet_id', id)
    const { data: results } = await supabase.from('resultats_financiers').select('*').eq('projet_id', id).order('annee')
    const { data: risques } = await supabase.from('risques_projet').select('*').eq('projet_id', id)
    const { data: swot }    = await supabase.from('swot_projet').select('*').eq('projet_id', id)
    const { data: pestel }  = await supabase.from('pestel_projet').select('*').eq('projet_id', id)
    const { data: impacts } = await supabase.from('impacts_projet').select('*').eq('projet_id', id)
    const { data: partTech } = await supabase.from('partenaires_techniques').select('*').eq('projet_id', id)
    const { data: partFin }  = await supabase.from('partenaires_financiers').select('*').eq('projet_id', id)

    // Construction du document DOCX
    const doc = new Document({
        features: { updateFields: true },
        sections: [{
            properties: {
                page: {
                    margins: { top: 1440, bottom: 1440, left: 1440, right: 1440 } // Marges standardisées 2.54cm
                }
            },
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: `${profil?.nom_entreprise || 'KYA-Energy Group'} — Plan d'Affaires Stratégique`, font: "Calibri", size: 18, color: DGRAY })
                            ]
                        }),
                        sep(NAVY),
                    ]
                })
            },
            footers: {
                default: new Footer({
                    children: [
                        sep(ORANGE),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            spacing: { before: 100 },
                            children: [
                                new TextRun({ text: "Page ", font: "Calibri", size: 18, color: DGRAY }),
                                new TextRun({ children: [SimpleField.create("PAGE")], font: "Calibri", size: 18, color: DGRAY, bold: true }),
                                new TextRun({ text: " sur ", font: "Calibri", size: 18, color: DGRAY }),
                                new TextRun({ children: [SimpleField.create("NUMPAGES")], font: "Calibri", size: 18, color: DGRAY, bold: true })
                            ]
                        })
                    ]
                })
            },
            children: [
                // ════════════════════════════════════════════════
                // PAGE DE GARDE (Fiche synoptique KYA-SolDesign)
                // ════════════════════════════════════════════════
                space(2),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: (profil?.nom_entreprise || "KYA-ENERGY GROUP").toUpperCase(), bold: true, size: 28, color: NAVY, font: "Calibri" })]
                }),
                space(1),
                sep(ORANGE),
                space(3),
                
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: (projet.nom || "DOSSIER D'INVESTISSEMENT COMMERCIAL").toUpperCase(), bold: true, size: 44, color: NAVY, font: "Calibri" })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120 },
                    children: [new TextRun({ text: "DOCUMENT D'ANALYSE AVANCÉE ET PROJECTIONS STRATÉGIQUES", size: 20, color: TEAL, bold: true, font: "Calibri" })]
                }),
                
                space(5),

                // Fiche synoptique d'identification (Tableau Navy)
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
                        bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
                        left: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
                        right: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" }
                    },
                    rows: [
                        new TableRow({
                            children: [
                                cell("FICHE SYNOPTIQUE DU PROJET", { fill: NAVY, color: WHITE, bold: true, colspan: 2, size: 22, align: AlignmentType.CENTER })
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("Porteur de Projet / Entreprise", { bold: true, fill: LGRAY, width: 3500 }),
                                cell(profil?.nom_entreprise || 'KYA-Energy Group')
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("Secteur d'Activité Cible", { bold: true, fill: LGRAY }),
                                cell(profil?.secteur_activite || 'Énergies Renouvelables / Ingénierie')
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("Localisation Principale", { bold: true, fill: LGRAY }),
                                cell(profil?.localisation || 'Lomé, Togo')
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("Date de Génération du Rapport", { bold: true, fill: LGRAY }),
                                cell(new Date().toLocaleDateString('fr-FR'))
                            ]
                        })
                    ]
                }),

                new PageBreak(),

                // ════════════════════════════════════════════════
                // SECTION 1 : RÉSUMÉ EXÉCUTIF & VISION
                // ════════════════════════════════════════════════
                h1("1. Résumé Exécutif & Vision Globale"),
                txt(projet.description || "Aucune description globale n'a été configurée pour ce business model. Le projet s'ancre dans une volonté forte de transition énergétique et de déploiement de solutions d'ingénierie avancées."),
                
                h2("1.1 Objectifs Cardinaux du Projet"),
                txt(projet.objectifs || "Les objectifs principaux consistent à structurer une proposition de valeur pérenne, à capter les segments de marché stratégiques identifiés, et à générer une rentabilité financière à court terme capable de rassurer les fonds d'investissement partenaires."),

                // ════════════════════════════════════════════════
                // SECTION 2 : ÉTUDE DE MARCHÉ (TAM/SAM/SOM)
                // ════════════════════════════════════════════════
                h1("2. Dimensionnement & Analyse du Marché Cible"),
                txt("L'analyse quantitative des segments de marché permet d'isoler la demande globale théorique (TAM) de la part de marché réellement capturable par la structure (SOM) au cours des premiers cycles d'exploitation."),
                space(),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
                        bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" }
                    },
                    rows: [
                        new TableRow({
                            children: [
                                cell("Segment de Marché", { fill: NAVY, color: WHITE, bold: true, size: 21 }),
                                cell("Valeur Estimée (FCFA)", { fill: NAVY, color: WHITE, bold: true, size: 21, align: AlignmentType.RIGHT }),
                                cell("Description de la Demande", { fill: NAVY, color: WHITE, bold: true, size: 21 })
                            ]
                        }),
                        ...(marches || []).flatMap(m => [
                            new TableRow({
                                children: [
                                    cell("TAM (Total Addressable Market)", { bold: true, fill: LGRAY }),
                                    cell(`${fmt(m.tam_valeur)}`, { align: AlignmentType.RIGHT, fill: LGRAY }),
                                    cell(m.tam_Description || "Marché global théorique.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    cell("SAM (Serviceable Addressable Market)", { bold: true }),
                                    cell(`${fmt(m.sam_valeur)}`, { align: AlignmentType.RIGHT }),
                                    cell(m.sam_Description || "Marché ciblé accessible avec notre logistique.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    cell("SOM (Serviceable Obtainable Market)", { bold: true, fill: BEIGE }),
                                    cell(`${fmt(m.som_valeur)}`, { align: AlignmentType.RIGHT, fill: BEIGE }),
                                    cell(m.som_Description || "Part de marché capturable à court terme.")
                                ]
                            })
                        ])
                    ]
                }),

                // ════════════════════════════════════════════════
                // SECTION 3 : STRATÉGIE ET MATRICES DE SYNTHÈSE
                // ════════════════════════════════════════════════
                h1("3. Diagnostique Stratégique Environnemental"),
                
                h2("3.1 Matrice SWOT (Analyse Interne / Externe)"),
                txt("La structuration des forces, faiblesses, opportunités et menaces donne une vision macro de l'environnement concurrentiel."),
                space(),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 12, color: TEAL },
                        bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" },
                        insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" }
                    },
                    rows: [
                        new TableRow({
                            children: [
                                cell("Forces (Intrinsèques)", { fill: TEAL, color: WHITE, bold: true }),
                                cell("Faiblesses (Intrinsèques)", { fill: ORANGE, color: WHITE, bold: true })
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell(swot?.filter(x => x.type === 'force').map(x => `• ${x.element}`).join('\n') || "Expertise technique validée.", { fill: LGRAY }),
                                cell(swot?.filter(x => x.type === 'faiblesse').map(x => `• ${x.element}`).join('\n') || "Intensité capitalistique de départ.", { fill: LGRAY })
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("Opportunités (Environnement)", { fill: NAVY, color: WHITE, bold: true }),
                                cell("Menaces (Environnement)", { fill: "991B1B", color: WHITE, bold: true })
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell(swot?.filter(x => x.type === 'opportunite').map(x => `• ${x.element}`).join('\n') || "Cadre réglementaire en faveur du secteur.", { fill: BEIGE }),
                                cell(swot?.filter(x => x.type === 'menace').map(x => `• ${x.element}`).join('\n') || "Fluctuation potentielle du coût des intrants.", { fill: BEIGE })
                            ]
                        })
                    ]
                }),

                h2("3.2 Analyse Macro-Environnementale (PESTEL)"),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" } },
                    rows: [
                        new TableRow({
                            children: [
                                cell("Axe PESTEL", { fill: NAVY, color: WHITE, bold: true, width: 2500 }),
                                cell("Facteurs clés identifiés & Impacts sur l'écosystème", { fill: NAVY, color: WHITE, bold: true })
                            ]
                        }),
                        ...['politique', 'economique', 'social', 'technologique', 'ecologique', 'legal'].map(cat => {
                            const matched = pestel?.filter(x => x.categorie === cat).map(x => x.element).join(' ; ') || "Analyse de stabilité sectorielle stable."
                            return new TableRow({
                                children: [
                                    cell(cat.toUpperCase(), { bold: true, fill: LGRAY }),
                                    cell(matched)
                                ]
                            })
                        })
                    ]
                }),

                new PageBreak(),

                // ════════════════════════════════════════════════
                // SECTION 4 : TRAJECTOIRE FINANCIÈRE PROJETÉE
                // ════════════════════════════════════════════════
                h1("4. Modélisations & Résultats Financiers"),
                txt("Les tableaux ci-dessous présentent les projections annuelles de l'exploitation, validant la scalabilité et l'évolution de la marge de rentabilité opérationnelle (EBITDA)."),
                space(),

                // Compte de Résultat Simplifié
                h2("4.1 Compte de Résultat Prévisionnel"),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY } },
                    rows: [
                        new TableRow({
                            children: [
                                cell("Indicateur (FCFA)", { fill: NAVY, color: WHITE, bold: true }),
                                ...(results || []).map(r => cell(`Année ${r.annee}`, { fill: NAVY, color: WHITE, bold: true, align: AlignmentType.RIGHT }))
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("Chiffre d'Affaires (CA)", { bold: true }),
                                ...(results || []).map(r => cell(fmt(r.chiffre_affaires), { align: AlignmentType.RIGHT }))
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("EBITDA / Excédent Brut d'Exploitation", { bold: true, fill: LGRAY }),
                                ...(results || []).map(r => cell(fmt(r.ebitda), { align: AlignmentType.RIGHT, fill: LGRAY }))
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("Résultat Net", { bold: true }),
                                ...(results || []).map(r => cell(fmt(r.resultat_net), { align: AlignmentType.RIGHT }))
                            ]
                        }),
                        new TableRow({
                            children: [
                                cell("Trésorerie de Clôture Cumulée", { bold: true, fill: BEIGE }),
                                ...(results || []).map(r => cell(fmt(r.tresorerie_cumulee), { align: AlignmentType.RIGHT, fill: BEIGE }))
                            ]
                        })
                    ]
                }),

                space(),
                h2("4.2 Indicateurs de Performance Intrinsèques (KPIs)"),
                txt(`• Taux de Rentabilité Interne (TRI) : ${hypo?.tri ? `${(hypo.tri * 100).toFixed(2)}%` : 'Non calculé'}`),
                txt(`• Valeur Actuelle Nette (VAN) : ${hypo?.van ? `${fmt(hypo.van)} FCFA` : 'Non calculée'}`),
                txt(`• Délai de Récupération du Capital (Payback Period) : ${hypo?.delai_recup ? `${hypo.delai_recup} ans` : 'Non défini'}`),

                // ════════════════════════════════════════════════
                // SECTION 5 : ALLIANCES & ÉCOSYSTÈME PARTENAIRES
                // ════════════════════════════════════════════════
                h1("5. Écosystème de Partenariats Stratégiques"),
                
                h2("5.1 Alliances Techniques & Industrielles"),
                ...(partTech && partTech.length > 0 ? partTech.map(pt => txt(`• [${pt.nom}] - Rôle : ${pt.role || 'Aucun rôle explicité'} : ${pt.description || ''}`)) : [txt("Aucun partenaire technique configuré pour le moment. L'exécution repose sur l'infrastructure interne de l'entreprise.")]),

                h2("5.2 Partenariats et Financements Institutionnels"),
                ...(partFin && partFin.length > 0 ? partFin.map(pf => txt(`• [${pf.nom}] - Apport : ${fmt(pf.montant)} FCFA (Type : ${pf.type_apport || 'Non défini'})`)) : [txt("Aucune source de financement externe ou partenaire financier tiers répertorié.")]),

                // ════════════════════════════════════════════════
                // SECTION 6 : GESTION DES RISQUES & IMPACTS (ODD)
                // ════════════════════════════════════════════════
                h1("6. Analyse de Risques & Alignement ODD"),
                
                h2("6.1 Matrice d'Atténuation des Risques Critiques"),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 12, color: "991B1B" }, bottom: { style: BorderStyle.SINGLE, size: 12, color: "991B1B" } },
                    rows: [
                        new TableRow({
                            children: [
                                cell("Facteur de Risque", { fill: "991B1B", color: WHITE, bold: true }),
                                cell("Gravité / Impact", { fill: "991B1B", color: WHITE, bold: true, align: AlignmentType.CENTER }),
                                cell("Plan de Contingence / Atténuation", { fill: "991B1B", color: WHITE, bold: true })
                            ]
                        }),
                        ...(risques && risques.length > 0 ? risques.slice(0, 5).map(r => new TableRow({
                            children: [
                                cell(r.description),
                                cell(r.impact.toUpperCase(), { align: AlignmentType.CENTER, bold: true }),
                                cell(r.mesure_attenuation || "Mise en place de protocoles de suivi réguliers.")
                            ]
                        })) : [new TableRow({ children: [cell("Aucun risque modélisé.", { colspan: 3 })] })])
                    ]
                }),

                h2("6.2 Impacts RSE & Objectifs de Développement Durable (ODD)"),
                txt("Le projet intègre nativement des critères d'évaluation alignés sur les grands objectifs de développement durable des Nations Unies, notamment sur le plan technologique et écologique."),
                space(),

                ...(impacts && impacts.length > 0 ? [
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" } },
                        rows: [
                            new TableRow({
                                children: [
                                    cell("ODD Ciblé", { fill: TEAL, color: WHITE, bold: true, width: 3000 }),
                                    cell("Indicateurs d'Impact Métiers", { fill: TEAL, color: WHITE, bold: true })
                                ]
                            }),
                            ...impacts.map(i => new TableRow({
                                children: [
                                    cell(`ODD Numéro ${i.odd_numero}`, { bold: true, fill: LGRAY }),
                                    cell(i.description_impact || "Impact positif mesurable.")
                                ]
                            }))
                        ]
                    })
                ] : [
                    txt("L'analyse fine des indicateurs ODD est actuellement en cours de consolidation réglementaire.")
                ]),

                space(),

                // ════════════════════════════════════════════════
                // CONCLUSION / FIN DE RAPPORT
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
            'Content-Disposition': `attachment; filename="PlanAffaires_${nom}_${date}.docx"`
        }
    })
}