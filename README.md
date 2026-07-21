<div align="center">

# 🧾 Facture Schematron Validator

**Validez vos factures électroniques UBL, CII et Factur-X directement dans VS Code —
conformité EN 16931, Peppol et règles françaises de la réforme, avec des messages
d'erreur en français.**

[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85-007ACC.svg?logo=visualstudiocode)](https://code.visualstudio.com/)
[![Version](https://img.shields.io/badge/version-0.16.0-informational.svg)](CHANGELOG.md)
[![Règles FR](https://img.shields.io/badge/FNFE--MPE-v1.4.0-success.svg)](https://github.com/fnfempe/France_RFE)
[![PRs bienvenues](https://img.shields.io/badge/PRs-bienvenues-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## 📖 Sommaire

- [À quoi ça sert ?](#-à-quoi-ça-sert-)
- [Fonctionnalités](#-fonctionnalités)
- [Formats et règles pris en charge](#-formats-et-règles-pris-en-charge)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Démarrage rapide](#-démarrage-rapide)
- [Les commandes](#-les-commandes)
- [Configuration](#-configuration)
- [Comment ça marche](#-comment-ça-marche)
- [Structure du projet](#-structure-du-projet)
- [Mise à jour des règles officielles](#-mise-à-jour-des-règles-officielles)
- [FAQ](#-faq)
- [Limites et périmètre](#-limites-et-périmètre)
- [Contribuer](#-contribuer)
- [Licence et composants tiers](#-licence-et-composants-tiers)
- [Avertissement](#-avertissement)

---

## 🎯 À quoi ça sert ?

La **réforme française de la facturation électronique** impose des factures
structurées conformes à la norme européenne **EN 16931** et à des règles
nationales spécifiques. Avant d'envoyer une facture à une Plateforme Agréée (PA)
ou au Portail Public de Facturation, encore faut-il qu'elle soit **valide**.

**Facture Schematron Validator** est une extension VS Code qui vérifie vos
factures **localement, sans rien envoyer sur Internet**, et vous pointe
précisément chaque anomalie — avec des messages **en français** et l'identifiant
de la règle violée (ex. `BR-CO-17`, `BR-FR-08`).

Elle s'adresse aux **éditeurs de logiciels, intégrateurs, comptables, DSI et
équipes conformité** qui préparent ou déboguent des flux de factures
électroniques.

> Architecture inspirée de
> [xslt-transformer-vscode](https://github.com/vasilcinandrei/xslt-transformer-vscode)
> (détection du document → Saxon-HE → Schematron compilé en XSLT → rapport SVRL →
> diagnostics VS Code), étendue aux trois formats du socle de la réforme.

---

## ✨ Fonctionnalités

- ✅ **Validation en 1 clic** de fichiers `.xml` (UBL / CII) et `.pdf` (Factur-X),
  avec **détection automatique** du format.
- 🇫🇷 **Messages en français** : ~1560 règles EN 16931 traduites (92 % de
  couverture, dont **100 % des règles métier BR-\***). Commutable en anglais.
- 🏛️ **Règles françaises officielles embarquées** : Schematron FNFE-MPE
  **v1.4.0 du 30/06/2026** (BR-FR-CTC, profil étendu), en application de la norme
  AFNOR **XP Z12-012**.
- 🧱 **Validation en deux couches** : structure **XSD** (UBL 2.1 / CII D16B) puis
  sémantique **Schematron** (EN 16931 + règles FR).
- 📍 **Pointage précis** : chaque erreur se place sur la **balise exacte** désignée
  par le XPath du rapport SVRL ; si la balise est absente, le message indique la
  balise attendue.
- 🧮 **Contrôles complémentaires** bi-syntaxe (cohérences arithmétiques, clé de
  Luhn SIREN/SIRET…) absents des jeux standard.
- 🏷️ **Annotation BT/BG/EXT** : commente chaque balise avec son terme métier
  (483 entrées), pour lire une facture sans connaître la norme par cœur.
- 📋 **Inventaire des termes** présents dans un document.
- 🔒 **100 % local** : aucune donnée de facture n'est transmise sur le réseau.

---

## 📄 Formats et règles pris en charge

| Format | Détection | Jeux de règles embarqués |
|---|---|---|
| **UBL 2.1** (Invoice, CreditNote…) | namespace OASIS | EN 16931 (profil réforme FR), **BR-FR-CTC**, EXTENDED-CTC-FR, Peppol BIS 3.0 |
| **CII** (CrossIndustryInvoice) | namespace UN/CEFACT | EN 16931 (profil réforme FR), **BR-FR-CTC**, EXTENDED-CTC-FR, profil Factur-X |
| **Factur-X / ZUGFeRD** (PDF hybride) | `%PDF` → extraction du XML embarqué (`pdf-lib`) puis validation comme du CII | idem CII |

Jeux activés par défaut : `controles-plus` + `en16931` + `fr-ctc`. Le profil
`extended-ctc-fr` s'utilise **à la place** de `en16931`.

---

## 🔧 Prérequis

| Outil | Version | Rôle |
|---|---|---|
| **Java** | 11 ou supérieur, dans le `PATH` | Exécution de Saxon-HE (moteur XSLT 2.0) |
| **VS Code** | 1.85 ou supérieur | Environnement hôte |
| **Node.js** | 18 ou supérieur | Uniquement pour compiler depuis les sources |

Vérifiez Java avec `java -version`. Si Java n'est pas dans le `PATH`, indiquez son
chemin via le paramètre `factureValidator.javaPath`.

---

## 📦 Installation

### Option A — Depuis les sources (recommandé aujourd'hui)

```bash
git clone https://github.com/Yassin-xyz/Invoice-validator.git
cd invoice-validator
npm install
npm run compile
```

Ouvrez le dossier dans VS Code et appuyez sur **F5** pour lancer un
*Extension Development Host* avec l'extension chargée.

### Option B — Générer un paquet `.vsix` installable

```bash
npm install
npx @vscode/vsce package
code --install-extension invoice-validator-0.16.0.vsix
```

### Option C — Marketplace VS Code

> ℹ️ La publication sur le Marketplace est prévue. Une fois disponible, l'extension
> s'installera directement depuis l'onglet Extensions de VS Code.

---

## 🚀 Démarrage rapide

1. Ouvrez une facture `.xml` (UBL ou CII) ou un `.pdf` Factur-X.
2. **Clic droit → « Facture: Valider (détection auto UBL / CII / Factur-X) »**
   (ou via la palette de commandes, `Ctrl+Shift+P`).
3. Les anomalies apparaissent dans l'onglet **Problèmes**, positionnées sur la
   balise concernée, avec l'**identifiant de règle** (ex. `BR-CO-17`) et le **jeu
   de règles source**.

Essayez avec les fichiers fournis dans [`examples/`](examples/) :
`exemple-ubl.xml`, `exemple-cii.xml`, `exemple-facturx.pdf`, et les cas
conformes/non conformes de `examples/tests-controles-plus/`.

---

## ⌨️ Les commandes

Accessibles via la palette (`Ctrl+Shift+P`), le menu contextuel ou la barre de
titre de l'éditeur :

| Commande | Effet |
|---|---|
| **Facture: Valider** | Détecte le format et valide (XSD + Schematron). |
| **Facture: Effacer les diagnostics** | Retire les anomalies affichées. |
| **Facture: Annoter les balises en BT** | Insère `<!--@BT BT-x : libellé-->` devant chaque balise reconnue. Idempotent, annulable (`Ctrl+Z`). |
| **Facture: Supprimer les annotations BT** | Retire uniquement les marqueurs `@BT`, préserve les commentaires d'origine. |
| **Facture: Inventaire des termes (BT/BG/EXT)** | Liste les termes métier présents dans le document. |

---

## ⚙️ Configuration

Réglages disponibles dans les paramètres VS Code (préfixe `factureValidator.`) :

| Paramètre | Défaut | Description |
|---|---|---|
| `javaPath` | `java` | Chemin de l'exécutable Java (11+). |
| `rulesets.ubl` | `["controles-plus","en16931","fr-ctc"]` | Jeux de règles pour l'UBL. |
| `rulesets.cii` | `["controles-plus","en16931","fr-ctc"]` | Jeux de règles pour le CII / Factur-X. |
| `customSchematronXslt` | `[]` | Chemins absolus vers des Schematron compilés en XSLT (règles maison). |
| `validateOnSave` | `false` | Valider automatiquement à l'enregistrement. |
| `messageLanguage` | `fr` | `fr` (traduit) ou `original` (anglais EN 16931/Peppol). |
| `xsdValidation` | `true` | Valider la structure XSD avant le Schematron. |
| `frSeverityProfile` | `strict` | `strict` (violations FR en erreurs) ou `tolerant` (en avertissements). |
| `arithmeticTolerance` | `0.0001` | Tolérance d'arrondi des contrôles arithmétiques. |

**Jeux de règles disponibles** : `controles-plus`, `en16931`, `peppol` (UBL),
`fr-ctc`, `extended-ctc-fr` (remplace `en16931`), `facturx-en16931` (CII),
`en16931-cef`.

**Ajouter vos propres règles françaises** (spécifications externes AIFE/DGFiP,
profils Factur-X…) : compilez un `.sch` avec `scripts/compile-schematron.sh`, puis
référencez le XSLT généré dans `customSchematronXslt`. Voir
`validation-artifacts/schematron/fr/README.md`.

---

## 🔬 Comment ça marche

```
 Fichier (.xml / .pdf)
        │
        ▼
 ┌──────────────┐   PDF ?   ┌──────────────────────┐
 │  Détection   ├──────────►│ Extraction XML (pdf-lib) │
 │  du format   │           └──────────┬───────────┘
 └──────┬───────┘                      │
        │ UBL / CII                    │ CII
        ▼                              ▼
 ┌─────────────────────────────────────────────┐
 │  Couche 1 — XSD (structure)                  │  UBL 2.1 OASIS / CII D16B
 └───────────────────┬─────────────────────────┘
                     ▼
 ┌─────────────────────────────────────────────┐
 │  Couche 2 — Schematron (sémantique)          │  Saxon-HE exécute les XSLT
 │  EN 16931 + BR-FR-CTC + controles-plus       │  compilés → rapport SVRL
 └───────────────────┬─────────────────────────┘
                     ▼
 ┌─────────────────────────────────────────────┐
 │  SVRL → diagnostics VS Code                  │  localisation par XPath,
 │  (traduction FR, identifiant de règle)       │  message FR, onglet Problèmes
 └─────────────────────────────────────────────┘
```

La couche XSD s'appuie sur une classe Java précompilée (messages traduits, lignes
exactes). La couche Schematron utilise **Saxon-HE** pour exécuter les Schematron
compilés en **XSLT 2.0**, qui produisent un rapport **SVRL** (Schematron
Validation Report Language) transformé en diagnostics VS Code.

---

## 🗂️ Structure du projet

```
src/
  extension.ts                  Point d'entrée, commandes, validate-on-save
  commands/                     Orchestration des commandes (valider, annoter, inventaire)
  detection/formatDetector.ts   UBL / CII / PDF Factur-X
  facturx/extractFacturX.ts     Extraction du XML embarqué dans le PDF
  validation/
    schematronValidator.ts      Résolution des jeux de règles + exécution Saxon
    svrlParser.ts               Parsing du rapport SVRL
    diagnostics.ts              SVRL → diagnostics VS Code
    xsdValidator.ts             Couche structurelle XSD
    xmlLocator.ts               Localisation d'une balise par XPath
  annotation/btAnnotator.ts     Annotation des balises BT/BG/EXT
  i18n/translator.ts            Traduction FR des messages
  ui/panelView.ts               Panneau latéral « Facture électronique »
scripts/
  compile-schematron.sh         Compile un .sch en .xslt (règles FR)
  download-artifacts.sh         Met à jour Saxon + Schematron officiels
tools/iso-schematron/           Squelette ISO Schematron (.sch → XSLT 2.0)
validation-artifacts/
  schematron/                   XSLT prêts à l'emploi (en16931, peppol, fr, controles-plus)
  xsd/                          Schémas structurels UBL 2.1 / CII D16B
  i18n/                         Traductions FR, carte BT → balise
lib/saxon-he-10.9.jar           Moteur XSLT 2.0
examples/                       Factures d'exemple (UBL, CII, Factur-X) + cas de test
```

---

## 🔄 Mise à jour des règles officielles

Les normes EN 16931 et Peppol évoluent **trimestriellement**, et les règles
françaises FNFE-MPE au fil des publications. Pour rester à jour :

```bash
scripts/download-artifacts.sh   # Saxon + Schematron EN 16931 / Peppol officiels
```

Pour les règles françaises, récupérez la nouvelle release du FNFE-MPE
([fnfempe/France_RFE](https://github.com/fnfempe/France_RFE)) et recompilez.

---

## ❓ FAQ

**Mes factures sont-elles envoyées quelque part ?**
Non. Toute la validation est **locale** ; aucune donnée n'est transmise sur le
réseau.

**Une facture « valide » ici est-elle certifiée conforme ?**
Non. La validation opposable reste celle de votre **Plateforme Agréée**. Cet outil
vous aide à détecter les anomalies en amont, il ne remplace pas la PA.

**Pourquoi Java est-il requis ?**
Le moteur **Saxon-HE** (XSLT 2.0) qui exécute les Schematron est écrit en Java.
C'est le seul prérequis externe.

**Puis-je ajouter mes propres règles ?**
Oui, via `factureValidator.customSchematronXslt` (voir
[Configuration](#-configuration)).

**La traduction française est-elle officielle ?**
Non, c'est une traduction de courtoisie (couverture 92 %). En cas de doute,
basculez sur `messageLanguage: original` et consultez le texte de la norme.

**L'extension gère-t-elle la conformité PDF/A-3 du Factur-X ?**
Non, c'est hors périmètre — utilisez [veraPDF](https://verapdf.org/) pour cela.

---

## 🚧 Limites et périmètre

- La conformité aux règles nationales **ne vaut pas certification** : la validation
  finale reste celle de votre Plateforme Agréée / PPF.
- **Hors périmètre** : la conformité **PDF/A-3** du conteneur Factur-X (voir
  veraPDF) et les **contrôles de plateforme** (existence du SIREN à l'annuaire,
  doublons, cycle de vie) qui nécessitent le PPF/PA.
- La traduction FR couvre 92 % des règles (100 % des règles métier BR-*) ; le
  reste s'affiche en anglais.

---

## 🤝 Contribuer

Les contributions sont les bienvenues — corrections de traduction, nouvelles
règles, documentation, tests. Lisez d'abord le
[guide de contribution](CONTRIBUTING.md) et le
[code de conduite](CODE_OF_CONDUCT.md).

⚠️ **Ne partagez jamais de facture réelle** contenant des données personnelles ou
commerciales dans une issue ou une PR : anonymisez, ou repartez des exemples de
`examples/`.

Pour signaler une faille de sécurité, suivez la [politique de sécurité](SECURITY.md).

---

## 📜 Licence et composants tiers

Le **code** de l'extension est distribué sous licence **[MIT](LICENSE)**.

Les **artefacts de validation tiers** embarqués (Saxon-HE, Schematron EN 16931,
règles Peppol, règles FNFE-MPE, schémas XSD OASIS/UN-CEFACT…) restent régis par
leurs licences respectives — voir **[NOTICE.md](NOTICE.md)** pour le détail.

---

## ⚠️ Avertissement

Ce logiciel est fourni « en l'état », sans garantie. Il constitue une **aide au
contrôle**, pas un outil de certification. La conformité réglementaire de vos
factures relève de votre responsabilité et de la validation par votre Plateforme
Agréée. Les textes normatifs (EN 16931, XP Z12-012, spécifications AIFE/DGFiP)
évoluent : vérifiez toujours la version en vigueur.
