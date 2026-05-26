// src/lib/superbase/types.ts — v2
// Synchronisé avec le schéma DB v2 + moteur_financier.ts

// ─── ÉNUMÉRATIONS ────────────────────────────────────────────
export type Statut          = 'draft' | 'en_cours' | 'finalise' | 'archive'
export type TypeCalculOpex  = 'fixe' | 'pct_ca' | 'pct_capex' | 'par_unite' | 'manuel'
export type MethodeAmort    = 'lineaire' | 'degressif' | 'non_amorti'
export type MethodeRemb     = 'capital_constant' | 'annuite_constante' | 'in_fine'
export type TypeFinancement = 'emprunt' | 'fonds_propres' | 'subvention' | 'autre'
export type TypeConcurrent  = 'direct' | 'indirect' | 'substitut'
export type Probabilite     = 'faible' | 'moyenne' | 'elevee'
export type NiveauRisque    = 'faible' | 'modere' | 'eleve' | 'critique'
export type CategorieSegment = 'institution_publique' | 'institution_privee' | 'menage' | 'autre'
export type CategorieCanal  = 'reseaux_sociaux' | 'autre'

// ─── PROJET ──────────────────────────────────────────────────
export interface Projet {
    id: string
    nom: string
    numero_projet?: string
    description?: string
    secteur?: string
    produit_principal?: string
    annee_demarrage: number
    duree_projet: number
    devise: string
    statut: Statut
    modele?: string
    promoteur?: string
    cout_total?: number
    pays_execution?: string
    /** Fraction de la 1ère année exploitée (1.0 = jan, 0.5 = juillet) */
    prorata_annee1: number
    created_at: string
    updated_at: string
}

// ─── PROFILS ENTREPRISE ───────────────────────────────────────
export interface ProfilEntrepriseGlobal {
    id: string
    nom_entreprise?: string
    slogan?: string
    mission?: string
    vision?: string
    valeurs?: string
    notre_societe?: string
    notre_histoire?: string
    certifications?: string
    annee_creation?: number
    localisation?: string
    effectif?: string
    expertise_cle?: string
    created_at: string
    updated_at: string
}

export interface EntrepriseProfil {
    id: string
    projet_id: string
    nom_entreprise?: string
    slogan?: string
    mission?: string
    vision?: string
    valeurs?: string
    notre_societe?: string
    notre_histoire?: string
    certifications?: string
    annee_creation?: number
    localisation?: string
    effectif?: string
    expertise_cle?: string
}

// ─── PRODUITS & COMPOSANTS ───────────────────────────────────
export interface Produit {
    id: string
    projet_id: string
    nom: string
    description?: string
    proposition_valeur?: string
    unite_vente?: string
    marge_securite: number
}

export interface Composant {
    id: string
    produit_id: string
    libelle: string
    quantite: number
    prix_unitaire: number
    categorie?: string
    /** Taux de croissance annuel du prix du composant (ex: 0.03 = +3%/an) */
    taux_croissance_prix: number
}

// ─── HYPOTHÈSES ──────────────────────────────────────────────
export interface Hypothese {
    id: string
    projet_id: string
    cle: string
    /** TOUJOURS en décimal pour les % : 0.27 = 27% */
    valeur: number
    unite?: string
    section?: string
    description?: string
}

// ─── CAPEX ───────────────────────────────────────────────────
export interface Capex {
    id: string
    projet_id: string
    libelle: string
    montant: number
    categorie?: string
    /** Méthode d'amortissement */
    methode_amort: MethodeAmort
    /** Taux annuel : 0.20 = 20%/an. Prioritaire sur duree_amortissement */
    taux_amortissement: number
    /** Durée explicite en années (alternative au taux) */
    duree_amortissement?: number
    /** Année d'acquisition. null = avant démarrage du projet (année 0) */
    annee_acquisition?: number
    /** Valeur résiduelle en fin de projet */
    valeur_residuelle: number
    created_at: string
}

// ─── OPEX ────────────────────────────────────────────────────
export interface Opex {
    id: string
    projet_id: string
    libelle: string
    categorie?: string
    /** Logique de calcul :
     *  - fixe       : montant fixe/an (avec taux_croissance_annuel optionnel)
     *  - pct_ca     : % du CA de l'année (valeur = 0.02 pour 2%)
     *  - pct_capex  : % du CAPEX total (maintenance)
     *  - par_unite  : valeur × volume vendu du produit lié
     *  - manuel     : saisie dans la table opex_annuel
     */
    type_calcul: TypeCalculOpex
    /** Interprété selon type_calcul (montant, taux décimal, coût/unité) */
    valeur: number
    /** Taux de croissance annuel propre au poste (ex: 0.03 = +3%/an) */
    taux_croissance_annuel: number
    /** Année de début d'activation (null = dès le début du projet) */
    annee_debut?: number
    /** Année de fin (null = jusqu'à la fin du projet) */
    annee_fin?: number
    /** Produit lié pour type_calcul = 'par_unite' */
    produit_id?: string
    created_at: string
}

/** Saisie manuelle pour type_calcul = 'manuel' */
export interface OpexAnnuel {
    id: string
    opex_id: string
    projet_id: string
    annee: number
    valeur: number
    created_at: string
}

// ─── REVENUS ─────────────────────────────────────────────────
export interface Revenu {
    id: string
    projet_id: string
    produit_id: string
    annee: number
    volume: number
    prix_unitaire_ht: number
}

// ─── PARTENAIRES FINANCIERS ──────────────────────────────────
export interface PartenaireFinancier {
    id: string
    projet_id: string
    nom: string
    type_financement?: TypeFinancement
    type_financement_libre?: string
    role_projet?: string
    montant: number
    taux_interet: number
    duree_annees: number
    /** Méthode de remboursement du prêt */
    methode_remb: MethodeRemb
    /** Années de différé avant remboursement du capital */
    differe_annees: number
    conditions?: string
}

// ─── PARTENAIRES TECHNIQUES ──────────────────────────────────
export interface PartenaireTechnique {
    id: string
    projet_id: string
    nom: string
    type?: string
    role?: string
    apport?: string
    contact?: string
    domaine?: string
}

export interface TypeOngletPartenaire {
    id: string
    projet_id: string
    label: string
    ordre: number
    created_at: string
}

export interface PartenaireCustom {
    id: string
    projet_id: string
    onglet_id: string
    nom: string
    role?: string
    apport?: string
    contact?: string
    created_at: string
}

// ─── RÉSULTATS FINANCIERS (cache complet) ────────────────────
export interface ResultatFinancier {
    id: string
    projet_id: string
    annee: number
    // Revenus
    ca_total: number
    taux_encaissement: number
    // Coûts
    cout_revient: number
    marge_brute: number
    // OPEX ventilé
    charges_personnel: number
    charges_marketing: number
    charges_rd: number
    charges_coord: number
    autres_charges: number
    total_opex: number
    // Intermédiaires
    ebitda: number
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
    caf: number
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
    created_at: string
}

// ─── KPIs AGRÉGÉS ────────────────────────────────────────────
export interface KpisProjet {
    id: string
    projet_id: string
    van: number
    tri: number
    payback_annees: number
    marge_brute_moy: number
    marge_nette_moy: number
    marge_ebitda_moy: number
    total_capex: number
    total_financement: number
    seuil_rentabilite_ca: number
    calcule_le: string
}

// ─── AUTRES ENTITÉS (inchangées) ─────────────────────────────
export interface Concurrent {
    id: string
    projet_id: string
    nom: string
    type?: TypeConcurrent
    produit_solution?: string
    forces?: string
    faiblesses?: string
    notre_differenciation?: string
    avantage_concurrentiel?: string
}

export interface RisqueProjet {
    id: string
    projet_id: string
    categorie?: string
    categorie_libre?: string
    description: string
    probabilite?: Probabilite
    impact?: string
    niveau_risque?: NiveauRisque
    mesure_mitigation?: string
    responsable?: string
}

export interface SegmentClientele {
    id: string
    projet_id: string
    libelle: string
    categorie?: CategorieSegment
    categorie_libre?: string
    created_at: string
}

export interface RelationClientele {
    id: string
    projet_id: string
    libelle: string
    created_at: string
}

export interface CanalDistribution {
    id: string
    projet_id: string
    libelle: string
    categorie?: CategorieCanal
    categorie_libre?: string
    created_at: string
}

export interface ImpactProjet {
    id: string
    projet_id: string
    categorie?: string
    indicateur: string
    valeur?: string
    unite?: string
    description?: string
    odd?: string
}