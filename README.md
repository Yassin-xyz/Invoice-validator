# Facture Schematron Validator — UBL / CII / Factur-X

Extension VS Code de validation Schematron des factures électroniques, pensée
pour la **réforme française de la facturation électronique**. Architecture
inspirée de [xslt-transformer-vscode](https://github.com/vasilcinandrei/xslt-transformer-vscode)
(détection de document → Saxon-HE → Schematron compilé en XSLT → rapport SVRL
→ diagnostics VS Code), étendue aux trois formats du socle :

| Format | Détection | Règles embarquées |
|---|---|---|
| **UBL 2.1** (Invoice, CreditNote…) | namespace OASIS | EN 16931 profil réforme FR, **BR-FR-CTC** (fr-ctc), EXTENDED-CTC-FR, Peppol BIS 3.0 |
| **CII** (CrossIndustryInvoice) | namespace UN/CEFACT | EN 16931 profil réforme FR, **BR-FR-CTC** (fr-ctc), EXTENDED-CTC-FR, profil Factur-X |
| **Factur-X / ZUGFeRD** (PDF hybride) | `%PDF` → extraction du XML embarqué via `pdf-lib`, puis validation comme du CII | idem CII |

**Règles françaises officielles embarquées** : Schematron FNFE-MPE **v1.4.0 du 30/06/2026**
(dépôt [fnfempe/France_RFE](https://github.com/fnfempe/France_RFE), tag `FNFE_RFE_INVOICE_1.4.0`),
en application de la norme AFNOR **XP Z12-012**. Jeux activés par défaut : `en16931` + `fr-ctc`
(erreurs et avertissements BR-FR). Le profil `extended-ctc-fr` s'utilise **à la place** de `en16931`.
Ces normes évoluent (publications trimestrielles) : relancez `scripts/download-artifacts.sh` ou
récupérez la nouvelle release FNFE pour rester à jour. La conformité ici ne vaut pas certification :
la validation opposable reste celle de votre Plateforme Agréée.

Les **règles françaises** (spécifications externes AIFE/DGFiP, profils
Factur-X du FNFE-MPE…) s'ajoutent via `factureValidator.customSchematronXslt` —
voir `validation-artifacts/schematron/fr/README.md`.

**Messages en français** : les ~1560 règles EN 16931 et syntaxiques sont traduites en français
(catalogue `validation-artifacts/i18n/fr.json`, 92 % de couverture dont 100 % des règles métier BR-*).
Les règles BR-FR du FNFE sont nativement en français. Paramètre `factureValidator.messageLanguage`
(`fr` par défaut, `original` pour revenir à l'anglais). Traduction non officielle : en cas de doute,
consultez le texte d'origine de la norme.

**Pointage précis des anomalies** : les diagnostics se placent sur la balise exacte désignée par
le XPath du rapport SVRL (index positionnel du XML, résolution avec repli sur le parent). Quand
l'élément est absent, le message indique la balise attendue grâce à la carte BT → balise
(`validation-artifacts/i18n/bt-map.json`, 92 termes métier, libellés FR + balises UBL et CII).
Pour les Factur-X, le XML extrait du PDF s'ouvre dans l'éditeur et reçoit les diagnostics.

**Validation en couches** : depuis la v0.5.0, chaque validation exécute d'abord la **couche
structurelle XSD** (UBL 2.1 officiel OASIS ; CII D16B officiel UN/CEFACT, via une classe Java
précompilée, messages traduits et lignes exactes), puis la **couche sémantique Schematron**
(EN 16931 + règles françaises). Désactivable via `factureValidator.xsdValidation`. Restent hors
périmètre : la conformité PDF/A-3 du conteneur Factur-X (utiliser veraPDF), et les contrôles de
plateforme (existence du SIREN à l'annuaire, doublons, cycle de vie) qui nécessitent le PPF/PA.

**Annotation BT pour consultants** : la commande *Facture: Annoter les balises en BT* insère devant
chaque balise reconnue un commentaire `<!--@BT BT-x : libellé-->` (483 entrées cartographiées (termes BT, groupes BG et 211 termes étendus EXT-FR issus du dictionnaire officiel des spécifications externes Flux 1&2, avec rattachement BG), UBL et CII). La commande *Supprimer les annotations BT* retire uniquement ces marqueurs `@BT` — les
commentaires d'origine du document sont préservés — et restitue le fichier à l'identique.
L'opération est idempotente et annulable (Ctrl+Z), et une facture annotée reste valide XSD/Schematron.

**Contrôles complémentaires (jeu `controles-plus`, activé par défaut)** : cohérences arithmétiques
et techniques bi-syntaxe absentes des jeux standard — TECH-01 (valeurs « null »/vides dans les montants,
exécuté en premier pour éviter un rapport vide en cas de plantage moteur, avec reprise sur erreur par jeu),
PRIX-01/02/03/04 (prix net = brut − rabais, rabais ≥ 0, quantité de base > 0, prix brut redondant),
MONTANT-01 (montant HT de ligne recalculé), UNITE-01 (BT-130 vs BT-150), ID-01 (clé de Luhn SIREN/SIRET).
Tolérance d'arrondi configurable (`arithmeticTolerance`, défaut 0.0001). Suppression automatique en
présence des équivalents Peppol (R046, R121). Source : `schematron/custom-src/controles-plus.sch`,
cas de test dans `examples/tests-controles-plus/`.

## Prérequis

- **Java 11+** dans le PATH (ou configuré via `factureValidator.javaPath`) —
  requis par Saxon-HE, qui exécute les Schematron compilés (XSLT 2.0).
- Node.js 18+ pour compiler l'extension.

## Démarrage

```bash
npm install
npm run compile
# F5 dans VS Code pour lancer l'Extension Development Host
```

Puis, sur un fichier `.xml` ou `.pdf` : clic droit → **Facture: Valider
(détection auto UBL / CII / Factur-X)**, ou via la palette de commandes.
Les erreurs apparaissent dans l'onglet **Problèmes**, avec l'identifiant de
règle (ex. `BR-CO-17`, `BR-S-08`) et le jeu de règles source.

## Structure

```
src/
  extension.ts                  Point d'entrée, commandes, validate-on-save
  commands/validateCommand.ts   Orchestration d'une validation
  detection/formatDetector.ts   UBL / CII / PDF Factur-X
  facturx/extractFacturX.ts     Extraction du XML embarqué (pdf-lib, arbre EmbeddedFiles + /AF)
  validation/
    schematronValidator.ts      Résolution des jeux de règles + exécution Saxon
    svrlParser.ts               Parsing du rapport SVRL (failed-assert / successful-report)
    diagnostics.ts              SVRL → diagnostics VS Code (localisation heuristique par XPath)
  utils/javaRunner.ts           Lancement de Saxon-HE
scripts/
  compile-schematron.sh         Compile un .sch en .xslt (squelette ISO embarqué) — pour les règles FR
  download-artifacts.sh         Met à jour Saxon + Schematron EN16931/Peppol officiels
tools/iso-schematron/           Squelette ISO Schematron (pipeline .sch → XSLT 2.0)
validation-artifacts/schematron/
  en16931-ubl/  en16931-cii/  peppol-ubl/   XSLT prêts à l'emploi
  fr/                                        Vos règles françaises
lib/saxon-he-10.9.jar           Moteur XSLT 2.0
```

## Limites connues / pistes

- La localisation des erreurs dans l'éditeur est **heuristique** (le SVRL donne
  un XPath, pas une ligne) ; pour une localisation exacte, brancher un parseur
  XML avec suivi de position (ex. `sax` avec `position tracking`).
- Pas encore de validation **XSD** (structurelle) : reprendre `XsdValidator.java`
  du dépôt d'origine si besoin.
- La conformité aux règles nationales ne vaut pas certification : la validation
  finale reste celle de votre PDP.

## Licences des artefacts

- Schematron EN 16931 : ConnectingEurope/eInvoicing-EN16931 (EUPL/Apache selon composants).
- Règles Peppol : OpenPeppol.
- Squelette ISO Schematron : licence permissive (voir en-têtes des fichiers).
- Saxon-HE : Mozilla Public License 2.0.
