/**
 * MOTEUR DE CALCUL FINANCIER — v2
 * Fichier : src/lib/moteur_financier.ts
 * ─────────────────────────────────────────────────────────────
 * Règles :
 *  1. Tous les % stockés en DÉCIMAL en DB (0.27 = 27%)
 *  2. Arrondis UNIQUEMENT à la présentation, jamais en calcul
 *  3. Année 0 = investissement CAPEX / Année 1+ = exploitation
 *  4. Flux trésorerie : dépenses = négatif, recettes = positif
 */

// ─── TYPES PUBLICS ────────────────────────────────────────────

export interface ProjetInput {
    annee_demarrage: number
    duree_projet: number
    prorata_annee1: number  // 1.0 = démarrage jan, 0.5 = mi-année
}

export interface HypotheseInput {
    cle: string
    valeur: number  // décimal pour les %
}

export interface CapexInput {
    id: string
    libelle: string
    montant: number
    methode_amort?: 'lineaire' | 'degressif' | 'non_amorti'
    taux_amortissement: number
    duree_amortissement?: number
    annee_acquisition?: number  // null = avant démarrage (année 0)
    valeur_residuelle?: number
    categorie?: string
}

export interface OpexInput {
    id: string
    libelle: string
    categorie?: string
    type_calcul: 'fixe' | 'pct_ca' | 'pct_capex' | 'par_unite' | 'manuel'
    valeur: number
    taux_croissance_annuel?: number
    annee_debut?: number
    annee_fin?: number
    produit_id?: string
}

export interface OpexAnnuelInput {
    opex_id: string
    annee: number
    valeur: number
}

export interface ProduitInput {
    id: string
    marge_securite: number
}

export interface ComposantInput {
    produit_id: string
    quantite: number
    prix_unitaire: number
    taux_croissance_prix?: number
}

export interface RevenuInput {
    produit_id: string
    annee: number
    volume: number
    prix_unitaire_ht: number
}

export interface PartenaireFinancierInput {
    id: string
    type_financement: string
    montant: number
    taux_interet: number
    duree_annees: number
    methode_remb?: 'capital_constant' | 'annuite_constante' | 'in_fine'
    differe_annees?: number
}

// ─── RÉSULTAT ANNUEL (structure complète) ────────────────────

export interface ResultatAnnee {
    annee: number
    // Revenus
    ca_total: number
    // Coûts de production
    cout_revient: number
    marge_brute: number
    marge_brute_pct: number
    // OPEX ventilé
    charges_personnel: number
    charges_marketing: number
    charges_rd: number
    charges_coord: number
    autres_charges: number
    total_opex: number
    // Résultats intermédiaires
    ebitda: number
    ebitda_pct: number
    dotation_amort: number
    ebit: number
    frais_financiers: number
    ebt: number
    // Fiscalité
    is_normal: number
    is_minimum: number
    impots: number
    // Net
    resultat_net: number
    marge_nette_pct: number
    caf: number  // Capacité d'Autofinancement = RN + Amort
    // Trésorerie
    remboursement_capital: number
    flux_net_exploitation: number
    flux_net_investissement: number
    flux_net_financement: number
    flux_tresorerie_annuel: number
    tresorerie_cumulee: number
    // Bilan
    valeur_nette_comptable: number
    capitaux_propres: number
    dettes_financieres: number
}

export interface KPIs {
    van: number
    tri: number          // décimal ex: 0.415 = 41.5%
    payback_annees: number
    marge_brute_moy: number
    marge_nette_moy: number
    marge_ebitda_moy: number
    total_capex: number
    seuil_rentabilite_ca: number
}

export interface ResultatCalcul {
    resultats: ResultatAnnee[]
    kpis: KPIs
    fluxNets: number[]  // pour VAN/TRI, exposé pour debug
}

// ─── HELPERS INTERNES ─────────────────────────────────────────

function hyp(hypotheses: HypotheseInput[], cle: string, defaut = 0): number {
    return hypotheses.find(h => h.cle === cle)?.valeur ?? defaut
}

/**
 * Amortissement linéaire pour un poste CAPEX, pour une année donnée.
 * Gère le prorata la première année si l'acquisition est avant le démarrage.
 */
function amortissementAnnuel(
    c: CapexInput,
    annee: number,
    anneeDebut: number,
    prorata: number
): number {
    const methode = c.methode_amort ?? 'lineaire'
    if (methode === 'non_amorti') return 0

    const duree = c.duree_amortissement
        ?? (c.taux_amortissement > 0 ? Math.round(1 / c.taux_amortissement) : 0)
    if (duree <= 0) return 0

    const acqAnnee = c.annee_acquisition ?? anneeDebut - 1
    const anneeFinAmort = acqAnnee + duree

    if (annee <= acqAnnee || annee > anneeFinAmort) return 0

    const amortBrut = c.montant / duree

    // Prorata la 1ère année d'exploitation si acquisition avant démarrage
    if (annee === anneeDebut && acqAnnee < anneeDebut) {
        return amortBrut * prorata
    }

    return amortBrut
}

/** VNC = Montant - cumul des amortissements jusqu'à l'année */
function vncFinAnnee(
    c: CapexInput,
    annee: number,
    anneeDebut: number,
    prorata: number
): number {
    let cumul = 0
    for (let a = anneeDebut; a <= annee; a++) {
        cumul += amortissementAnnuel(c, a, anneeDebut, prorata)
    }
    return Math.max(0, c.montant - cumul - (c.valeur_residuelle ?? 0))
}

/**
 * Calcul de remboursement d'emprunt — méthode capital constant.
 * C'est la méthode de l'Excel partenaire ("amortissement à capital constant").
 */
function calcRemboursement(
    montant: number,
    taux: number,
    duree: number,
    differe: number,
    anneeProjet: number,  // 1-based depuis début projet
    methode: 'capital_constant' | 'annuite_constante' | 'in_fine'
): { interets: number; capital: number } {
    if (montant <= 0 || taux < 0 || duree <= 0) return { interets: 0, capital: 0 }

    if (anneeProjet <= differe) {
        return { interets: montant * taux, capital: 0 }
    }

    const anneeRemb = anneeProjet - differe
    if (anneeRemb > duree) return { interets: 0, capital: 0 }

    if (methode === 'capital_constant') {
        const crd = montant * (1 - (anneeRemb - 1) / duree)
        return { interets: crd * taux, capital: montant / duree }
    }

    if (methode === 'annuite_constante') {
        const annuite = taux > 0
            ? (montant * taux) / (1 - Math.pow(1 + taux, -duree))
            : montant / duree
        let crd = montant
        for (let i = 1; i < anneeRemb; i++) {
            crd -= annuite - crd * taux
        }
        const interets = crd * taux
        return { interets, capital: annuite - interets }
    }

    if (methode === 'in_fine') {
        return {
            interets: montant * taux,
            capital: anneeRemb === duree ? montant : 0,
        }
    }

    return { interets: 0, capital: 0 }
}

/** Valeur d'un poste OPEX pour une année donnée */
function calcOpexAnnee(
    o: OpexInput,
    annee: number,
    anneeDebut: number,
    caAnnee: number,
    totalCapex: number,
    volumesParProduit: Map<string, number>,
    opexManuels: OpexAnnuelInput[]
): number {
    if (o.annee_debut && annee < o.annee_debut) return 0
    if (o.annee_fin   && annee > o.annee_fin)   return 0

    const n = annee - anneeDebut  // 0-based
    const g = o.taux_croissance_annuel ?? 0

    switch (o.type_calcul) {
        case 'fixe':
            return o.valeur * Math.pow(1 + g, n)

        case 'pct_ca':
            return caAnnee * o.valeur

        case 'pct_capex':
            return totalCapex * o.valeur

        case 'par_unite': {
            if (!o.produit_id) return 0
            const vol = volumesParProduit.get(o.produit_id) ?? 0
            return vol * o.valeur * Math.pow(1 + g, n)
        }

        case 'manuel': {
            const m = opexManuels.find(m => m.opex_id === o.id && m.annee === annee)
            return m?.valeur ?? 0
        }

        default: return 0
    }
}

// ─── MOTEUR PRINCIPAL ─────────────────────────────────────────

export function calculerPrevisions(params: {
    projet: ProjetInput
    hypotheses: HypotheseInput[]
    capexItems: CapexInput[]
    opexItems: OpexInput[]
    opexManuels: OpexAnnuelInput[]
    produits: ProduitInput[]
    composants: ComposantInput[]
    revenus: RevenuInput[]
    partenaires: PartenaireFinancierInput[]
}): ResultatCalcul {
    const { projet, hypotheses, capexItems, opexItems, opexManuels,
        produits, composants, revenus, partenaires } = params

    // ── Hypothèses (toutes en décimal) ──────────────────────────
    const tauxIS       = hyp(hypotheses, 'taux_is', 0.27)
    const tauxISMin    = hyp(hypotheses, 'taux_is_min', 0.01)
    const tauxEnc      = hyp(hypotheses, 'taux_encaissement', 1.0)
    const wacc         = hyp(hypotheses, 'wacc', 0.10)
    const pctMarketing = hyp(hypotheses, 'frais_marketing', 0.02)
    const pctCoord     = hyp(hypotheses, 'frais_coordination', 0.01)
    const pctRD        = hyp(hypotheses, 'frais_rd', 0.01)

    const { annee_demarrage, duree_projet, prorata_annee1 } = projet

    // ── Timeline ────────────────────────────────────────────────
    const annees = Array.from({ length: duree_projet }, (_, i) => annee_demarrage + i)

    // ── CAPEX total ─────────────────────────────────────────────
    const totalCapex = capexItems.reduce((s, c) => s + c.montant, 0)

    // ── Coût de revient unitaire par produit ────────────────────
    // CORRECTION : calculé depuis les composants (pas déduit du CA)
    const coutUnitParProduit = new Map<string, number>()
    for (const p of produits) {
        const comps = composants.filter(c => c.produit_id === p.id)
        const coutBase = comps.reduce((s, c) => s + c.quantite * c.prix_unitaire, 0)
        coutUnitParProduit.set(p.id, coutBase * (1 + p.marge_securite))
    }

    // ── Détection des catégories d'OPEX présentes en DB ─────────
    // (pour éviter le double-comptage avec les hypothèses de % du CA)
    const hasOpexMarketing = opexItems.some(o =>
        ['marketing', 'communication'].some(k => o.categorie?.toLowerCase().includes(k))
    )
    const hasOpexRD    = opexItems.some(o => o.categorie?.toLowerCase().includes('r&d')
        || o.categorie?.toLowerCase().includes('recherche'))
    const hasOpexCoord = opexItems.some(o =>
        ['coordination', 'admin'].some(k => o.categorie?.toLowerCase().includes(k))
    )

    // ── Emprunts ─────────────────────────────────────────────────
    const emprunts = partenaires.filter(p => p.type_financement === 'emprunt')

    // ── État courant ─────────────────────────────────────────────
    let tresorerieCumulee = 0
    let dettesRestantes = emprunts.reduce((s, e) => s + e.montant, 0)
    let capitauxPropres = partenaires
        .filter(p => p.type_financement === 'fonds_propres')
        .reduce((s, p) => s + p.montant, 0)

    const resultats: ResultatAnnee[] = []

    for (const annee of annees) {
        const anneeIdx = annee - annee_demarrage  // 0-based
        const prorata  = anneeIdx === 0 ? prorata_annee1 : 1.0

        // ── CA et Coût de revient ──────────────────────────────────
        let caTotal = 0
        let coutRevientTotal = 0
        const volumesParProduit = new Map<string, number>()

        for (const p of produits) {
            const rev = revenus.find(r => r.produit_id === p.id && r.annee === annee)
            if (!rev) continue
            volumesParProduit.set(p.id, rev.volume)
            caTotal += rev.volume * rev.prix_unitaire_ht
            coutRevientTotal += rev.volume * (coutUnitParProduit.get(p.id) ?? 0)
        }
        caTotal          *= prorata
        coutRevientTotal *= prorata

        const margeBrute    = caTotal - coutRevientTotal
        const margeBrutePct = caTotal > 0 ? margeBrute / caTotal : 0

        // ── OPEX ventilé ───────────────────────────────────────────
        let chargesPersonnel = 0
        let chargesMarketing = 0
        let chargesRD        = 0
        let chargesCoord     = 0
        let autresCharges    = 0

        for (const o of opexItems) {
            const v = calcOpexAnnee(
                o, annee, annee_demarrage, caTotal,
                totalCapex, volumesParProduit, opexManuels
            ) * prorata

            const cat = o.categorie?.toLowerCase() ?? ''
            if (['personnel', 'rh', 'salaire', 'main d\'oeuvre'].some(k => cat.includes(k))) {
                chargesPersonnel += v
            } else if (['marketing', 'communication', 'com'].some(k => cat.includes(k))) {
                chargesMarketing += v
            } else if (['r&d', 'recherche', 'innovation'].some(k => cat.includes(k))) {
                chargesRD += v
            } else if (['coordination', 'admin', 'gestion'].some(k => cat.includes(k))) {
                chargesCoord += v
            } else {
                autresCharges += v
            }
        }

        // Fallback hypothèses % CA si pas de ligne OPEX pour la catégorie
        if (!hasOpexMarketing) chargesMarketing = caTotal * pctMarketing
        if (!hasOpexRD)        chargesRD        = caTotal * pctRD
        if (!hasOpexCoord)     chargesCoord     = caTotal * pctCoord

        const totalOpex = chargesPersonnel + chargesMarketing + chargesRD
            + chargesCoord + autresCharges

        // ── Intermédiaires ─────────────────────────────────────────
        const ebitda    = margeBrute - totalOpex
        const ebitdaPct = caTotal > 0 ? ebitda / caTotal : 0

        const dotationAmort = capexItems.reduce(
            (s, c) => s + amortissementAnnuel(c, annee, annee_demarrage, prorata_annee1), 0
        )

        const ebit = ebitda - dotationAmort

        // ── Frais financiers (dégressifs, toujours) ────────────────
        let fraisFinanciers    = 0
        let remboursementCap   = 0

        for (const e of emprunts) {
            const { interets, capital } = calcRemboursement(
                e.montant, e.taux_interet, e.duree_annees,
                e.differe_annees ?? 0,
                anneeIdx + 1,  // 1-based
                e.methode_remb ?? 'capital_constant'
            )
            fraisFinanciers  += interets
            remboursementCap += capital
        }

        const ebt = ebit - fraisFinanciers

        // ── Fiscalité ──────────────────────────────────────────────
        // max(IS_normal, IS_minimum) — règle Togo/Afrique de l'Ouest
        const isNormal  = ebt > 0 ? ebt * tauxIS : 0
        const isMinimum = caTotal * tauxISMin
        const impots    = Math.max(isNormal, isMinimum)

        // ── Résultat net ───────────────────────────────────────────
        const resultatNet  = ebt - impots
        const margeNettePct = caTotal > 0 ? resultatNet / caTotal : 0
        const caf          = resultatNet + dotationAmort

        // ── Flux de trésorerie ─────────────────────────────────────
        const fluxNetExploitation    = caf
        const fluxNetInvestissement  = 0  // CAPEX en année 0 hors timeline
        const fluxNetFinancement     = -remboursementCap
        const fluxAnnuel = fluxNetExploitation + fluxNetInvestissement + fluxNetFinancement
        tresorerieCumulee += fluxAnnuel

        // ── Bilan ──────────────────────────────────────────────────
        const vcnFin = capexItems.reduce(
            (s, c) => s + vncFinAnnee(c, annee, annee_demarrage, prorata_annee1), 0
        )
        dettesRestantes = Math.max(0, dettesRestantes - remboursementCap)
        capitauxPropres += resultatNet

        resultats.push({
            annee,
            ca_total: caTotal,
            cout_revient: coutRevientTotal,
            marge_brute: margeBrute,
            marge_brute_pct: margeBrutePct,
            charges_personnel: chargesPersonnel,
            charges_marketing: chargesMarketing,
            charges_rd: chargesRD,
            charges_coord: chargesCoord,
            autres_charges: autresCharges,
            total_opex: totalOpex,
            ebitda,
            ebitda_pct: ebitdaPct,
            dotation_amort: dotationAmort,
            ebit,
            frais_financiers: fraisFinanciers,
            ebt,
            is_normal: isNormal,
            is_minimum: isMinimum,
            impots,
            resultat_net: resultatNet,
            marge_nette_pct: margeNettePct,
            caf,
            remboursement_capital: remboursementCap,
            flux_net_exploitation: fluxNetExploitation,
            flux_net_investissement: fluxNetInvestissement,
            flux_net_financement: fluxNetFinancement,
            flux_tresorerie_annuel: fluxAnnuel,
            tresorerie_cumulee: tresorerieCumulee,
            valeur_nette_comptable: vcnFin,
            capitaux_propres: capitauxPropres,
            dettes_financieres: dettesRestantes,
        })
    }

    // ── KPIs ──────────────────────────────────────────────────────
    // CORRECTION CRITIQUE : CAPEX en année 0 (index 0, avant exploitation)
    const fluxNets = [
        -Math.abs(totalCapex),          // Année 0 = investissement
        ...resultats.map(r => r.caf),   // Années 1..N = CAF
    ]

    const kpis = calculerKPIs(resultats, fluxNets, wacc)

    return { resultats, kpis, fluxNets }
}

// ─── KPIs ────────────────────────────────────────────────────

export function calculerKPIs(
    resultats: ResultatAnnee[],
    fluxNets: number[],
    wacc: number
): KPIs {
    const van  = calculerVAN(fluxNets, wacc)
    const tri  = calculerTRI(fluxNets)
    const totalCapex = Math.abs(fluxNets[0])
    const payback = calculerPayback(totalCapex, fluxNets.slice(1))

    const n = resultats.length || 1
    const marge_brute_moy  = resultats.reduce((s, r) => s + r.marge_brute_pct, 0) / n
    const marge_nette_moy  = resultats.reduce((s, r) => s + r.marge_nette_pct, 0) / n
    const marge_ebitda_moy = resultats.reduce((s, r) => s + r.ebitda_pct, 0) / n

    // Seuil de rentabilité (année 1)
    const r1 = resultats[0]
    const seuil_rentabilite_ca = r1 && r1.marge_brute_pct > 0
        ? (r1.total_opex + r1.dotation_amort + r1.frais_financiers) / r1.marge_brute_pct
        : 0

    return {
        van, tri, payback_annees: payback,
        marge_brute_moy, marge_nette_moy, marge_ebitda_moy,
        total_capex: totalCapex,
        seuil_rentabilite_ca,
    }
}

// ─── ALGORITHMES ─────────────────────────────────────────────

export function calculerVAN(fluxNets: number[], taux: number): number {
    return fluxNets.reduce((van, f, t) => van + f / Math.pow(1 + taux, t), 0)
}

export function calculerTRI(fluxNets: number[]): number {
    const van = (r: number) => fluxNets.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0)
    let lo = -0.99, hi = 10.0
    if (van(lo) * van(hi) > 0) return 0
    for (let i = 0; i < 300; i++) {
        const mid = (lo + hi) / 2
        if (Math.abs(hi - lo) < 1e-8) return mid
        van(mid) * van(lo) < 0 ? (hi = mid) : (lo = mid)
    }
    return (lo + hi) / 2
}

export function calculerPayback(investissement: number, fluxAnnuels: number[]): number {
    let cumul = 0
    for (let i = 0; i < fluxAnnuels.length; i++) {
        const prev = cumul
        cumul += fluxAnnuels[i]
        if (cumul >= investissement) {
            const frac = fluxAnnuels[i] > 0 ? (investissement - prev) / fluxAnnuels[i] : 1
            return i + frac
        }
    }
    return Infinity
}

// ─── FORMATAGE (helpers UI) ──────────────────────────────────

export const fmt = (n: number): string =>
    new Intl.NumberFormat('fr-FR').format(Math.round(n))

export const fmtM = (n: number): string =>
    `${(n / 1_000_000).toFixed(2)} M`

export const fmtPct = (n: number, decimals = 1): string =>
    `${(n * 100).toFixed(decimals)}%`